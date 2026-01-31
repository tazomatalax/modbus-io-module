# Vibration Analysis Implementation Plan

## Overview

This document outlines the complete implementation plan for adding high-frequency vibration analysis capability to the Modbus IO Module firmware. The goal is to enable predictive maintenance monitoring for motors and pumps using the existing LIS3DH accelerometers.

**Date Created:** February 1, 2026  
**Target Branch:** pico1-cold-buffer-pump (and other pico branches as needed)  
**Hardware:** RP2040 (Raspberry Pi Pico) + LIS3DH accelerometer

---

## Problem Statement

### Current Limitations
- LIS3DH sensors are polled at **1 Hz** (1000ms update interval)
- Only instantaneous X, Y, Z acceleration values are captured
- Modbus TCP polling cannot stream high-frequency data efficiently
- Current data shows motor on/off but **no vibration patterns or frequency content**

### Vibration Analysis Requirements
| Defect Type | Typical Frequency | Required Sample Rate (Nyquist) |
|-------------|-------------------|-------------------------------|
| Motor imbalance | 1× RPM (e.g., 50Hz @ 3000RPM) | 100-200 Hz min |
| Bearing defects | 3-10× RPM | 500-1000 Hz |
| Gear mesh | 10-100× RPM | 2000-5000 Hz |
| Rolling element damage | 100-500 Hz typical | 1000-2000 Hz |

---

## Solution Architecture

### Strategy: On-Device Statistics Calculation

Instead of streaming raw high-frequency samples (impractical over Modbus), compute **vibration statistics on the RP2040** and transmit summary values:

```
[LIS3DH] ---(500-1000 Hz)---> [RP2040 Core 1] ---(statistics)---> [Modbus/REST]
                                    |
                                    v
                            [RMS, Peak, Crest Factor]
                                    |
                                    v
                            [Sent at 1-2 Hz via existing registers]
```

### Key Metrics to Calculate

| Metric | Formula | Purpose |
|--------|---------|---------|
| **RMS** | √(Σx²/n) | Overall vibration energy |
| **Peak** | max(\|x\|) | Maximum amplitude in window |
| **Crest Factor** | Peak / RMS | Impulsive vs smooth vibration (bearing damage indicator) |
| **Velocity RMS** | Integrate acceleration | Industry standard for machine condition |

---

## RP2040 Resource Analysis

### Hardware Capabilities
| Spec | Value | Status |
|------|-------|--------|
| CPU | Dual-core ARM Cortex-M0+ @ 133 MHz | Core 1 unused ✅ |
| RAM | 264 KB SRAM | ~150 KB free ✅ |
| I2C Speed | 400 kHz (Fast Mode) | Supports 5000 reads/sec ✅ |

### Timing Budget (500 Hz Sampling)
| Task | Duration | Budget |
|------|----------|--------|
| Available per sample | 2000 µs | 100% |
| I2C read (6 bytes) | ~200 µs | 10% |
| Statistics calculation | ~10 µs | 0.5% |
| **Headroom remaining** | ~1790 µs | **89.5%** |

### RAM Requirements
| Data Structure | Size |
|----------------|------|
| Sample buffer (512 samples × 3 axes × int16) | 3,072 bytes |
| Running statistics accumulators | 64 bytes |
| FFT working arrays (optional, 512-point) | 4,096 bytes |
| **Total** | **~7-8 KB** |

---

## Implementation Phases

### Phase 1: High-Frequency Sampling on Core 1

**Objective:** Sample LIS3DH at 500 Hz on dedicated core without affecting HTTP/Modbus

#### Step 1.1: Add Vibration Data Structures

Add to `include/sys_init.h`:

