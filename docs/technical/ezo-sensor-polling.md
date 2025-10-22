# EZO Sensor Polling Guide

This document explains how EZO (Atlas Scientific) sensor polling is implemented in the Modbus IO Module firmware, including all relevant code sections and their roles in the overall sensor dataflow.

---

## 1. Sensor Configuration and Presets

When the firmware loads sensor configuration (from `sensors.json` via LittleFS), it populates the `configuredSensors` array. The `applySensorPresets()` function ensures that any unset fields for known sensor types (including EZO types) are filled with sensible defaults, but **does not override user settings**.

```cpp
void applySensorPresets() {
    for (int i = 0; i < numConfiguredSensors; i++) {
        if (!configuredSensors[i].enabled) continue;
        if (strcmp(configuredSensors[i].type, "EZO-PH") == 0 ||
            strcmp(configuredSensors[i].type, "EZO_PH") == 0) {
            if (configuredSensors[i].i2cAddress == 0) 
                configuredSensors[i].i2cAddress = 0x63;
            if (strlen(configuredSensors[i].command) == 0) 
                strcpy(configuredSensors[i].command, "R");
            if (strlen(configuredSensors[i].protocol) == 0) 
                strcpy(configuredSensors[i].protocol, "I2C");
            if (configuredSensors[i].updateInterval == 0) 
                configuredSensors[i].updateInterval = 5000;
            if (configuredSensors[i].modbusRegister == 0) 
                configuredSensors[i].modbusRegister = 10;
            Serial.printf("Auto-configured EZO-PH sensor (address: 0x%02X, "
                "interval: %dms, register: %d)\n",
                configuredSensors[i].i2cAddress, 
                configuredSensors[i].updateInterval, 
                configuredSensors[i].modbusRegister);
        }
        // ...other sensor types...
    }
}
```

---

## 2. Polling Cadence and Queue Management

The firmware uses a **unified queue system** for sensor polling. Every sensor is checked periodically in `updateBusQueues()`, and if it's time for a new reading, it is added to the appropriate queue.

```cpp
void updateBusQueues() {
    for (int i = 0; i < numConfiguredSensors; i++) {
        if (!configuredSensors[i].enabled) continue;
        if (currentTime - configuredSensors[i].lastReadTime >= 
            configuredSensors[i].updateInterval) {
            if (strncmp(configuredSensors[i].protocol, "I2C", 3) == 0) {
                enqueueBusOperation(i, "I2C");
            }
        }
    }
}
```

---

## 3. I2C Queue Operation and Command Sending

The `processI2CQueue()` function handles sending commands and reading responses for all I2C sensors, including EZO types.

### Sending the Command

For EZO sensors, the command is typically `"R"` (for read). The code checks if the command is text or hex and sends it accordingly.

```cpp
if (hasCommand) {
    String command = String(configuredSensors[op.sensorIndex].command);
    // ...hex/text detection...
    // For EZO sensors, this is typically a text command:
    for (int i = 0; i < command.length(); i++) {
        if (command[i] == '\\' && i + 1 < command.length()) {
            if (command[i + 1] == 'r') { Wire.write(13); i++; }
            else if (command[i + 1] == 'n') { Wire.write(10); i++; }
            else { Wire.write((uint8_t)command[i]); }
        } else {
            Wire.write((uint8_t)command[i]);
        }
    }
}
Wire.endTransmission();
```

### Delay Before Reading

After sending the command, the firmware waits for the sensor to process the request. For EZO sensors, this is typically 900ms (configurable).

```cpp
if (strcmp(configuredSensors[sensorIndex].type, "EZO-PH") == 0 ||
    strcmp(configuredSensors[sensorIndex].type, "EZO_PH") == 0) {
    op.conversionTime = configuredSensors[sensorIndex].delayBeforeRead;
    if (op.conversionTime <= 0) op.conversionTime = 900; // Default 900ms for EZO
}
```

---

## 4. Reading and Interpreting the Response

