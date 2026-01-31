/**
 * vibration.cpp - High-Frequency Vibration Analysis for LIS3DH Sensors
 * 
 * This module runs on Core 1 of the RP2040, sampling LIS3DH accelerometers at
 * 500 Hz and computing vibration statistics (RMS, Peak, Crest Factor, Velocity).
 * 
 * Statistics are computed every 1 second and made available to Core 0 for
 * exposure via Modbus registers and REST API.
 * 
 * Key metrics for predictive maintenance:
 * - RMS: Overall vibration energy (indicates general machine condition)
 * - Peak: Maximum amplitude (detects impacts or loose components)
 * - Crest Factor: Peak/RMS ratio (high values indicate bearing defects)
 * - Velocity RMS: Industry standard for machine condition (mm/s)
 * 
 * Reference: ISO 10816-3 vibration severity standards
 * 
 * Created: February 1, 2026
 * Part of: Modbus IO Module - Vibration Analysis Feature
 */

#include "vibration.h"
#include <Wire.h>
#include <math.h>
#include <pico/multicore.h>
#include <pico/mutex.h>

// ============================================================================
// GLOBAL VIBRATION STATE
// ============================================================================

VibrationSensorState vibrationSensors[MAX_VIBRATION_SENSORS];
int numVibrationSensors = 0;
volatile bool vibrationDataReady = false;
volatile bool vibrationEnabled = true;

// Mutex for thread-safe access to I2C bus
// Note: Core 0 and Core 1 share I2C hardware, so we need synchronization
mutex_t i2cVibrationMutex;
static bool mutexInitialized = false;

// Core 1 timing control
static uint32_t lastSampleMicros = 0;
static const uint32_t sampleIntervalMicros = 1000000 / VIBRATION_SAMPLE_RATE_HZ;  // 2000 µs for 500 Hz
static uint32_t lastStatsTime = 0;

// LIS3DH register addresses
#define LIS3DH_REG_WHO_AM_I  0x0F
#define LIS3DH_REG_CTRL1     0x20
#define LIS3DH_REG_CTRL4     0x23
#define LIS3DH_REG_OUT_X_L   0x28

// LIS3DH expected WHO_AM_I value
#define LIS3DH_WHO_AM_I_VALUE 0x33

// Scale factor for ±2g range, 10-bit mode: 3.906 mg/LSB
#define LIS3DH_SCALE_MG 3.906f

// Forward declarations
static void initVibrationSensor(VibrationSensorState& sensor);
static bool readVibrationSample(VibrationSensorState& sensor);
static void computeVibrationStats(VibrationSensorState& sensor);
static void resetVibrationAccumulators(VibrationSensorState& sensor);

// ============================================================================
// CORE 1 ENTRY POINT - setup1() and loop1()
// These are called automatically by the RP2040 Arduino core for Core 1
// ============================================================================

void setup1() {
    // Wait for Core 0 to complete main setup (indicated by core0setupComplete flag)
    while (!core0setupComplete) {
        delay(10);
    }
    
    // Additional delay to ensure all I2C sensors are initialized on Core 0
    delay(2000);
    
    // Initialize mutex if not already done
    if (!mutexInitialized) {
        mutex_init(&i2cVibrationMutex);
        mutexInitialized = true;
    }
    
    Serial.println("[Vibration Core1] Starting vibration analysis module...");
    
    // Discover LIS3DH sensors from main sensor config
    numVibrationSensors = 0;
    
    for (int i = 0; i < numConfiguredSensors && numVibrationSensors < MAX_VIBRATION_SENSORS; i++) {
        if (configuredSensors[i].enabled && 
            strcmp(configuredSensors[i].type, "LIS3DH") == 0) {
            
            VibrationSensorState& vs = vibrationSensors[numVibrationSensors];
            vs.i2cAddress = configuredSensors[i].i2cAddress;
            vs.sdaPin = configuredSensors[i].sdaPin;
            vs.sclPin = configuredSensors[i].sclPin;
            vs.enabled = true;
            vs.sensorIndex = i;
            
            // Initialize the sensor for high-frequency reading
            initVibrationSensor(vs);
            
            Serial.printf("[Vibration Core1] Registered LIS3DH #%d at 0x%02X (SDA:%d SCL:%d)\n", 
                         numVibrationSensors, vs.i2cAddress, vs.sdaPin, vs.sclPin);
            
            numVibrationSensors++;
        }
    }
    
    if (numVibrationSensors == 0) {
        Serial.println("[Vibration Core1] No LIS3DH sensors found - Core 1 will idle");
        vibrationEnabled = false;
    } else {
        Serial.printf("[Vibration Core1] Initialized %d sensor(s) at %d Hz sample rate\n", 
                     numVibrationSensors, VIBRATION_SAMPLE_RATE_HZ);
        Serial.printf("[Vibration Core1] Statistics update interval: %d ms\n", VIBRATION_UPDATE_INTERVAL_MS);
    }
    
    lastSampleMicros = micros();
    lastStatsTime = millis();
}

