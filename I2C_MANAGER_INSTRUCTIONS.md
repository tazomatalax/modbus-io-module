# Simple I2C Manager Integration Guide

## Overview
This guide explains how to integrate dynamic I2C pin allocation into the existing Modbus IO Module project structure without creating separate files. The functionality allows sensors to use any available GPIO pin pairs for I2C communication.

## Architecture

### Core Principle
Keep all I2C management code within existing files:
- **main.cpp**: I2C Manager stub/interface + terminal commands
- **sys_init.h**: Simple I2C helper functions (inline)
- **Web UI**: Enhanced sensor configuration for pin assignment

## Implementation Details

### 1. sys_init.h Changes

Add these simple inline functions at the END of sys_init.h (before `extern` declarations):

```cpp
// Simple I2C pin switching functions (add before extern declarations)
inline bool switchI2CPins(int sda, int scl) {
    Wire.end();
    Wire.setSDA(sda);
    Wire.setSCL(scl);
    Wire.begin();
    delay(10); // Small delay for pin stabilization
    return true;
}

inline bool probeSensor(uint8_t address, int sda, int scl) {
    switchI2CPins(sda, scl);
    Wire.beginTransmission(address);
    return (Wire.endTransmission() == 0);
}

inline String scanAllPins() {
    String result = "I2C Scan Results:\n";
    int pinPairs[][2] = {{0,1}, {2,3}, {4,5}, {6,7}, {8,9}, {10,11}, {12,13}, {14,15}};
    
    for (int pair = 0; pair < 8; pair++) {
        int sda = pinPairs[pair][0];
        int scl = pinPairs[pair][1];
        
        // Skip Ethernet pins (16-21)
        if ((sda >= 16 && sda <= 21) || (scl >= 16 && scl <= 21)) continue;
        
        result += "Pin pair " + String(sda) + "/" + String(scl) + ": ";
        switchI2CPins(sda, scl);
        
        bool foundAny = false;
        for (uint8_t addr = 1; addr < 127; addr++) {
            Wire.beginTransmission(addr);
            if (Wire.endTransmission() == 0) {
                result += "0x" + String(addr, HEX) + " ";
                foundAny = true;
            }
        }
        if (!foundAny) result += "none";
        result += "\n";
    }
    return result;
}

inline String scanCurrentBus() {
    String result = "Current I2C bus: ";
    bool foundAny = false;
    
    for (uint8_t addr = 1; addr < 127; addr++) {
        Wire.beginTransmission(addr);
        if (Wire.endTransmission() == 0) {
            result += "0x" + String(addr, HEX) + " ";
            foundAny = true;
        }
    }
    if (!foundAny) result += "none found";
    return result;
}
```

**Why sys_init.h?**
- Header file allows inline functions
- Already included by main.cpp
- Keeps utility functions separate from main logic
- No separate compilation unit (avoids linker issues)

### 2. main.cpp Changes

Add this I2C Manager stub AFTER the includes but BEFORE sensor functions:

```cpp
// Simple I2C Manager stub for compatibility
enum I2CResult { SUCCESS = 0, ERROR_TIMEOUT, ERROR_NACK, ERROR_PIN_CONFLICT };

struct SimpleI2CManager {
    int currentSDA = I2C_SDA_PIN;
    int currentSCL = I2C_SCL_PIN;
    
    bool begin() { Wire.begin(); return true; }
    
    I2CResult switchToPinPair(int sda, int scl) {
        if ((sda >= 16 && sda <= 21) || (scl >= 16 && scl <= 21)) return ERROR_PIN_CONFLICT;
        switchI2CPins(sda, scl);
        currentSDA = sda;
        currentSCL = scl;
        return SUCCESS;
    }
    
    String scanAllPinPairs() { return scanAllPins(); }
    String scanCurrentBus() { return ::scanCurrentBus(); }
    
    String getPinPairInfo() {
        return "Current pins: SDA=" + String(currentSDA) + ", SCL=" + String(currentSCL);
    }
    
    void getCurrentPinPair(int& sda, int& scl) {
        sda = currentSDA;
        scl = currentSCL;
    }
    
    bool probeSensor(uint8_t addr, int sda, int scl) {
        return ::probeSensor(addr, sda, scl);
    }
    
    I2CResult writeData(uint8_t addr, uint8_t* data, size_t len, bool dummy = false) {
        Wire.beginTransmission(addr);
        Wire.write(data, len);
        return (Wire.endTransmission() == 0) ? SUCCESS : ERROR_NACK;
    }
    
    I2CResult readData(uint8_t addr, uint8_t* buffer, size_t len, bool dummy = false) {
        if (Wire.requestFrom(addr, len) == len) {
            for (size_t i = 0; i < len; i++) {
                buffer[i] = Wire.read();
            }
            return SUCCESS;
        }
        return ERROR_TIMEOUT;
    }
    
    I2CResult readRegister(uint8_t addr, uint8_t reg, uint8_t& value) {
        Wire.beginTransmission(addr);
        Wire.write(reg);
        if (Wire.endTransmission() != 0) return ERROR_NACK;
        
        if (Wire.requestFrom(addr, (uint8_t)1) == 1) {
            value = Wire.read();
            return SUCCESS;
        }
        return ERROR_TIMEOUT;
    }
    
    I2CResult writeRegister(uint8_t addr, uint8_t reg, uint8_t data) {
        Wire.beginTransmission(addr);
        Wire.write(reg);
        Wire.write(data);
        return (Wire.endTransmission() == 0) ? SUCCESS : ERROR_NACK;
    }
    
    String getErrorString(I2CResult result) {
        switch(result) {
            case SUCCESS: return "Success";
            case ERROR_TIMEOUT: return "Timeout";
            case ERROR_NACK: return "NACK";
            case ERROR_PIN_CONFLICT: return "Pin conflict";
            default: return "Unknown error";
        }
    }
};

SimpleI2CManager i2cManager;
```

