# Changelog - Modbus TCP IO Module

## [Unreleased] - 2025-11-07 - Software I2C Multiplexer & Multi-Sensor Pin Configuration

### 🎯 Major Features Added

#### Software I2C Bus Multiplexer
- **Added**: Dynamic I2C pin switching via `setI2CPins()` function
- **Feature**: Single Wire instance manages all I2C pin pairs sequentially
- **Benefit**: Support sensors on ANY valid RP2040 I2C pin pair simultaneously
- **Implementation**: Queue-based processing switches pins as needed for each sensor
- **Impact**: Eliminates dual-bus limitation, supports unlimited I2C pin configurations

#### Dynamic I2C Pin Configuration
- **Enhanced**: I2C sensors can specify custom SDA/SCL pins in sensors.json
- **Supported Pins I2C0**: {0,1}, {4,5}, {8,9}, {12,13}, {16,17}, {20,21}, {24,25}, {28,29}
- **Supported Pins I2C1**: {2,3}, {6,7}, {10,11}, {14,15}, {18,19}, {26,27}
- **Example**: PH sensor on GP4/GP5, SHT30 on GP2/GP3, additional sensors on GP6/GP7, etc.
- **Flexibility**: Multiple sensors can be configured on the same pin pair

#### I2C Sensor Type Improvements
- **Fixed**: SHT30 sensor queuing and communication on non-default I2C pins
- **Fixed**: ANALOG_CUSTOM sensor now updates `lastReadTime` for web UI display
- **Added**: Serial logging for I2C pin switches with source/destination pins

#### Pin Switching Mechanism
- **How It Works**: Before processing each I2C sensor from queue, dynamically switch Wire to correct pins
- **Efficiency**: Pin switching (~20ms) is negligible compared to sensor polling intervals (1-5 seconds)
- **Deterministic**: Sequential queue processing ensures no I2C bus conflicts
- **Logging**: Detailed debug output tracks all pin switches

### 🔧 Technical Changes

#### Modified Files
- `src/main.cpp`:
  - Added `currentI2C_SDA` and `currentI2C_SCL` static tracking variables
  - Implemented `setI2CPins(int sda, int scl)` helper function
  - Updated `processI2CQueue()` to call `setI2CPins()` before sensor communication
  - Simplified `setup()` I2C initialization (removed dual-bus code)
  - Updated pin pair logging in serial output
  - Added missing `lastReadTime` update for ANALOG_CUSTOM sensors

#### RP2040 Wire Library Usage
- **API Used**: `Wire.setSDA()`, `Wire.setSCL()`, `Wire.begin()`, `Wire.end()`
- **Not Used**: Wire1 (unnecessary with software multiplexing)
- **Reason**: Sequential processing eliminates need for multiple Wire instances

### ✅ Tested Scenarios
- PH sensor on GP4/GP5 (I2C0)
- SHT30 sensor on GP2/GP3 (I2C1)
- ANALOG_CUSTOM on GP27
- DS18B20 on GP28 (One-Wire)
- Dynamic pin switching between sensors in queue

### 📝 Known Limitations
- Only one I2C bus active at a time (by design - not a limitation, just sequential)
- Pin switching takes ~20ms per sensor change (negligible vs 1-5s polling intervals)
- Physical I2C pull-up resistors required on each pin pair in use

---

[2025-10-07]
Backend and firmware now support dynamic sensor parameters for generic sensors, including protocol, pin assignments, measurement command, polling interval, parsing method/config, calibration, and modbus register. These are loaded and saved via config_manager.cpp and used in main.cpp for sensor reading and bus operations.

Validated that all UI-configured fields (protocol, pins, command, parsing, calibration, modbus register) are sent to the backend and stored in sensors.json. Confirmed firmware uses these fields for reading, parsing, and Modbus mapping.

System is ready for end-to-end workflow validation for generic sensor abstraction and configuration.

## [v2.0.0] - 2025-09-09 - Major Sensor Enhancement Update

### 🎯 Major Features Added