```cpp
// Vibration analysis configuration
#define VIBRATION_SAMPLE_RATE_HZ 500
#define VIBRATION_WINDOW_SAMPLES 512  // ~1 second window at 500 Hz
#define VIBRATION_UPDATE_INTERVAL_MS 1000  // Report statistics every 1 second

// Vibration statistics structure (per sensor)
struct VibrationStats {
    // RMS values (mg)
    float rmsX;
    float rmsY;
    float rmsZ;
    float rmsMagnitude;  // √(X² + Y² + Z²)
    
    // Peak values (mg)
    float peakX;
    float peakY;
    float peakZ;
    float peakMagnitude;
    
    // Crest factor (Peak / RMS) - indicates impulsive vibration
    float crestFactorX;
    float crestFactorY;
    float crestFactorZ;
    
    // Velocity RMS (mm/s) - integrated from acceleration
    float velocityRmsX;
    float velocityRmsY;
    float velocityRmsZ;
    
    // Metadata
    uint32_t sampleCount;
    uint32_t lastUpdateTime;
    bool valid;
};

// Per-sensor vibration state
struct VibrationSensorState {
    uint8_t i2cAddress;
    uint8_t sdaPin;
    uint8_t sclPin;
    bool enabled;
    
    // Circular buffer for samples
    int16_t samplesX[VIBRATION_WINDOW_SAMPLES];
    int16_t samplesY[VIBRATION_WINDOW_SAMPLES];
    int16_t samplesZ[VIBRATION_WINDOW_SAMPLES];
    uint16_t sampleIndex;
    uint16_t sampleCount;
    
    // Running accumulators for efficient RMS calculation
    int64_t sumSquaresX;
    int64_t sumSquaresY;
    int64_t sumSquaresZ;
    int16_t maxX, maxY, maxZ;
    int16_t minX, minY, minZ;
    
    // Output statistics
    VibrationStats stats;
};

// Global vibration state (max 2 LIS3DH per device)
extern VibrationSensorState vibrationSensors[2];
extern int numVibrationSensors;
extern volatile bool vibrationDataReady;
```

#### Step 1.2: Create Vibration Processing Module

Create new file `src/vibration.cpp`:

```cpp
#include "sys_init.h"
#include <Wire.h>
#include <math.h>

// Vibration sensor state
VibrationSensorState vibrationSensors[2];
int numVibrationSensors = 0;
volatile bool vibrationDataReady = false;

// Core 1 timing
static uint32_t lastSampleMicros = 0;
static const uint32_t sampleIntervalMicros = 1000000 / VIBRATION_SAMPLE_RATE_HZ;  // 2000 µs for 500 Hz

// LIS3DH register addresses
#define LIS3DH_REG_CTRL1 0x20
#define LIS3DH_REG_CTRL4 0x23
#define LIS3DH_REG_OUT_X_L 0x28

// Scale factor for ±2g range, 10-bit mode: 3.906 mg/LSB
#define LIS3DH_SCALE_MG 3.906f

// Forward declarations
void initVibrationSensor(VibrationSensorState& sensor);
bool readVibrationSample(VibrationSensorState& sensor);
void computeVibrationStats(VibrationSensorState& sensor);
void resetVibrationAccumulators(VibrationSensorState& sensor);

// ============================================================================
// CORE 1 SETUP - Called once when Core 1 starts
// ============================================================================
void setup1() {
    // Wait for Core 0 to complete main setup
    delay(2000);
    
    // Discover LIS3DH sensors from main sensor config
    numVibrationSensors = 0;
    
    for (int i = 0; i < numConfiguredSensors && numVibrationSensors < 2; i++) {
        if (configuredSensors[i].enabled && 
            strcmp(configuredSensors[i].type, "LIS3DH") == 0) {
            
            vibrationSensors[numVibrationSensors].i2cAddress = configuredSensors[i].i2cAddress;
            vibrationSensors[numVibrationSensors].sdaPin = configuredSensors[i].sdaPin;
            vibrationSensors[numVibrationSensors].sclPin = configuredSensors[i].sclPin;
            vibrationSensors[numVibrationSensors].enabled = true;
            
            initVibrationSensor(vibrationSensors[numVibrationSensors]);
            numVibrationSensors++;
            
            Serial.printf("[Vibration Core1] Registered LIS3DH at 0x%02X\n", 
                         configuredSensors[i].i2cAddress);
        }
    }
    
    if (numVibrationSensors == 0) {
        Serial.println("[Vibration Core1] No LIS3DH sensors found, Core 1 idle");
    } else {
        Serial.printf("[Vibration Core1] Initialized %d sensors at %d Hz\n", 
                     numVibrationSensors, VIBRATION_SAMPLE_RATE_HZ);
    }
    
    lastSampleMicros = micros();
}

// ============================================================================
// CORE 1 MAIN LOOP - Runs continuously on Core 1
// ============================================================================
void loop1() {
    if (numVibrationSensors == 0) {
        delay(100);  // No sensors, idle
        return;
    }
    
    uint32_t now = micros();
    
    // Check if it's time for next sample
    if (now - lastSampleMicros >= sampleIntervalMicros) {
        lastSampleMicros = now;
        
        // Sample all vibration sensors
        for (int i = 0; i < numVibrationSensors; i++) {
            if (vibrationSensors[i].enabled) {
                readVibrationSample(vibrationSensors[i]);
            }
        }
    }
    
    // Check if window is complete (time to compute statistics)
    static uint32_t lastStatsTime = 0;
    if (millis() - lastStatsTime >= VIBRATION_UPDATE_INTERVAL_MS) {
        lastStatsTime = millis();
        
        for (int i = 0; i < numVibrationSensors; i++) {
            if (vibrationSensors[i].enabled && vibrationSensors[i].sampleCount > 0) {
                computeVibrationStats(vibrationSensors[i]);
                resetVibrationAccumulators(vibrationSensors[i]);
            }
        }
        
        vibrationDataReady = true;
    }
}

// ============================================================================
// SENSOR INITIALIZATION
// ============================================================================
void initVibrationSensor(VibrationSensorState& sensor) {
    // Configure I2C for this sensor's pins
    // Note: Core 1 needs its own Wire instance or mutex protection
    // For simplicity, assume same I2C bus as Core 0 (requires mutex in production)
    
    Wire.beginTransmission(sensor.i2cAddress);
    
    // CTRL_REG1: 1344 Hz ODR, normal mode, all axes enabled
    Wire.write(LIS3DH_REG_CTRL1);
    Wire.write(0x97);  // ODR=1344Hz, normal mode, XYZ enabled
    Wire.endTransmission();
    
    Wire.beginTransmission(sensor.i2cAddress);
    // CTRL_REG4: ±2g range, high resolution, block data update
    Wire.write(LIS3DH_REG_CTRL4);
    Wire.write(0x88);  // BDU=1, HR=1, FS=±2g
    Wire.endTransmission();
    
    // Initialize state
    sensor.sampleIndex = 0;
    sensor.sampleCount = 0;
    resetVibrationAccumulators(sensor);
    sensor.stats.valid = false;
}

// ============================================================================
// READ SINGLE SAMPLE (called at 500 Hz)
// ============================================================================
bool readVibrationSample(VibrationSensorState& sensor) {
    // Set register pointer to OUT_X_L with auto-increment
    Wire.beginTransmission(sensor.i2cAddress);
    Wire.write(LIS3DH_REG_OUT_X_L | 0x80);  // 0x80 = auto-increment
    if (Wire.endTransmission(false) != 0) {
        return false;
    }
    
    // Read 6 bytes: X_L, X_H, Y_L, Y_H, Z_L, Z_H
    if (Wire.requestFrom((int)sensor.i2cAddress, 6) != 6) {
        return false;
    }
    
    uint8_t data[6];
    for (int i = 0; i < 6; i++) {
        data[i] = Wire.read();
    }
    
    // Parse 16-bit signed values (little-endian)
    int16_t rawX = (int16_t)((data[1] << 8) | data[0]) >> 6;  // 10-bit mode
    int16_t rawY = (int16_t)((data[3] << 8) | data[2]) >> 6;
    int16_t rawZ = (int16_t)((data[5] << 8) | data[4]) >> 6;
    
    // Store in circular buffer
    uint16_t idx = sensor.sampleIndex;
    sensor.samplesX[idx] = rawX;
    sensor.samplesY[idx] = rawY;
    sensor.samplesZ[idx] = rawZ;
    
    // Update running accumulators for efficient RMS
    sensor.sumSquaresX += (int64_t)rawX * rawX;
    sensor.sumSquaresY += (int64_t)rawY * rawY;
    sensor.sumSquaresZ += (int64_t)rawZ * rawZ;
    
    // Track min/max for peak calculation
    if (rawX > sensor.maxX) sensor.maxX = rawX;
    if (rawX < sensor.minX) sensor.minX = rawX;
    if (rawY > sensor.maxY) sensor.maxY = rawY;
    if (rawY < sensor.minY) sensor.minY = rawY;
    if (rawZ > sensor.maxZ) sensor.maxZ = rawZ;
    if (rawZ < sensor.minZ) sensor.minZ = rawZ;
    
    // Advance circular buffer
    sensor.sampleIndex = (idx + 1) % VIBRATION_WINDOW_SAMPLES;
    if (sensor.sampleCount < VIBRATION_WINDOW_SAMPLES) {
        sensor.sampleCount++;
    }
    
    return true;
}

// ============================================================================
// COMPUTE STATISTICS (called every 1 second)
// ============================================================================
void computeVibrationStats(VibrationSensorState& sensor) {
    if (sensor.sampleCount == 0) return;
    
    float n = (float)sensor.sampleCount;
    
    // RMS calculation: sqrt(sum_of_squares / n) * scale
    float rmsRawX = sqrtf((float)sensor.sumSquaresX / n);
    float rmsRawY = sqrtf((float)sensor.sumSquaresY / n);
    float rmsRawZ = sqrtf((float)sensor.sumSquaresZ / n);
    
    sensor.stats.rmsX = rmsRawX * LIS3DH_SCALE_MG;
    sensor.stats.rmsY = rmsRawY * LIS3DH_SCALE_MG;
    sensor.stats.rmsZ = rmsRawZ * LIS3DH_SCALE_MG;
    sensor.stats.rmsMagnitude = sqrtf(
        sensor.stats.rmsX * sensor.stats.rmsX +
        sensor.stats.rmsY * sensor.stats.rmsY +
        sensor.stats.rmsZ * sensor.stats.rmsZ
    );
    
    // Peak calculation (max absolute value)
    sensor.stats.peakX = fmaxf(fabsf(sensor.maxX), fabsf(sensor.minX)) * LIS3DH_SCALE_MG;
    sensor.stats.peakY = fmaxf(fabsf(sensor.maxY), fabsf(sensor.minY)) * LIS3DH_SCALE_MG;
    sensor.stats.peakZ = fmaxf(fabsf(sensor.maxZ), fabsf(sensor.minZ)) * LIS3DH_SCALE_MG;
    sensor.stats.peakMagnitude = sqrtf(
        sensor.stats.peakX * sensor.stats.peakX +
        sensor.stats.peakY * sensor.stats.peakY +
        sensor.stats.peakZ * sensor.stats.peakZ
    );
    
    // Crest factor: Peak / RMS (indicates impulsive vibration)
    sensor.stats.crestFactorX = (sensor.stats.rmsX > 0.1f) ? 
        sensor.stats.peakX / sensor.stats.rmsX : 0.0f;
    sensor.stats.crestFactorY = (sensor.stats.rmsY > 0.1f) ? 
        sensor.stats.peakY / sensor.stats.rmsY : 0.0f;
    sensor.stats.crestFactorZ = (sensor.stats.rmsZ > 0.1f) ? 
        sensor.stats.peakZ / sensor.stats.rmsZ : 0.0f;
    
    // Velocity RMS (simplified integration: v = a * dt, RMS velocity)
    // For proper velocity, would need high-pass filter + integration
    // This is a simplified approximation: velocity_rms ≈ accel_rms / (2 * pi * f)
    // where f is the dominant frequency. Using ~50 Hz as typical motor frequency.
    float integrationFactor = 1.0f / (2.0f * 3.14159f * 50.0f);  // ~3.18 ms
    sensor.stats.velocityRmsX = sensor.stats.rmsX * integrationFactor * 9.81f;  // Convert to mm/s
    sensor.stats.velocityRmsY = sensor.stats.rmsY * integrationFactor * 9.81f;
    sensor.stats.velocityRmsZ = sensor.stats.rmsZ * integrationFactor * 9.81f;
    
    // Update metadata
    sensor.stats.sampleCount = sensor.sampleCount;
    sensor.stats.lastUpdateTime = millis();
    sensor.stats.valid = true;
}

// ============================================================================
// RESET ACCUMULATORS FOR NEXT WINDOW
// ============================================================================
void resetVibrationAccumulators(VibrationSensorState& sensor) {
    sensor.sumSquaresX = 0;
    sensor.sumSquaresY = 0;
    sensor.sumSquaresZ = 0;
    sensor.maxX = INT16_MIN;
    sensor.maxY = INT16_MIN;
    sensor.maxZ = INT16_MIN;
    sensor.minX = INT16_MAX;
    sensor.minY = INT16_MAX;
    sensor.minZ = INT16_MAX;
    sensor.sampleCount = 0;
}

// ============================================================================
// HELPER: Get vibration stats for a sensor by I2C address
// ============================================================================
VibrationStats* getVibrationStats(uint8_t i2cAddress) {
    for (int i = 0; i < numVibrationSensors; i++) {
        if (vibrationSensors[i].i2cAddress == i2cAddress) {
            return &vibrationSensors[i].stats;
        }
    }
    return nullptr;
}
```