After the delay, the firmware requests up to 32 bytes from the sensor. EZO sensors return a **status byte** followed by ASCII data.

```cpp
Wire.requestFrom((int)configuredSensors[op.sensorIndex].i2cAddress, 32);
char response[32] = {0};
int idx = 0;
while(Wire.available() && idx < 31) {
    uint8_t byte = Wire.read();
    response[idx++] = byte;
}
response[idx] = '\0';

// EZO sensors return status code as first byte
uint8_t statusCode = (uint8_t)response[0];
String cleanResponse = "";
if (statusCode == 1) {
    // Success - extract data (skip status byte)
    for (int j = 1; j < idx; j++) {
        char c = response[j];
        if (c >= 32 && c <= 126 && c != 0) { cleanResponse += c; }
    }
    cleanResponse.trim();
    logI2CTransaction(configuredSensors[op.sensorIndex].i2cAddress, "VAL", 
        "EZO Success: \"" + cleanResponse + "\"", 
        String(configuredSensors[op.sensorIndex].name));
} else if (statusCode == 2) {
    cleanResponse = "SYNTAX_ERROR";
} else if (statusCode == 254) {
    cleanResponse = "PROCESSING";
} else if (statusCode == 255) {
    cleanResponse = "NO_DATA";
} else {
    cleanResponse = "UNKNOWN_STATUS_" + String(statusCode);
}
strncpy(configuredSensors[op.sensorIndex].response, 
    cleanResponse.c_str(), 
    sizeof(configuredSensors[op.sensorIndex].response)-1);
configuredSensors[op.sensorIndex].response
    [sizeof(configuredSensors[op.sensorIndex].response)-1] = '\0';
```

### EZO Status Codes
- **1**: Success – Data is valid
- **2**: Syntax error in command
- **254**: Sensor is still processing (not ready)
- **255**: No data available

---

## 5. Parsing and Calibrating the pH Value

The ASCII response (after the status byte) is parsed as a float and calibrated using the user-provided or default calibration equation.

```cpp
if (strcmp(configuredSensors[op.sensorIndex].type, "EZO-PH") == 0 ||
    strcmp(configuredSensors[op.sensorIndex].type, "EZO_PH") == 0) {
    configuredSensors[op.sensorIndex].rawValue = 
        atof(configuredSensors[op.sensorIndex].response);
    
    float calibratedValue = applyCalibration(
        configuredSensors[op.sensorIndex].rawValue, 
        configuredSensors[op.sensorIndex]);
    
    configuredSensors[op.sensorIndex].calibratedValue = calibratedValue;
    configuredSensors[op.sensorIndex].modbusValue = 
        (int)(calibratedValue * 100); // Scale to integer for Modbus
    
    logI2CTransaction(configuredSensors[op.sensorIndex].i2cAddress, "VAL", 
        "pH: " + String(configuredSensors[op.sensorIndex].rawValue), 
        String(configuredSensors[op.sensorIndex].name));
}
```

---

## 6. Modbus Register Mapping

The calibrated value is mapped to the configured Modbus register for client access.

```cpp
void updateIOForClient(int clientIndex) {
    for (int i = 0; i < numConfiguredSensors; i++) {
        if (configuredSensors[i].enabled && 
            configuredSensors[i].modbusRegister >= 0) {
            modbusClients[clientIndex].server.inputRegisterWrite(
                configuredSensors[i].modbusRegister, 
                configuredSensors[i].modbusValue);
        }
    }
}
```

---

## 7. Web UI and REST API Exposure

The sensor readings, calibration, and configuration are exposed via REST endpoints (`/sensors/data`, `/iostatus`, `/sensors/config`) for the web UI.