#### Multi-Sensor Type Support
- **Added**: Sensor type selection dropdown in web UI (I2C, UART, Digital, Analog)
- **Enhanced**: SensorConfig struct with `sensor_type[16]` field
- **Impact**: Flexible configuration for different sensor interfaces

#### Mathematical Formula Conversion System
-- **Added**: formula field for mathematical expression parsing (using built-in math/string parsing, no tinyexpr)
- **Enhanced**: Replaced simple polynomial calibration with full mathematical formula support
- **Examples**: `(x * 1.8) + 32`, `sqrt(x * 9.8)`, `log(x + 1) * 100`
- **Impact**: Works across all sensor types with complex conversion equations

#### Terminal Interface for Diagnostics
- **Added**: Bash-like command interface for sensor fault-finding
- **IP Commands**: `ipconfig`, `arp`, `ping <target>`, `tracert <target>`
- **Sensor Commands**: `sensor list`, `sensor read <id>`, `sensor info <id>`, `sensor test <id>`
- **UI**: Dark terminal theme with command history
- **Impact**: Real-time diagnostics and network troubleshooting capabilities

#### Engineering Units Enhancement
- **Fixed**: Bug where calibrated engineering units weren't displaying in sensor table
- **Added**: `units[16]` field to SensorConfig struct
- **Enhanced**: Proper units labeling throughout interface (°C, %, psi, etc.)
- **Impact**: Clear display of both raw and converted values

### 🔧 Technical Changes

#### Backend (main.cpp)
-- **Added**: formula conversion logic using built-in math/string parsing (no tinyexpr)
- **Added**: `applyFormulaConversion(double raw_value, const char* formula)` function
- **Enhanced**: `handleTerminalCommand()` with IP and sensor diagnostic routing
- **Updated**: `saveSensorConfig()` and `loadSensorConfig()` for new fields
- **Fixed**: MAC address retrieval using `eth.macAddress(mac)` with buffer parameter

#### Frontend (index.html)
- **Added**: Sensor type dropdown with options: I2C, UART, Digital, Analog
- **Added**: Formula input field for mathematical expressions
- **Added**: Engineering units input field
- **Enhanced**: Terminal interface section with command input and output display
- **Updated**: Sensor table to show engineering units column

#### Frontend (script.js)
- **Enhanced**: `renderSensorTable()` to display engineering units
- **Added**: `executeTerminalCommand()` function for command processing
- **Added**: `updateTerminalTargets()` for sensor command completion
- **Updated**: Sensor form handling for new fields

#### Styling (styles.css)
- **Added**: Terminal styling with dark theme
- **Enhanced**: Form layouts for new input fields
- **Improved**: Responsive design for terminal interface

#### Dependencies (platformio.ini)
-- **Added**: formula conversion using built-in math/string parsing (no tinyexpr)

### 🏗️ Data Structure Changes

#### SensorConfig Struct Enhancement
```cpp
struct SensorConfig {
    char name[32];           // Existing
    char sensor_type[16];    // NEW: I2C, UART, Digital, Analog
    char formula[64];        // NEW: Mathematical conversion formula
    char units[16];          // NEW: Engineering units
    // ... existing fields maintained
};
```

### 🚀 Build Information
- **Status**: ✅ Successfully compiles
- **Memory Usage**: 21.1% RAM, 9.5% Flash
- **Target**: Raspberry Pi Pico (RP2040)
- **Framework**: Arduino with PlatformIO

### 📋 Compatibility
- **Maintains**: All existing Modbus TCP functionality
- **Backwards Compatible**: Existing sensor configurations will work
- **New Features**: Optional - existing setups continue to function

### 🐛 Bug Fixes
- **Fixed**: Engineering units not displaying in sensor table for analog sensors
- **Fixed**: MAC address function compilation error (`eth.macAddress()` → `eth.macAddress(mac)`)

### 📚 Documentation
- **Added**: This changelog for tracking modifications
- **Location**: Project root directory
- **Purpose**: Historical record of enhancements and technical decisions

---

## Previous Versions

### [v1.0.0] - Initial Release
- Basic Modbus TCP IO Module functionality
- Simple analog sensor support
- Web-based configuration interface
- Polynomial calibration system