#### Step 1.3: Add I2C Mutex for Core Safety

Since both cores may access I2C, add a mutex. In `include/sys_init.h`:

```cpp
#include <pico/mutex.h>

extern mutex_t i2cMutex;
```

In `src/main.cpp` setup():

```cpp
mutex_init(&i2cMutex);
```

Wrap I2C operations on Core 0:

```cpp
mutex_enter_blocking(&i2cMutex);
// I2C operation
mutex_exit(&i2cMutex);
```

And similarly in `vibration.cpp` for Core 1 reads.

---

### Phase 2: Expose Vibration Data via Modbus

#### Step 2.1: Add Modbus Registers

Update `updateIOForClient()` in `main.cpp` to include vibration statistics:

**Proposed Modbus Register Map (Input Registers FC4):**

| Register | Field | Description | Scale |
|----------|-------|-------------|-------|
| 20 | rms_x | X-axis RMS acceleration | ×100 (mg) |
| 21 | rms_y | Y-axis RMS acceleration | ×100 (mg) |
| 22 | rms_z | Z-axis RMS acceleration | ×100 (mg) |
| 23 | rms_magnitude | Combined RMS | ×100 (mg) |
| 24 | peak_x | X-axis peak | ×100 (mg) |
| 25 | peak_y | Y-axis peak | ×100 (mg) |
| 26 | peak_z | Z-axis peak | ×100 (mg) |
| 27 | peak_magnitude | Combined peak | ×100 (mg) |
| 28 | crest_factor_x | X crest factor | ×100 |
| 29 | crest_factor_y | Y crest factor | ×100 |
| 30 | crest_factor_z | Z crest factor | ×100 |
| 31 | velocity_rms_x | X velocity RMS | ×100 (mm/s) |
| 32 | velocity_rms_y | Y velocity RMS | ×100 (mm/s) |
| 33 | velocity_rms_z | Z velocity RMS | ×100 (mm/s) |