```cpp
void sendJSONSensorData(WiFiClient& client) {
    for (int i = 0; i < numConfiguredSensors; i++) {
        if (configuredSensors[i].enabled) {
            JsonObject sensor = sensorsArray.createNestedObject();
            sensor["name"] = configuredSensors[i].name;
            sensor["type"] = configuredSensors[i].type;
            sensor["protocol"] = configuredSensors[i].protocol;
            sensor["i2c_address"] = configuredSensors[i].i2cAddress;
            sensor["modbus_register"] = configuredSensors[i].modbusRegister;
            sensor["raw_value"] = configuredSensors[i].rawValue;
            sensor["calibrated_value"] = configuredSensors[i].calibratedValue;
            sensor["modbus_value"] = configuredSensors[i].modbusValue;
        }
    }
}
```

---

## 8. Diagnostics and Logging

All I2C transactions, including EZO sensor polling, are logged for diagnostics and can be monitored via the web UI terminal.

```cpp
void logI2CTransaction(int address, String direction, String data, String pin) {
    // Log format allows tracing sensor communication in real-time
    // Can be filtered by protocol, address, or sensor name
}
```

---

## Summary of EZO Polling Flow

1. **Configuration**: User sets up EZO sensor via web UI; firmware applies defaults only for unset fields
2. **Polling**: Sensor is polled at the configured interval; command `"R"` is sent over I2C
3. **Delay**: Firmware waits for the sensor to process the command (default 900ms for EZO)
4. **Response**: Firmware reads the response, interprets the status byte, and extracts the value
5. **Calibration**: The raw value is calibrated using user or default settings
6. **Modbus Mapping**: Calibrated value is written to the configured Modbus register
7. **REST Exposure**: Sensor data is exposed via REST endpoints for the web UI
8. **Diagnostics**: All transactions are logged for debugging and monitoring

---

## EZO Command Reference

### Common EZO Commands
- **R**: Read the current value (returns sensor output)
- **CAL**: Calibration command (requires temperature compensation setup)
- **T**: Set or get temperature compensation value
- **STATUS**: Request sensor status

### Atlas Scientific Documentation
For comprehensive EZO documentation, refer to:
- https://www.atlas-scientific.com/
- Datasheet for your specific sensor type (PH, EC, DO, RTD, etc.)

---

## Best Practices for EZO Sensors

1. **Initialization Time**: Allow 3-5 seconds after power-up before first read
2. **Calibration**: Perform single/dual-point calibration before deployment
3. **Temperature Compensation**: Use temperature-compensated readings when available
4. **Response Timeout**: EZO sensors should respond within 900ms; longer may indicate failure
5. **Error Recovery**: If status = 254 (PROCESSING), retry in next cycle
6. **Default Addresses**: Each EZO type has a factory default address:
   - PH: 0x63
   - EC: 0x64
   - DO: 0x61
   - RTD: 0x66

---

## Troubleshooting

### Sensor Not Responding
- Verify I2C address matches configuration
- Check I2C pull-up resistors (typically 4.7kΩ on SDA/SCL)
- Run `i2cscan` terminal command to enumerate devices
- Verify power supply voltage (typical: 3.3V or 5V)

### Reading Always Zero or Constant
- Check if sensor is properly calibrated
- Verify calibration formula in firmware
- Check Modbus register assignment

### Communication Timeout
- Increase `delayBeforeRead` value
- Check for I2C bus conflicts with other devices
- Verify baud rate/clock speed settings

---

## Integration Example

To add a new EZO sensor type, follow this pattern in your firmware:

```cpp
// 1. Add sensor preset (in applySensorPresets)
if (strcmp(configuredSensors[i].type, "EZO_EC") == 0) {
    if (configuredSensors[i].i2cAddress == 0) 
        configuredSensors[i].i2cAddress = 0x64;
    // ... set other defaults
}

// 2. Add parsing logic (in processI2CQueue)
if (strcmp(configuredSensors[op.sensorIndex].type, "EZO_EC") == 0) {
    configuredSensors[op.sensorIndex].rawValue = 
        atof(configuredSensors[op.sensorIndex].response);
    // ... apply calibration
}

// 3. Map to Modbus (in updateIOForClient)
// Already handled by generic loop

// 4. Expose via REST (in sendJSONSensorData)
// Already handled by generic loop
```