void loop1() {
    // If no vibration sensors or disabled, idle to save power
    if (numVibrationSensors == 0 || !vibrationEnabled) {
        delay(100);
        return;
    }
    
    uint32_t nowMicros = micros();
    
    // Check if it's time for next sample (500 Hz = every 2000 µs)
    if (nowMicros - lastSampleMicros >= sampleIntervalMicros) {
        lastSampleMicros = nowMicros;
        
        // Acquire mutex for I2C access
        // Use try_enter to avoid blocking - skip sample if Core 0 is using I2C
        if (mutex_try_enter(&i2cVibrationMutex, NULL)) {
            // Sample all vibration sensors
            for (int i = 0; i < numVibrationSensors; i++) {
                if (vibrationSensors[i].enabled) {
                    readVibrationSample(vibrationSensors[i]);
                }
            }
            
            mutex_exit(&i2cVibrationMutex);
        }
        // If mutex not available, skip this sample (will catch next one)
    }
    
    // Check if it's time to compute statistics (every 1 second)
    uint32_t nowMillis = millis();
    if (nowMillis - lastStatsTime >= VIBRATION_UPDATE_INTERVAL_MS) {
        lastStatsTime = nowMillis;
        
        // Compute statistics for all sensors
        for (int i = 0; i < numVibrationSensors; i++) {
            if (vibrationSensors[i].enabled && vibrationSensors[i].sampleCount > 0) {
                computeVibrationStats(vibrationSensors[i]);
                resetVibrationAccumulators(vibrationSensors[i]);
            }
        }
        
        // Signal to Core 0 that new data is available
        vibrationDataReady = true;
    }
    
    // Small yield to prevent starving other operations
    // The tight_loop_contents() macro is a hint to the compiler
    tight_loop_contents();
}

// ============================================================================
// SENSOR INITIALIZATION
// ============================================================================