For second LIS3DH sensor, use registers 40-53.

#### Step 2.2: Update Modbus Register Writing

Add to `updateIOForClient()`:

```cpp
// Vibration statistics registers
if (numVibrationSensors > 0 && vibrationSensors[0].stats.valid) {
    VibrationStats& vs = vibrationSensors[0].stats;
    modbusClients[clientIndex].server.inputRegisterWrite(20, (int16_t)(vs.rmsX * 100));
    modbusClients[clientIndex].server.inputRegisterWrite(21, (int16_t)(vs.rmsY * 100));
    modbusClients[clientIndex].server.inputRegisterWrite(22, (int16_t)(vs.rmsZ * 100));
    modbusClients[clientIndex].server.inputRegisterWrite(23, (int16_t)(vs.rmsMagnitude * 100));
    modbusClients[clientIndex].server.inputRegisterWrite(24, (int16_t)(vs.peakX * 100));
    modbusClients[clientIndex].server.inputRegisterWrite(25, (int16_t)(vs.peakY * 100));
    modbusClients[clientIndex].server.inputRegisterWrite(26, (int16_t)(vs.peakZ * 100));
    modbusClients[clientIndex].server.inputRegisterWrite(27, (int16_t)(vs.peakMagnitude * 100));
    modbusClients[clientIndex].server.inputRegisterWrite(28, (int16_t)(vs.crestFactorX * 100));
    modbusClients[clientIndex].server.inputRegisterWrite(29, (int16_t)(vs.crestFactorY * 100));
    modbusClients[clientIndex].server.inputRegisterWrite(30, (int16_t)(vs.crestFactorZ * 100));
    modbusClients[clientIndex].server.inputRegisterWrite(31, (int16_t)(vs.velocityRmsX * 100));
    modbusClients[clientIndex].server.inputRegisterWrite(32, (int16_t)(vs.velocityRmsY * 100));
    modbusClients[clientIndex].server.inputRegisterWrite(33, (int16_t)(vs.velocityRmsZ * 100));
}
```

---

### Phase 3: Expose via REST API

#### Step 3.1: Add Vibration Endpoint

Add to REST routing in `routeRequest()`:

