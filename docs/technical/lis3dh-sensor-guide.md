# LIS3DH 3-Axis Accelerometer Integration Guide

## Overview
The LIS3DH is a 3-axis digital accelerometer from STMicroelectronics that communicates via I2C. This implementation is based on the official **Raspberry Pi Pico LIS3DH reference code** for maximum compatibility and stability.

## Polling & Data Abstraction

### I2C Protocol
The LIS3DH requires a **two-transaction I2C sequence** (per RP reference):

1. **Write Transaction**: Set register pointer to 0x28 (OUT_X_L, start of acceleration data)
   - `Wire.beginTransmission(0x18)`
   - `Wire.write(0x28)` — register address
   - `Wire.endTransmission()`

2. **Read Transaction**: Read 6 bytes of acceleration data (auto-increments through registers)
   - `Wire.requestFrom(0x18, 6)`
   - Read: X_LSB, X_MSB, Y_LSB, Y_MSB, Z_LSB, Z_MSB
   - Auto-increments: 0x28→0x29→0x2A→0x2B→0x2C→0x2D

The firmware implements this with the **I2C state machine**:
- **IDLE**: Write register address (0x28)
- **WAITING_CONVERSION**: Wait 1ms for register pointer to set
- **READY_TO_READ**: Read 6 bytes from sensor

### Data Format
Raw 16-bit signed integers (little-endian):
- Bytes 0-1: X acceleration (X_LSB, X_MSB)
- Bytes 2-3: Y acceleration (Y_LSB, Y_MSB)
- Bytes 4-5: Z acceleration (Z_LSB, Z_MSB)

### Initialization Commands
Configuration based on **official Raspberry Pi reference implementation**:

| Register | Address | Value | Configuration |
|----------|---------|-------|----------------|
| CTRL_REG1 | 0x20 | 0x97 | 1344 Hz ODR, all axes enabled, normal mode |
| CTRL_REG4 | 0x23 | 0x80 | **±2g range** (standard mode per RP reference), Block Data Update |
| TEMP_CFG_REG | 0x1F | 0xC0 | Auxiliary ADC enabled (temperature sensing) |

**Note**: This uses **standard 10-bit mode at ±2g** (not High Resolution mode at ±16g) to match the Raspberry Pi reference implementation for maximum compatibility.

### Data Scaling
Per Raspberry Pi reference code with ±2g range in standard mode:
- **Sensitivity**: 0.004g per LSB (baseline per RP code)
- **Scale factor**: 1.953125 mg/LSB (maintains datasheet consistency)
- **Formula**: acceleration_mg = raw_16bit × 1.953125

### Example Values (at rest on horizontal surface)
- X ≈ 0 to 50 mg (sensor tilt)
- Y ≈ 0 to 50 mg (sensor tilt)
- Z ≈ 1000 mg (gravity: 9.8 m/s² ≈ 1000 mg)

## Modbus Register Mapping
Three consecutive Input Registers (FC4):

| Register | Content | Scale |
|----------|---------|-------|
| 20 | X acceleration | × 100 (to preserve decimals in integer register) |
| 21 | Y acceleration | × 100 |
| 22 | Z acceleration | × 100 |

**Example**: If X = 50.25 mg, Modbus register 20 = 5025

## REST API
Sensor values appear in `/iostatus` response under `sensors[].raw_value`, `raw_value_b`, `raw_value_c`:

```json
{
  "sensors": [{
    "name": "IMU",
    "type": "LIS3DH",
    "raw_value": 45.2,
    "raw_value_b": -12.8,
    "raw_value_c": 980.5,
    "calibrated_value": 45.2,
    "calibrated_value_b": -12.8,
    "calibrated_value_c": 980.5,
    "modbus_value": 4520,
    "modbus_value_b": -1280,
    "modbus_value_c": 98050
  }]
}
```

## Configuration Notes

### Important
- **Never set a custom `command` field** — LIS3DH uses direct register read (0x28), not a command
- The firmware automatically **clears any command field** for LIS3DH during preset application
- Default polling interval: **1000 ms** (1 Hz)
- Default I2C address: **0x18** (alternate: 0x19)

### Calibration
Full calibration support available for all three axes:
- Linear: `calibrated = raw × slope + offset`
- Polynomial: `calibrated = a₀ + a₁·raw + a₂·raw² + ...`
- Expression: Custom formulas (e.g., `sqrt(x^2 + y^2 + z^2)` for magnitude)

## Troubleshooting

### All Zeros in Output
**Cause**: Sensor not moving, or Z-axis not showing gravity
- **Check**: Place sensor on flat surface, Z should read ~1000 mg
- **Verify**: WHO_AM_I register (0x0F) should return 0x33 (checked during initialization)
- **Note**: With ±2g range and sensitivity of 0.004g/LSB, expect normal values in ±2000 mg range

### No Data in Queue
**Cause**: Sensor config has invalid `command` field
- **Fix**: Delete and re-add sensor via web UI, or manually clear command field in `sensors.json`

### Values Saturating or Clipping
**Cause**: Sensor range too small (±2g can clip on large accelerations)
- **Note**: For higher G-forces, reconfiguration needed (beyond scope of current implementation)

### Inconsistent Readings
**Cause**: I2C bus noise or timing issues
- **Check**: Verify BDU (Block Data Update) is enabled - prevents reading half-updated values
- **Verify**: Wire pull-up resistors (typically 4.7kΩ) are present on SDA/SCL

## Wire Connections
- **SDA**: GPIO 4 (RP2040 default)
- **SCL**: GPIO 5 (RP2040 default)
- **VCC**: 3.3V
- **GND**: Ground
- **Address**: 0x18 (SDO pin to GND) or 0x19 (SDO pin to VCC)

## Implementation Details

### Architecture Integration
- **State Machine**: 3-state I2C queue processor (IDLE → WAITING_CONVERSION → READY_TO_READ)
- **Multi-sensor**: Supports multiple LIS3DH sensors on same I2C bus with different addresses
- **Calibration**: Full expression evaluation support per axis
- **Modbus**: Maps to 3 consecutive Input Registers per device

### Code Locations
- **Initialization**: `setup()` function, lines 1518-1590
- **Polling**: `processI2CQueue()` function, IDLE state handler
- **Data parsing**: `processI2CQueue()` function, READY_TO_READ state handler
- **Modbus mapping**: `updateIOForClient()` function, LIS3DH specific handling

## References
- [Raspberry Pi Pico LIS3DH Reference Code](https://github.com/raspberrypi/pico-examples/tree/master/i2c/lis3dh_i2c) ⭐ **Official reference**
- [STMicroelectronics LIS3DH Datasheet](https://www.st.com/resource/en/datasheet/lis3dh.pdf)
- Sensor polling implemented in `src/main.cpp` — `processI2CQueue()` function
- Calibration framework in `applyCalibration()`, `applyCalibrationB()`, `applyCalibrationC()` functions