static void initVibrationSensor(VibrationSensorState& sensor) {
    // Note: We assume Wire is already initialized by Core 0
    // We just configure the LIS3DH for high-frequency operation
    
    // Acquire mutex for I2C
    mutex_enter_blocking(&i2cVibrationMutex);
    
    // Verify WHO_AM_I register
    Wire.beginTransmission(sensor.i2cAddress);
    Wire.write(LIS3DH_REG_WHO_AM_I);
    Wire.endTransmission(false);
    Wire.requestFrom((int)sensor.i2cAddress, 1);
    
    if (Wire.available()) {
        uint8_t whoami = Wire.read();
        if (whoami != LIS3DH_WHO_AM_I_VALUE) {
            Serial.printf("[Vibration] WARNING: LIS3DH at 0x%02X WHO_AM_I=0x%02X (expected 0x33)\n", 
                         sensor.i2cAddress, whoami);
        }
    }
    
    // Configure CTRL_REG1: Maximum ODR (1344 Hz), normal mode, all axes enabled
    // Bits: ODR3 ODR2 ODR1 ODR0 LPen Zen Yen Xen
    // 0x97 = 1001 0111 = 1344Hz, normal mode, XYZ enabled
    Wire.beginTransmission(sensor.i2cAddress);
    Wire.write(LIS3DH_REG_CTRL1);
    Wire.write(0x97);  // ODR=1344Hz (max), normal mode, all axes
    Wire.endTransmission();
    
    delay(10);  // Allow register to update
    
    // Configure CTRL_REG4: ±2g range, BDU enabled, high resolution
    // Bits: BDU BLE FS1 FS0 HR ST1 ST0 SIM
    // 0x88 = 1000 1000 = BDU=1, FS=±2g, HR=1
    Wire.beginTransmission(sensor.i2cAddress);
    Wire.write(LIS3DH_REG_CTRL4);
    Wire.write(0x88);  // BDU=1, ±2g, high resolution mode
    Wire.endTransmission();
    
    mutex_exit(&i2cVibrationMutex);
    
    // Initialize accumulator state
    sensor.sampleIndex = 0;
    sensor.sampleCount = 0;
    resetVibrationAccumulators(sensor);
    sensor.stats.valid = false;
    
    Serial.printf("[Vibration] LIS3DH at 0x%02X configured: 1344Hz ODR, ±2g, HR mode\n", 
                 sensor.i2cAddress);
}

// ============================================================================
// READ SINGLE SAMPLE (called at 500 Hz from Core 1)
// ============================================================================

