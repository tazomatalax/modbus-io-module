# SPI Support for Modbus IO Module

## Overview

The web UI has been updated to support **SPI protocol** for sensors like the LIS3DH accelerometer. This document explains:

1. How to use SPI sensors via the web UI
2. Why SPI is better than I2C for LIS3DH
3. Hardware pin configuration for SPI
4. Implementation guide for firmware support

---

## Why SPI Over I2C for LIS3DH?

### I2C Issues (What You've Experienced)
- ❌ Complex register addressing protocol (auto-increment bit 0x80 manipulation)
- ❌ Register pointer persistence issues (likely cause of your X-axis zero problem)
- ❌ Repeated START reliability issues on some microcontroller platforms
- ❌ Per-byte latency accumulation
- ❌ Complex protocol requires exact sequencing

### SPI Advantages (Why You Should Switch)
- ✅ **Simpler Protocol**: CS low → shift bytes → CS high (that's it!)
- ✅ **No Register Pointer State**: Each transaction is independent
- ✅ **Higher Speed**: 500 kHz → 4 MHz (vs I2C 400 kHz limit)
- ✅ **Library Support**: Adafruit library handles all complexity
- ✅ **Proven on Pico**: Works reliably with RP2040
- ✅ **Already Proven on Your Board**: W5500 uses SPI - you know it works

**Bottom Line:** The Adafruit LIS3DH library already has full SPI support. Just swap 1 line of code, and all protocol complexity is handled automatically.

---

## Web UI SPI Configuration

### Adding an SPI Sensor (User Perspective)

1. **Go to Sensor Configuration Tab**
2. **Select Protocol: SPI**
3. **Select Sensor Type: LIS3DH (3-Axis Accelerometer via SPI)**
4. **Configure SPI Settings:**
   - **Chip Select (CS) Pin**: Select any unused GPIO (e.g., GP22)
   - **SPI Bus**: Choose hardware (hw0/hw1) or software (bit-bang)
   - **SPI Frequency**: 500 kHz (default) to 4 MHz
   - **Polling Interval**: How often to read (1000 ms = 1 second)

### SPI Bus Modes

#### Hardware SPI (Recommended)
- **SPI0**: MOSI=GP3, MISO=GP4, CLK=GP2 (automatic pin assignment)
- **SPI1**: MOSI=GP11, MISO=GP12, CLK=GP10 (automatic pin assignment)
- Pros: Fast, uses dedicated hardware
- Cons: Limited pin flexibility

#### Software SPI (Bit-Banging)
- **Use when**: Hardware SPI pins conflict with other devices
- **How**: Select "Software SPI" and manually choose MOSI, MISO, CLK pins
- Pros: Any GPIO can be used
- Cons: Slower, more CPU usage

### Pin Selection
- **W5500 (Ethernet)** occupies: GP16-GP21 (avoid these)
- **Safe CS pins**: GP22, GP26, GP27, GP28, or unused GPIO
- **Default HW SPI pins** (should be free since W5500 uses different pins)

---

## Hardware Wiring (RP2040 + LIS3DH + W5500 + Pico)

```
LIS3DH (SPI)
├─ VCC → 3.3V
├─ GND → GND
├─ CS → GPIO22 (or any available)
├─ MOSI → GPIO3 (SPI0) or GPIO11 (SPI1) [user-configurable]
├─ MISO → GPIO4 (SPI0) or GPIO12 (SPI1) [user-configurable]
└─ CLK → GPIO2 (SPI0) or GPIO10 (SPI1) [user-configurable]

W5500 (Ethernet - Already Configured)
├─ CS → GP17
├─ MOSI → ?
├─ MISO → ?
└─ CLK → ?
```

**Key Requirement:** If using same SPI bus as W5500, ensure CS pins are different. If using different hardware SPI bus (hw0 vs hw1), pin conflict is impossible.

---

## Configuration Format (JSON)

### Example SPI LIS3DH Entry

```json
{
  "enabled": true,
  "name": "Accelerometer (SPI)",
  "type": "LIS3DH_SPI",
  "protocol": "SPI",
  "spiChipSelect": 22,
  "spiBus": "hw0",
  "spiFrequency": 500000,
  "pollingIntervalMs": 1000,
  "modbusRegister": 10,
  "calibration": {
    "offset_x": 0.0,
    "offset_y": 0.0,
    "offset_z": 0.0,
    "scale_x": 1.0,
    "scale_y": 1.0,
    "scale_z": 1.0
  }
}
```

### Field Descriptions

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `enabled` | boolean | `true` | Enable/disable sensor |
| `name` | string | `"Accelerometer (SPI)"` | Display name |
| `type` | string | `"LIS3DH_SPI"` | Sensor identifier (must be `LIS3DH_SPI` for SPI version) |
| `protocol` | string | `"SPI"` | Protocol type |
| `spiChipSelect` | number | `22` | GPIO pin for CS (active low) |
| `spiBus` | string | `"hw0"` `"hw1"` `"soft"` | Which SPI bus to use |
| `spiFrequency` | number | `500000` | SPI clock frequency in Hz (250k-10M) |
| `pollingIntervalMs` | number | `1000` | How often to read sensor (milliseconds) |
| `modbusRegister` | number | `10` | Modbus input register offset for X-axis |
| `calibration` | object | `{...}` | Offset and scale factors (optional) |

### Calibration Fields (Optional)

Used to adjust raw sensor readings:

```json
"calibration": {
  "offset_x": 0.0,      // Subtract from raw X value (mg)
  "offset_y": 0.0,      // Subtract from raw Y value (mg)
  "offset_z": -1000.0,  // Usually ~-1000 to account for gravity on Z
  "scale_x": 1.0,       // Multiply X by this (1.0 = no change)
  "scale_y": 1.0,
  "scale_z": 1.0
}
```

---

## Firmware Implementation (Next Steps)

The web UI now supports SPI configuration. To make it functional, firmware must:

### 1. **sys_init.h** - Add SPI Constants

```cpp
// SPI LIS3DH Configuration
#define LIS3DH_SPI_CS_PIN 22       // Chip select pin (configurable via JSON)
#define LIS3DH_SPI_BUS 0           // Which SPI bus (0 or 1)
#define LIS3DH_SPI_FREQUENCY 500000 // 500 kHz default
```

### 2. **main.cpp** - Include Adafruit Library

```cpp
#include <Adafruit_LIS3DH.h>

// Create SPI instance (instead of I2C)
Adafruit_LIS3DH lis3dh_spi(LIS3DH_SPI_CS_PIN);  // Hardware SPI, pin 22

// Or software SPI:
// Adafruit_LIS3DH lis3dh_spi(CS, MOSI, MISO, CLK, frequency);
```

### 3. **setup()** - Initialize SPI LIS3DH

```cpp
void setup() {
    // ... existing code ...
    
    // Initialize LIS3DH via SPI
    if (!lis3dh_spi.begin(0x18)) {  // Default I2C address still applies
        Serial.println("LIS3DH SPI init failed!");
    } else {
        Serial.println("LIS3DH SPI OK - WHO_AM_I = 0x" + String(lis3dh_spi.getDeviceID(), HEX));
        
        // Set range to ±2g (default)
        lis3dh_spi.setRange(LIS3DH_RANGE_2_G);
        
        // Set data rate (default 400 Hz)
        lis3dh_spi.setDataRate(LIS3DH_DATARATE_400_HZ);
    }
}
```

### 4. **loop()** - Read SPI Data

```cpp
// Inside main sensor polling loop:
lis3dh_spi.read();  // Fetch all 3 axes

float x_mg = lis3dh_spi.x * 0.003906;  // Library already provides scaled values
float y_mg = lis3dh_spi.y * 0.003906;  // 3.906 mg/LSB for ±2g mode
float z_mg = lis3dh_spi.z * 0.003906;

// Apply calibration if configured
float x_cal = x_mg - config.calibration.offset_x;
float y_cal = y_mg - config.calibration.offset_y;
float z_cal = z_mg - config.calibration.offset_z;

// Store in Modbus registers starting at sensorConfig.modbusRegister
// This is already handled by existing code
```

### 5. **REST Endpoint** - Update `/iostatus`

The accelerometer data should be added to JSON response:

```json
{
  "lis3dh_accel": {
    "enabled": true,
    "type": "LIS3DH_SPI",
    "x_mg": -12.5,
    "y_mg": 45.3,
    "z_mg": 987.2,
    "modbus_register": 10
  }
}
```

---

## Detection: I2C vs SPI

### Config File Indicator

```json
"type": "LIS3DH"      // I2C version
"type": "LIS3DH_SPI"  // SPI version
```

### Firmware Logic

```cpp
if (strcmp(sensorConfig.type, "LIS3DH_SPI") == 0) {
    // Initialize SPI instance
    // Read via lis3dh_spi.read()
} else if (strcmp(sensorConfig.type, "LIS3DH") == 0) {
    // Initialize I2C instance
    // Read via lis3dh_i2c.read()
}
```

---

## Adafruit LIS3DH Library - Key Methods

Once initialized, the library provides:

```cpp
lis.read();                          // Read all 3 axes into buffer
int16_t x = lis.x;                  // Raw value (already bit-shifted)
int16_t y = lis.y;
int16_t z = lis.z;
float x_mg = lis.x * 0.003906;      // Convert to mg

sensors_event_t event;
lis.getEvent(&event);               // Get normalized SI units (m/s²)
float x_mss = event.acceleration.x;

uint8_t range = lis.getRange();     // Get current range setting
void setRange(lis3dh_range_t r);    // Set ±2G, ±4G, ±8G, ±16G

uint8_t rate = lis.getDataRate();
void setDataRate(lis3dh_dataRate_t r);

lis3dh_mode_t mode = lis.getPerformanceMode();  // LOW_POWER, NORMAL, HIGH_RESOLUTION
void setPerformanceMode(lis3dh_mode_t m);
```

**The library handles ALL complexity:**
- ✅ Register selection and sequencing
- ✅ Byte ordering (little-endian)
- ✅ Bit shifting (10-bit extraction)
- ✅ Scale factor application
- ✅ CS (chip select) timing for SPI
- ✅ Temperature compensation (optional)

---

## Testing SPI Configuration

### Step 1: Configure via Web UI
1. Select Protocol: **SPI**
2. Select Sensor: **LIS3DH (3-Axis Accelerometer via SPI)**
3. Set CS pin: **22** (or your chosen pin)
4. Set SPI Bus: **hw0** (hardware SPI0)
5. Set Frequency: **500 kHz** (default)
6. Save

### Step 2: Check `/iostatus` Endpoint
```bash
curl http://<your-pico-ip>/iostatus
```

You should see SPI LIS3DH data (once firmware is updated to support it).

### Step 3: Verify Modbus
```bash
# Read register 10 (if LIS3DH on register 10)
modbus_read <ip> <port> 0 4 10  # Read 3 consecutive float registers
```

### Step 4: Check Serial Monitor
```
[Setup] LIS3DH SPI init successful!
[Setup] LIS3DH WHO_AM_I = 0x33
[Loop] LIS3DH X=12.5mg Y=45.3mg Z=987.2mg
```

---

## Troubleshooting

### "LIS3DH SPI init failed!"
- ❌ **Check:** CS pin connected?
- ❌ **Check:** Correct SPI bus selected (hw0, hw1, or soft)?
- ❌ **Check:** SPI clock frequency too high (try 250 kHz)?
- ✅ **Solution:** Verify pinout, try lower frequency, check power supply

### "All zeros (0, 0, 0)"
- ❌ **Check:** Sensor powered? (VCC=3.3V, GND=GND)
- ❌ **Check:** MOSI/MISO/CLK connected to correct pins?
- ❌ **Check:** Polling interval too short (minimum 100 ms recommended)?
- ✅ **Solution:** Check power, verify pin assignments, increase polling interval

### "Garbage values"
- ❌ **Check:** SPI frequency too high for PCB layout?
- ❌ **Check:** Pull-up resistors needed on CS line?
- ❌ **Check:** Wiring too long or near noise sources?
- ✅ **Solution:** Lower SPI frequency to 250 kHz, add pull-up to CS if needed, check wiring

### "Sensor works but only 1-2 axes valid"
- ❌ **This was your I2C problem!** Different issue with SPI.
- ✅ **Solution:** SPI shouldn't have this issue. Check data sheet for register addresses.

---

## Reference: SPI Pin Options (RP2040)

### Hardware SPI0 (Recommended)
- **Default Pins (PIO0):**
  - TX (MOSI): GP3 (Pin 5)
  - RX (MISO): GP4 (Pin 6)
  - SCK: GP2 (Pin 4)
- **Alternate Pins (PIO1):**
  - TX: GP7, RX: GP4, SCK: GP6

### Hardware SPI1 (Secondary)
- **Default Pins (PIO0):**
  - TX: GP11 (Pin 15)
  - RX: GP12 (Pin 16)
  - SCK: GP10 (Pin 14)
- **Alternate Pins (PIO1):**
  - TX: GP15, RX: GP8, SCK: GP9

### Software SPI (Bit-Bang)
- **Any GPIO** can be used
- Used when hardware pins conflict
- Slower but flexible

---

## Next: REST Endpoint Update

The web UI is ready. Next firmware task is to parse the SPI configuration from JSON and implement sensor reading. See `copilot-instructions.md` Section 4 (Sensor Integration Workflow) for the full checklist.

