# Pin Configuration Fix Summary

## Issues Identified and Fixed

### 1. **Invalid GPIO Pin Numbers**
**Problem**: The firmware was trying to use GPIO 24 and 25, which don't exist on the RP2040 microcontroller.
- RP2040 only has GPIO 0-29
- GPIO 24, 25 are invalid pin numbers

**Fix**: Changed default I2C pins to valid GPIO numbers:
- Primary I2C: GPIO 4 (SDA), GPIO 5 (SCL) - Physical pins 6, 7
- Alternative pairs: GPIO 2,3 and GPIO 6,7

### 2. **ADC Pin Confusion**
**Problem**: Physical pins 31, 32, 34 (marked GP26, GP27, GP28 on board) are ADC-only pins
- These pins can ONLY be used for analog voltage measurement
- They CANNOT be used for I2C, UART, or digital I/O

**Clarification**: Updated documentation to clearly indicate these limitations

### 3. **Available Pins Array**
**Problem**: The flexible pins array was missing GPIO 2, 3, 6, 7
**Fix**: Updated `AVAILABLE_FLEXIBLE_PINS` to include all valid GPIO pins except W5500 reserved pins

## Current Correct Pin Configuration

### W5500 Ethernet Reserved Pins (DO NOT USE):
- GPIO 16-22 (Physical pins 21-29)

### Available I2C Pin Pairs:
1. **GPIO 4, 5** (Physical pins 6, 7) - **Primary/Default**
2. **GPIO 2, 3** (Physical pins 4, 5) - Alternative
3. **GPIO 6, 7** (Physical pins 9, 10) - Alternative

### Analog Input Pins (ADC ONLY):
- **GPIO 26** (Physical pin 31) - AI0 - **ADC ONLY**
- **GPIO 27** (Physical pin 32) - AI1 - **ADC ONLY**  
- **GPIO 28** (Physical pin 34) - AI2 - **ADC ONLY**

### Available Flexible Pins for UART/One-Wire/Digital:
GPIO: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 23

## Web Interface Fix

The "Error loading available pins" issue was caused by the invalid GPIO 24, 25 references. This has been fixed by:

1. Updating `I2C_PIN_PAIRS` array with valid GPIO numbers
2. Correcting the `I2C_SDA_PIN` and `I2C_SCL_PIN` defines
3. Expanding `AVAILABLE_FLEXIBLE_PINS` array
4. Updating `NUM_FLEXIBLE_PINS` count

## Testing After Upload

After uploading the firmware:

1. **Web Interface**: The sensor configuration page should now load without "error loading available pins"
2. **I2C Scanner**: Use the terminal with protocol "I2C" and command "scan" to verify I2C functionality
3. **Pin Selection**: The dropdown menus should show valid GPIO pin combinations

## Important Notes

- **Always use GPIO numbers in configuration, not physical pin numbers**
- **Physical pins 31, 32, 34 are ADC-only - don't try to use them for I2C sensors**
- **Default I2C pins are now GPIO 4,5 (physical pins 6,7) instead of the invalid GPIO 24,25**

## Next Steps

1. Upload the corrected firmware
2. Upload the filesystem (if web interface files changed)
3. Test sensor configuration in the web interface
4. Verify I2C communication with actual sensors using the corrected pins