static bool readVibrationSample(VibrationSensorState& sensor) {
    // Set register pointer to OUT_X_L with auto-increment (MSB set)
    Wire.beginTransmission(sensor.i2cAddress);
    Wire.write(LIS3DH_REG_OUT_X_L | 0x80);  // 0x80 = auto-increment
    if (Wire.endTransmission(false) != 0) {
        return false;  // NACK - sensor not responding
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
    // LIS3DH in 10-bit mode: data in upper 10 bits, lower 6 bits are padding
    int16_t rawX = (int16_t)((data[1] << 8) | data[0]) >> 6;
    int16_t rawY = (int16_t)((data[3] << 8) | data[2]) >> 6;
    int16_t rawZ = (int16_t)((data[5] << 8) | data[4]) >> 6;
    
    // Store in circular buffer
    uint16_t idx = sensor.sampleIndex;
    sensor.samplesX[idx] = rawX;
    sensor.samplesY[idx] = rawY;
    sensor.samplesZ[idx] = rawZ;
    
    // Update running accumulators for efficient RMS calculation
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
// COMPUTE STATISTICS (called every 1 second from Core 1)
// ============================================================================

static void computeVibrationStats(VibrationSensorState& sensor) {
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
    sensor.stats.peakX = fmaxf(fabsf((float)sensor.maxX), fabsf((float)sensor.minX)) * LIS3DH_SCALE_MG;
    sensor.stats.peakY = fmaxf(fabsf((float)sensor.maxY), fabsf((float)sensor.minY)) * LIS3DH_SCALE_MG;
    sensor.stats.peakZ = fmaxf(fabsf((float)sensor.maxZ), fabsf((float)sensor.minZ)) * LIS3DH_SCALE_MG;
    sensor.stats.peakMagnitude = sqrtf(
        sensor.stats.peakX * sensor.stats.peakX +
        sensor.stats.peakY * sensor.stats.peakY +
        sensor.stats.peakZ * sensor.stats.peakZ
    );
    
    // Crest factor: Peak / RMS (indicates impulsive vibration)
    // Guard against division by zero with minimum threshold
    const float minRms = 0.1f;  // 0.1 mg minimum
    sensor.stats.crestFactorX = (sensor.stats.rmsX > minRms) ? 
        sensor.stats.peakX / sensor.stats.rmsX : 0.0f;
    sensor.stats.crestFactorY = (sensor.stats.rmsY > minRms) ? 
        sensor.stats.peakY / sensor.stats.rmsY : 0.0f;
    sensor.stats.crestFactorZ = (sensor.stats.rmsZ > minRms) ? 
        sensor.stats.peakZ / sensor.stats.rmsZ : 0.0f;
    
    // Velocity RMS (mm/s) - simplified integration approximation
    // For proper velocity, would need high-pass filter + integration
    // This approximation: velocity_rms ≈ accel_rms_g * 9810 / (2 * π * f)
    // where f is the dominant frequency (assume ~50 Hz for motors)
    // accel in mg, so: velocity_mm_s = accel_mg * 9.81 / 1000 / (2 * π * 50) * 1000
    //                                = accel_mg * 9.81 / (2 * π * 50)
    //                                = accel_mg * 0.0312
    const float velConvFactor = 0.0312f;  // mg to mm/s at 50 Hz
    sensor.stats.velocityRmsX = sensor.stats.rmsX * velConvFactor;
    sensor.stats.velocityRmsY = sensor.stats.rmsY * velConvFactor;
    sensor.stats.velocityRmsZ = sensor.stats.rmsZ * velConvFactor;
    
    // Update metadata
    sensor.stats.sampleCount = sensor.sampleCount;
    sensor.stats.lastUpdateTime = millis();
    sensor.stats.valid = true;
    
    // Debug output (only occasionally to avoid flooding)
    static uint32_t lastDebugPrint = 0;
    if (millis() - lastDebugPrint > 10000) {  // Every 10 seconds
        Serial.printf("[Vibration] Sensor 0x%02X: RMS=%.1f/%.1f/%.1f mg, Peak=%.1f mg, CF=%.2f, Vel=%.2f mm/s (%d samples)\n",
                     sensor.i2cAddress,
                     sensor.stats.rmsX, sensor.stats.rmsY, sensor.stats.rmsZ,
                     sensor.stats.peakMagnitude,
                     sensor.stats.crestFactorZ,
                     sensor.stats.velocityRmsZ,
                     sensor.stats.sampleCount);
        lastDebugPrint = millis();
    }
}

// ============================================================================
// RESET ACCUMULATORS FOR NEXT WINDOW
// ============================================================================

static void resetVibrationAccumulators(VibrationSensorState& sensor) {
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
// PUBLIC API (called from Core 0)
// ============================================================================

/**
 * Initialize the vibration module
 * Called from setup() after sensor configuration is loaded
 */
void initVibrationModule() {
    // Initialize mutex
    if (!mutexInitialized) {
        mutex_init(&i2cVibrationMutex);
        mutexInitialized = true;
    }
    
    // Core 1 setup will be called automatically by the RP2040 core
    // when setup1() and loop1() are defined
    
    Serial.println("[Vibration] Module initialized - Core 1 will start automatically");
}

/**
 * Get vibration statistics for a sensor by I2C address
 * Returns nullptr if sensor not found or data not ready
 */
VibrationStats* getVibrationStats(uint8_t i2cAddress) {
    for (int i = 0; i < numVibrationSensors; i++) {
        if (vibrationSensors[i].i2cAddress == i2cAddress && 
            vibrationSensors[i].stats.valid) {
            return &vibrationSensors[i].stats;
        }
    }
    return nullptr;
}

/**
 * Get vibration statistics by sensor index (0 or 1)
 * Returns nullptr if index out of range or data not ready
 */
VibrationStats* getVibrationStatsByIndex(int index) {
    if (index >= 0 && index < numVibrationSensors && 
        vibrationSensors[index].stats.valid) {
        return &vibrationSensors[index].stats;
    }
    return nullptr;
}

/**
 * Acquire I2C mutex for Core 0 operations
 * Call this before any I2C operation on Core 0 to prevent conflicts with Core 1
 */
extern "C" void vibration_acquire_i2c_mutex() {
    if (mutexInitialized) {
        mutex_enter_blocking(&i2cVibrationMutex);
    }
}

/**
 * Release I2C mutex after Core 0 operations
 */
extern "C" void vibration_release_i2c_mutex() {
    if (mutexInitialized) {
        mutex_exit(&i2cVibrationMutex);
    }
}