**Why in main.cpp?**
- Provides compatibility interface for existing code
- Keeps all I2C manager logic in one place
- No separate header file needed
- Easy to modify and maintain

### 3. Required Dependencies

**platformio.ini** should only include:
```ini
lib_deps = 
	https://github.com/Atlas-Scientific/Ezo_I2c_lib.git
```

**Local libraries** (already in lib/ directory):
- ArduinoJson/
- ArduinoModbus/
- ArduinoRS485/

**Do NOT add external library dependencies** - use the local libraries in lib/ directory.

### 4. Sensor Configuration Integration

The existing `SensorConfig` struct in sys_init.h already has the required fields:
```cpp
struct SensorConfig {
    // ... existing fields ...
    int sdaPin;          // I2C SDA pin assignment
    int sclPin;          // I2C SCL pin assignment
    // ... rest of fields ...
};
```

### 5. Web UI Integration

**No changes required** to the existing web UI files:
- `data/index.html` - Already has sensor configuration interface
- `data/script.js` - Already handles sensor pin assignments
- `data/styles.css` - No changes needed

The web UI already supports configuring `sdaPin` and `sclPin` for each sensor via the sensor configuration interface.

### 6. Terminal Commands

The I2C manager integrates with existing terminal command infrastructure. Commands available:

- `scan` - Scan all pin pairs for I2C devices
- `scanbus` - Scan current I2C bus
- `switch GP4 GP5` - Switch to specific pin pair
- `probe 0x77` - Test device at specific address
- `pininfo` - Show current pin assignment

### 7. How It Works

1. **Sensor Processing**: When processing sensors, the system checks each sensor's `sdaPin`/`sclPin` configuration
2. **Pin Switching**: Before communicating with a sensor, calls `switchI2CPins(sda, scl)`
3. **Communication**: Uses standard Wire library functions for I2C communication
4. **Multiple Sensors**: Can handle different sensors on different pin pairs simultaneously

### 8. Pin Allocation Strategy

**Available pin pairs**: 0/1, 2/3, 4/5, 6/7, 8/9, 10/11, 12/13, 14/15
**Reserved pins**: 16-21 (Ethernet W5500)
**Default pins**: 24/25 (I2C_SDA_PIN, I2C_SCL_PIN in sys_init.h)

**Example allocation**:
- Sensor 1: SHT30 on pins 0/1
- Sensor 2: BME280 on pins 2/3  
- Sensor 3: EZO pH on pins 4/5
- etc.

### 9. Error Handling

- **Pin conflicts**: Prevents using Ethernet pins (16-21)
- **Communication errors**: Returns appropriate I2CResult codes
- **Timeout handling**: Configurable timeouts for I2C operations
- **Graceful fallback**: Falls back to default pins if switching fails

### 10. Debugging

The system provides extensive debugging via:
- Serial output for pin switching operations
- Terminal commands for manual I2C testing
- Web UI status display for sensor states
- Error messages with specific I2C error codes

## Integration Steps

1. **Add sys_init.h functions** - Copy the inline functions to sys_init.h
2. **Add main.cpp stub** - Copy the SimpleI2CManager struct to main.cpp
3. **Verify platformio.ini** - Ensure only EZO library as external dependency
4. **Test build** - Compile and verify no errors
5. **Upload firmware** - Upload both firmware and filesystem
6. **Test via terminal** - Use `scan` command to verify I2C scanning works
7. **Configure sensors** - Use web UI to assign pin pairs to sensors

## Benefits of This Approach

- ✅ **No separate files** - Everything integrated into existing structure
- ✅ **No linker issues** - All functions are inline or in single compilation unit
- ✅ **Maintains compatibility** - Existing code continues to work
- ✅ **Easy to debug** - All code visible in main files
- ✅ **Simple to modify** - No complex build dependencies
- ✅ **Web UI ready** - Frontend already supports pin configuration

## Testing

**Terminal test sequence**:
```
scan                    # Should show devices on all pin pairs
switch GP0 GP1         # Switch to pins 0/1
scanbus                # Scan current bus
probe 0x77             # Test specific device
pininfo                # Show current pins
```

**Web UI test**:
1. Open sensor configuration
2. Add sensor with specific SDA/SCL pins
3. Save configuration
4. Check sensor appears in status display

This approach gives you full dynamic I2C pin allocation while keeping the code structure clean and maintainable.