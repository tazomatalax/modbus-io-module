# Agent Implementation Guide

Quick-start reference for AI coding agents working on this embedded Modbus + web-configured IO & sensor gateway.

---

## Project Overview

**What this is:** Firmware for a Wiznet W5500-EVB-Pico (RP2040 + W5500 Ethernet) that provides:
- Modbus TCP server exposing digital/analog I/O and sensor data
- Web interface for configuration and real-time monitoring
- Multi-protocol sensor support (I2C, UART, OneWire, SPI, Analog)
- Automation rules engine for output control based on register conditions

**What this is NOT:**
- A simulator (that's in `/simulator` - UI testing only)
- A PLC replacement (no ladder logic, limited rule complexity)
- Cloud-connected (local network only)

---

## Architecture At-A-Glance

```
┌─────────────────────────────────────────────────────────────┐
│                      Web Browser                            │
│                    (index.html + script.js)                 │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP REST
┌─────────────────────▼───────────────────────────────────────┐
│                    RP2040 Firmware                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Web Server  │  │ Modbus TCP  │  │ Sensor Polling      │  │
│  │ (port 80)   │  │ (port 502)  │  │ (I2C/UART/OW/SPI)   │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                     │            │
│  ┌──────▼────────────────▼─────────────────────▼──────────┐ │
│  │              Shared State (ioStatus, ioConfig,         │ │
│  │              configuredSensors[], config)              │ │
│  └──────┬────────────────┬─────────────────────┬──────────┘ │
│         │                │                     │            │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌───────────▼─────────┐  │
│  │ LittleFS    │  │ GPIO/ADC    │  │ I2C Bus Manager     │  │
│  │ Persistence │  │ Hardware    │  │ (dynamic pin switch)│  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Files Reference

| File | Purpose | When to Modify |
|------|---------|----------------|
| `src/main.cpp` | All firmware logic (~7000+ lines) | Adding features, endpoints, sensors |
| `include/sys_init.h` | Structs, constants, pin definitions | Adding config fields, new data structures |
| `include/i2c_bus_manager.h` | I2C bus scheduling and pin switching | I2C protocol changes |
| `data/index.html` | Web UI structure | Adding UI sections |
| `data/script.js` | Web UI logic | Adding API calls, UI behavior |
| `data/styles.css` | Web UI styling | Visual changes |
| `data/config.json` | Default network config | Changing default IP/port |
| `data/sensors.json` | Default sensor config | Adding sensor presets |
| `data/io_config.json` | Default IO automation config | Adding default rules |
| `simulator/server.js` | UI development server | Mirroring new endpoints for UI testing |

---

## Data Structures

### Core Structs (in sys_init.h)

```cpp
struct Config {
    uint8_t ip[4], gateway[4], subnet[4];
    uint16_t modbusPort;
    char hostname[32];
    bool diPullup[8], diInvert[8], diLatch[8];
    bool doInvert[8], doInitialState[8];
    // ... network and IO behavior settings
};

struct IOStatus {
    bool dIn[8], dInRaw[8], dInLatched[8], dOut[8];
    uint16_t aIn[3];
    float rawValue[MAX_SENSORS], calibratedValue[MAX_SENSORS];
    // ... runtime IO state
};

struct SensorConfig {
    bool enabled;
    char name[32], type[16], protocol[16];
    uint8_t i2cAddress;
    int sdaPin, sclPin, modbusRegister;
    float calibrationOffset, calibrationSlope;
    char calibrationExpression[128];
    float rawValue, calibratedValue;
    int modbusValue;
    // ... sensor configuration and runtime values
};

struct IOPin {
    uint8_t gpPin;
    char label[32];
    bool isInput, pullup, invert, latched;
    uint16_t modbusRegister;
    IORule rules[5];
    uint8_t ruleCount;
    bool currentState, externallyLocked;
    // ... dynamic IO configuration
};
```

### Global State Variables

```cpp
Config config;                           // Network/IO behavior config
IOStatus ioStatus;                       // Runtime IO state
IOConfig ioConfig;                       // Dynamic IO pin configuration
SensorConfig configuredSensors[MAX_SENSORS];  // Sensor array
int numConfiguredSensors;                // Active sensor count
ModbusClientConnection modbusClients[MAX_MODBUS_CLIENTS];
int connectedClients;                    // Active Modbus clients
```

---

## Adding a New Sensor Type

### Step 1: Add Preset (if named sensor)

In `main.cpp` → `applySensorPresets()`:

```cpp
} else if (strcmp(configuredSensors[i].type, "NEW_SENSOR") == 0) {
    if (configuredSensors[i].i2cAddress == 0) configuredSensors[i].i2cAddress = 0xNN;
    if (strlen(configuredSensors[i].protocol) == 0) strcpy(configuredSensors[i].protocol, "I2C");
    if (configuredSensors[i].updateInterval == 0) configuredSensors[i].updateInterval = 1000;
    if (configuredSensors[i].modbusRegister == 0) configuredSensors[i].modbusRegister = NN;
}
```

### Step 2: Add Polling Handler

For I2C sensors using Adafruit/vendor library:

```cpp
void handleNEWSENSORSensors() {
    static unsigned long lastCheck = 0;
    if (millis() - lastCheck < 1000) return;  // Rate limit
    lastCheck = millis();
    
    for (int i = 0; i < numConfiguredSensors; i++) {
        if (!configuredSensors[i].enabled) continue;
        if (strcmp(configuredSensors[i].type, "NEW_SENSOR") != 0) continue;
        if (millis() - configuredSensors[i].lastReadTime < configuredSensors[i].updateInterval) continue;
        
        // Read sensor
        float value = readNewSensor(configuredSensors[i].i2cAddress);
        
        // Store values
        configuredSensors[i].rawValue = value;
        configuredSensors[i].calibratedValue = applyCalibration(value, configuredSensors[i]);
        configuredSensors[i].modbusValue = (int)(configuredSensors[i].calibratedValue * 100);
        configuredSensors[i].lastReadTime = millis();
    }
}
```

### Step 3: Call from Loop

In `main.cpp` → `loop()`:

```cpp
handleNEWSENSORSensors();  // Add alongside other sensor handlers
```

### Step 4: Update Modbus Register Map

Document in `CONTRIBUTING.md` Section 6 which register(s) the sensor uses.

---

## Adding a REST Endpoint

### GET Endpoint Pattern

```cpp
void handleGETNewEndpoint(WiFiClient& client) {
    StaticJsonDocument<1024> doc;
    doc["field1"] = value1;
    doc["field2"] = value2;
    
    String response;
    serializeJson(doc, response);
    sendJSON(client, response);
}
```

### POST Endpoint Pattern

```cpp
void handlePOSTNewEndpoint(WiFiClient& client, String body) {
    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, body);
    
    if (error) {
        client.println("HTTP/1.1 400 Bad Request");
        client.println("Content-Type: application/json");
        client.println("Connection: close");
        client.println();
        client.println("{\"success\":false,\"error\":\"Invalid JSON\"}");
        return;
    }
    
    // Process request
    String value = doc["field"] | "";
    
    // Send response
    client.println("HTTP/1.1 200 OK");
    client.println("Content-Type: application/json");
    client.println("Connection: close");
    client.println();
    client.println("{\"success\":true}");
}
```

### Register in Router

In `handleHTTPClient()` routing section:

```cpp
// GET routes
} else if (path == "/new/endpoint") {
    handleGETNewEndpoint(client);

// POST routes  
} else if (path == "/new/endpoint") {
    handlePOSTNewEndpoint(client, body);
```

### Mirror in Simulator (if UI uses it)

In `simulator/server.js`:

```javascript
// simulator-only: mirrors firmware shape
app.get('/new/endpoint', (req, res) => {
    res.json({ field1: 'simulated', field2: 123 });
});
```

---

## Modbus Register Conventions

| Type | Function Code | Address Range | Usage |
|------|---------------|---------------|-------|
| Discrete Inputs | FC2 | 0-7 | Digital input states |
| Coils | FC1/FC5 | 0-7 | Digital output control |
| Coils | FC5 | 100-107 | Latch reset commands |
| Input Registers | FC4 | 0-2 | Analog inputs (mV) |
| Input Registers | FC4 | 10-30 | Sensor values |
| Holding Registers | FC3/FC6 | 100+ | Output pin state monitoring |

### Writing to Modbus Registers

```cpp
// Write to all connected clients
for (int c = 0; c < MAX_MODBUS_CLIENTS; c++) {
    if (modbusClients[c].connected) {
        modbusClients[c].server.inputRegisterWrite(registerNum, value);
    }
}
```

---

## IO Automation Rules

### Rule Structure

```cpp
struct IORule {
    uint8_t id;
    bool enabled;
    char description[64];
    IOTrigger trigger;     // Conditions to evaluate
    IOAction action;       // What to do when triggered
    uint8_t priority;      // Lower = higher priority
};

struct IOTrigger {
    ConditionClause conditions[3];  // Up to 3 conditions
    uint8_t conditionCount;
    bool lastTriggeredState;        // Edge detection
};

struct ConditionClause {
    uint16_t modbusRegister;        // Register to monitor
    TriggerCondition condition;     // ==, !=, <, >, <=, >=
    int32_t triggerValue;           // Value to compare
    LogicOperator nextOperator;     // AND/OR to next condition
};
```

### Rule Evaluation Flow

1. `evaluateIOAutomationRules()` called from `loop()`
2. For each output pin with rules:
   - Skip if `externallyLocked` (Modbus override active)
   - Evaluate conditions against current Modbus register values
   - Execute action if conditions met (SET, TOGGLE, PULSE, FOLLOW)
3. Write resulting state to GPIO and Modbus register

---

## Quality Gates

Before submitting changes, verify:

| Gate | Check |
|------|-------|
| Build | `pio run` compiles without errors |
| Memory | Added globals don't exceed SRAM budget |
| Loop Timing | No blocking calls >10ms in main loop |
| REST Contract | New endpoints documented |
| Modbus | No register collisions with existing allocations |
| Simulator | Mirrored endpoints if UI depends on them |
| Logging | Serial output is concise, not spammy |
| JSON Size | `StaticJsonDocument` sized appropriately |

---

## Common Patterns

### Non-Blocking Sensor Read

```cpp
void handleSensor() {
    static unsigned long lastRead = 0;
    static enum { IDLE, WAITING, READ } state = IDLE;
    
    switch (state) {
        case IDLE:
            if (millis() - lastRead > POLL_INTERVAL) {
                sendReadCommand();
                state = WAITING;
                lastRead = millis();
            }
            break;
        case WAITING:
            if (millis() - lastRead > CONVERSION_TIME) {
                state = READ;
            }
            break;
        case READ:
            float value = readResult();
            processValue(value);
            state = IDLE;
            break;
    }
}
```

### I2C Pin Switching

```cpp
// Switch I2C bus to sensor's configured pins before communication
if (sensor.sdaPin != currentSDA || sensor.sclPin != currentSCL) {
    Wire.end();
    Wire.setSDA(sensor.sdaPin);
    Wire.setSCL(sensor.sclPin);
    Wire.begin();
    currentSDA = sensor.sdaPin;
    currentSCL = sensor.sclPin;
}
```

### Calibration Application

```cpp
float calibrated = applyCalibration(rawValue, sensor);
// Uses: slope * rawValue + offset
// Or: evaluates calibrationExpression if present
```

---

## File Locations Quick Reference

```
/                           Root
├── src/main.cpp            All firmware logic
├── include/
│   ├── sys_init.h          Structs, constants, pins
│   └── i2c_bus_manager.h   I2C scheduling
├── data/                   Web assets (uploaded via uploadfs)
│   ├── index.html          UI structure
│   ├── script.js           UI logic
│   ├── styles.css          UI styling
│   ├── config.json         Default network config
│   ├── sensors.json        Default sensor config
│   └── io_config.json      Default IO/rules config
├── simulator/              UI testing server (not for production)
├── docs/                   Technical documentation
├── archive/                Obsolete planning documents
├── CONTRIBUTING.md         Detailed development guide
├── ROADMAP.md              Feature planning
└── platformio.ini          Build configuration
```

---

## Reserved Resources

### Reserved GPIO Pins
- **GP16-21**: W5500 Ethernet (SPI) - DO NOT USE
- **GP22**: External LED - available for status indication
- **GP26-28**: ADC only (analog inputs)

### Reserved Memory
- **MAX_SENSORS**: 10 sensor slots
- **MAX_MODBUS_CLIENTS**: 4 concurrent connections
- **MAX_IO_PINS**: 16 configurable pins
- **MAX_IO_RULES**: 50 automation rules

---

## Debugging Tips

1. **Serial Monitor**: 115200 baud, shows boot sequence and runtime logs
2. **Terminal Commands**: Use web UI terminal for I2C/UART/OneWire diagnostics
3. **`/sensors/data`**: Returns all sensor raw/calibrated/modbus values
4. **`/iostatus`**: Returns complete IO state snapshot
5. **Modbus Poll**: Use external Modbus client to verify register values

---

## Don't

- ❌ Add blocking delays in `loop()` >10ms
- ❌ Use dynamic memory allocation in sensor polling paths
- ❌ Modify `DIGITAL_INPUTS[]` / `DIGITAL_OUTPUTS[]` arrays (legacy, being phased out)
- ❌ Add endpoints to simulator without implementing in firmware first
- ❌ Reuse Modbus registers without checking existing allocations
- ❌ Forget to call `rp2040.wdt_reset()` in long operations

## Do

- ✅ Use state machines for multi-step sensor operations
- ✅ Document new registers in CONTRIBUTING.md Section 6
- ✅ Mirror endpoints in simulator if UI depends on them
- ✅ Use `StaticJsonDocument` with appropriate sizing
- ✅ Apply calibration using existing helper functions
- ✅ Log errors concisely with sensor/pin identification

---

## Getting Help

- **Architecture**: See `docs/architecture/system-overview.md`
- **REST API**: See CONTRIBUTING.md Section 5
- **Modbus Registers**: See CONTRIBUTING.md Section 6
- **Sensor Integration**: See CONTRIBUTING.md Section 4
- **Hardware Pinout**: See `docs/hardware/pinout-and-interfaces.md`