```cpp
else if (method == "GET" && path == "/vibration") {
    sendJSONVibration(client);
}
```

#### Step 3.2: Implement JSON Response

```cpp
void sendJSONVibration(WiFiClient& client) {
    StaticJsonDocument<1024> doc;
    
    doc["sample_rate_hz"] = VIBRATION_SAMPLE_RATE_HZ;
    doc["window_samples"] = VIBRATION_WINDOW_SAMPLES;
    doc["sensor_count"] = numVibrationSensors;
    
    JsonArray sensors = doc.createNestedArray("sensors");
    
    for (int i = 0; i < numVibrationSensors; i++) {
        if (vibrationSensors[i].enabled && vibrationSensors[i].stats.valid) {
            JsonObject sensor = sensors.createNestedObject();
            VibrationStats& vs = vibrationSensors[i].stats;
            
            sensor["i2c_address"] = vibrationSensors[i].i2cAddress;
            sensor["sample_count"] = vs.sampleCount;
            sensor["last_update"] = vs.lastUpdateTime;
            
            JsonObject rms = sensor.createNestedObject("rms_mg");
            rms["x"] = vs.rmsX;
            rms["y"] = vs.rmsY;
            rms["z"] = vs.rmsZ;
            rms["magnitude"] = vs.rmsMagnitude;
            
            JsonObject peak = sensor.createNestedObject("peak_mg");
            peak["x"] = vs.peakX;
            peak["y"] = vs.peakY;
            peak["z"] = vs.peakZ;
            peak["magnitude"] = vs.peakMagnitude;
            
            JsonObject crest = sensor.createNestedObject("crest_factor");
            crest["x"] = vs.crestFactorX;
            crest["y"] = vs.crestFactorY;
            crest["z"] = vs.crestFactorZ;
            
            JsonObject velocity = sensor.createNestedObject("velocity_rms_mm_s");
            velocity["x"] = vs.velocityRmsX;
            velocity["y"] = vs.velocityRmsY;
            velocity["z"] = vs.velocityRmsZ;
        }
    }
    
    String json;
    serializeJson(doc, json);
    sendJSON(client, json);
}
```

---

### Phase 4: Update Telegraf Configuration

Update Telegraf Modbus input to capture vibration registers:

```toml
[[inputs.modbus]]
  name = "pico1_vibration"
  slave_id = 1
  timeout = "1s"
  controller = "tcp://192.168.100.10:502"
  
  input_registers = [
    { name = "vib_rms_x",         address = 20, type = "INT16", scale = 0.01 },
    { name = "vib_rms_y",         address = 21, type = "INT16", scale = 0.01 },
    { name = "vib_rms_z",         address = 22, type = "INT16", scale = 0.01 },
    { name = "vib_rms_magnitude", address = 23, type = "INT16", scale = 0.01 },
    { name = "vib_peak_x",        address = 24, type = "INT16", scale = 0.01 },
    { name = "vib_peak_y",        address = 25, type = "INT16", scale = 0.01 },
    { name = "vib_peak_z",        address = 26, type = "INT16", scale = 0.01 },
    { name = "vib_peak_magnitude",address = 27, type = "INT16", scale = 0.01 },
    { name = "vib_crest_x",       address = 28, type = "INT16", scale = 0.01 },
    { name = "vib_crest_y",       address = 29, type = "INT16", scale = 0.01 },
    { name = "vib_crest_z",       address = 30, type = "INT16", scale = 0.01 },
    { name = "vib_velocity_x",    address = 31, type = "INT16", scale = 0.01 },
    { name = "vib_velocity_y",    address = 32, type = "INT16", scale = 0.01 },
    { name = "vib_velocity_z",    address = 33, type = "INT16", scale = 0.01 },
  ]
  
  [inputs.modbus.tags]
    node = "pico1"
    location = "cold_buffer_pump"
    sensor_type = "vibration"
```

---

## Phase 5 (Optional): On-Device FFT

For advanced frequency analysis, add FFT capability:

### Step 5.1: Add arduinoFFT Library

Add to `platformio.ini`:

```ini
lib_deps = 
    ...
    kosme/arduinoFFT @ ^2.0
```

### Step 5.2: FFT Processing

```cpp
#include <arduinoFFT.h>

#define FFT_SAMPLES 256

double vReal[FFT_SAMPLES];
double vImag[FFT_SAMPLES];
ArduinoFFT<double> FFT = ArduinoFFT<double>(vReal, vImag, FFT_SAMPLES, VIBRATION_SAMPLE_RATE_HZ);

void computeFFT(VibrationSensorState& sensor) {
    // Copy samples to FFT buffer
    for (int i = 0; i < FFT_SAMPLES; i++) {
        vReal[i] = sensor.samplesX[i] * LIS3DH_SCALE_MG;
        vImag[i] = 0;
    }
    
    // Compute FFT
    FFT.windowing(FFT_WIN_TYP_HAMMING, FFT_FORWARD);
    FFT.compute(FFT_FORWARD);
    FFT.complexToMagnitude();
    
    // Find dominant frequency
    double peakFreq = FFT.majorPeak();
    
    // Report peak frequencies in specific bands
    // 0-25 Hz: Very low (structural)
    // 25-100 Hz: Motor 1x (imbalance)
    // 100-500 Hz: Bearing defects
    // 500+ Hz: High frequency (gear mesh, electrical)
}
```

---

## Testing Plan

### Unit Tests

1. **Sample Rate Verification**
   - Measure actual sample intervals using `micros()`
   - Confirm 500 Hz ± 2% achieved

2. **RMS Accuracy**
   - Apply known vibration (tap sensor)
   - Compare calculated RMS to expected values

3. **Core 1 Isolation**
   - Generate HTTP load on Core 0
   - Verify no sample rate degradation

### Integration Tests

1. **Modbus Register Access**
   - Poll registers 20-33 from external client
   - Verify values update every ~1 second

2. **REST API**
   - Fetch `/vibration` endpoint
   - Validate JSON structure

3. **Multi-Sensor**
   - Configure 2 LIS3DH at different addresses
   - Verify independent statistics

### Field Validation

1. **Baseline Recording**
   - Record vibration when motor is OFF
   - Establish noise floor (should be < 50 mg RMS)

2. **Motor Running**
   - Record vibration when motor is ON
   - Should see significant increase in RMS magnitude

3. **Anomaly Detection**
   - Artificially create imbalance (weight on rotating component)
   - Verify increased vibration detectable

---

## Alarm Thresholds (Reference)

ISO 10816-3 vibration severity chart for small machines:

| Condition | Velocity RMS (mm/s) | Action |
|-----------|---------------------|--------|
| Good | < 1.8 | Normal operation |
| Satisfactory | 1.8 - 4.5 | Schedule inspection |
| Unsatisfactory | 4.5 - 11.2 | Plan maintenance |
| Unacceptable | > 11.2 | Immediate action |

Typical crest factor thresholds:

| Crest Factor | Indication |
|--------------|------------|
| < 3.0 | Normal, smooth vibration |
| 3.0 - 5.0 | Early bearing wear |
| 5.0 - 7.0 | Moderate bearing damage |
| > 7.0 | Severe damage, impending failure |

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `include/sys_init.h` | Modify | Add vibration structures and externs |
| `src/vibration.cpp` | Create | Core 1 sampling and statistics |
| `src/main.cpp` | Modify | Add mutex, Modbus registers, REST endpoint |
| `platformio.ini` | Modify | Add arduinoFFT (optional) |
| `docs/agrisea-node-configuration.md` | Modify | Document new registers |

---

## Rollout Plan

1. **Week 1**: Implement Phase 1 (Core 1 sampling) on pico1-cold-buffer-pump
2. **Week 2**: Test and validate statistics accuracy
3. **Week 3**: Add Modbus registers and Telegraf config
4. **Week 4**: Deploy to remaining nodes (pico2-6)
5. **Week 5**: Establish baseline thresholds per motor
6. **Week 6**: Set up InfluxDB alerts for threshold breaches

---

## References

- [LIS3DH Datasheet](https://www.st.com/resource/en/datasheet/lis3dh.pdf)
- [ISO 10816-3 Vibration Severity](https://www.iso.org/standard/50528.html)
- [RP2040 Datasheet - Multicore](https://datasheets.raspberrypi.com/rp2040/rp2040-datasheet.pdf)
- [arduinoFFT Library](https://github.com/kosme/arduinoFFT)
- [Reliable Plant - Vibration Analysis](https://www.reliableplant.com/vibration-analysis-31569)

---

*Document Version: 1.0*  
*Created: February 1, 2026*
