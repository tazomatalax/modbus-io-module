# Modbus IO Module - Advanced Sensor Functionality Restoration Plan

## Overview
Based on analysis of the current codebase and documentation, this plan restores and enhances the advanced sensor functionality that was partially implemented but commented out during recent fixes. The system previously supported formula-based calibration, multiple sensor types, and terminal commands as evidenced by existing includes, commented code, and changelog entries.

## Current Status Analysis
- ✅ **Web server functioning** - Fixed port conflicts, filesystem uploaded
- ✅ **Basic structure exists** - SensorConfig struct, API endpoints, HTML templates present
- ❌ **Sensor functionality disabled** - Functions commented out for stability during network fixes
- ❌ **Formula parser available** - config/formula_parser.h exists but not integrated
- ❌ **Terminal not active** - HTML/CSS exists but backend commands missing

---

## Phase 1: Restore Generic Sensor Types & Configuration

### Objective 1.1: Enhance SensorConfig Structure
**Goal**: Update sensor configuration to support multiple sensor types with pin assignments

**Tasks**:
1. **[Backend]** Update `SensorConfig` struct in `include/sys_init.h`:
   ```cpp
   struct SensorConfig {
       bool enabled;
       char name[32];
       char sensor_type[16];     // "I2C", "UART", "Digital", "Analog", "OneWire"
       char formula[64];         // Mathematical conversion formula  
       char units[16];           // Engineering units (°C, %, psi, etc.)
       uint8_t pin_assignment;   // GPIO pin number for sensor
       uint8_t i2cAddress;       // For I2C sensors
       int modbusRegister;       // Target Modbus register
       float calibrationOffset;
       float calibrationSlope;
       // EZO sensor state tracking
       bool cmdPending;
       unsigned long lastCmdSent;
       char response[64];
       char calibrationData[256];
   };
   ```

2. **[Backend]** Uncomment and enhance sensor configuration functions in `src/main.cpp`:
   - `loadSensorConfig()` - Parse sensor types and pin assignments
   - `saveSensorConfig()` - Save enhanced configuration
   - `handlePOSTSensorConfig()` - Process web form submissions

3. **[Frontend]** Enhance sensor configuration modal in `data/index.html`:
   - Add sensor type dropdown: I2C, UART/RS485, Digital, Analog, OneWire
   - Add pin assignment selector (GPIO pins 0-29)
   - Add formula input field
   - Add engineering units field
   - Maintain existing fields (name, address, Modbus register)

### Objective 1.2: Integrate Formula Parser
**Goal**: Activate mathematical formula conversion for sensor readings

**Tasks**:
1. **[Backend]** Uncomment `#include "../config/formula_parser.h"` in `src/main.cpp`
2. **[Backend]** Integrate `applyFormula()` function into sensor reading pipeline
3. **[Backend]** Update `updateIOpins()` to apply formulas to raw sensor values
4. **[Frontend]** Add formula examples and validation in web interface

### Objective 1.3: Implement Pin Assignment Logic
**Goal**: Map configured sensors to actual GPIO pins based on sensor type

**Tasks**:
1. **[Backend]** Create pin assignment validation:
   - I2C sensors: Validate I2C address (0x03-0x77)
   - Analog sensors: GPIO 26-28 (ADC pins)
   - Digital sensors: GPIO 0-15 (configurable as input/output)
   - UART sensors: GPIO 16-17 (UART1) or 0-1 (UART0)
   - OneWire sensors: Any GPIO pin

2. **[Backend]** Update sensor initialization based on type:
   - I2C: Initialize I2C bus, probe address
   - Analog: Configure ADC channel
   - Digital: Set pinMode (INPUT/OUTPUT)
   - UART: Initialize UART with appropriate baud rate

---

## Phase 2: Restore Sensor Data Flow Display

### Objective 2.1: Raw Sensor Output Display
**Goal**: Show real-time raw sensor values before calibration

**Tasks**:
1. **[Backend]** Update `/iostatus` endpoint to include raw values:
   ```json
   {
     "sensors": [
       {
         "id": 0,
         "name": "Temperature",
         "type": "I2C",
         "pin": 4,
         "raw_value": 1650,
         "converted_value": 25.2,
         "units": "°C",
         "formula": "(x - 273.15)",
         "status": "active"
       }
     ]
   }
   ```

2. **[Frontend]** Update sensor data flow containers in `data/index.html`:
   - Display raw sensor readings
   - Group by sensor type (I2C, UART, Analog, OneWire)
   - Real-time updates via JavaScript polling

### Objective 2.2: Calibration Modal & Data Flow Arrows
**Goal**: Visual representation of raw → calibrated data transformation

**Tasks**:
1. **[Frontend]** Create calibration modal:
   - Show raw value input
   - Display formula being applied
   - Show calculated result
   - Allow formula editing and testing
   - Simple multiplier/offset mode for basic sensors

2. **[Frontend]** Add data flow visualization:
   - Raw sensor box → Arrow → Calibration modal → Engineering units box
   - Color coding for sensor types
   - Status indicators (active/error/disabled)

3. **[Backend]** Add calibration testing endpoint `/api/sensor/test-calibration`:
   - Accept formula and test value
   - Return calculated result
   - Validate formula syntax

### Objective 2.3: Engineering Units Display
**Goal**: Show converted values with proper units throughout interface

**Tasks**:
1. **[Frontend]** Update sensor table to show both raw and converted values
2. **[Frontend]** Add units column to sensor display
3. **[Backend]** Ensure units are included in all sensor data responses

---

## Phase 3: Restore Terminal Functionality

### Objective 3.1: Backend Terminal Command Processing
**Goal**: Implement sensor query commands as per TERMINAL_GUIDE.md

**Tasks**:
1. **[Backend]** Uncomment and enhance `handlePOSTTerminalCommand()` in `src/main.cpp`

2. **[Backend]** Implement sensor commands:
   ```cpp
   // Sensor Commands
   if (cmd.startsWith("sensor list")) {
       // List all configured sensors with ID, name, type, status
   }
   if (cmd.startsWith("sensor read ")) {
       // Read specific sensor by ID: "sensor read 0"
   }
   if (cmd.startsWith("sensor info ")) {
       // Show detailed info: type, pin, formula, units
   }
   if (cmd.startsWith("sensor test ")) {
       // Test sensor connectivity and readings
   }
   ```

3. **[Backend]** Implement I/O commands:
   ```cpp
   // Digital I/O Commands  
   if (cmd.startsWith("di read ")) {
       // Read digital input: "di read 0"
   }
   if (cmd.startsWith("do write ")) {
       // Write digital output: "do write 0 HIGH"
   }
   if (cmd.startsWith("ai read ")) {
       // Read analog input: "ai read 0"
   }
   ```

4. **[Backend]** Implement network commands:
   ```cpp
   // Network Commands
   if (cmd == "ipconfig") {
       // Show IP, subnet, gateway, MAC
   }
   if (cmd.startsWith("ping ")) {
       // Ping target IP (simple connectivity test)
   }
   ```

### Objective 3.2: Frontend Terminal Interface
**Goal**: Activate the terminal UI that exists in the HTML

**Tasks**:
1. **[Frontend]** Ensure terminal section is visible and functional in `data/index.html`
2. **[Frontend]** Connect terminal input to backend via `/terminal/command` endpoint
3. **[Frontend]** Add command history and autocomplete for sensor IDs
4. **[Frontend]** Style terminal output with proper formatting and colors

### Objective 3.3: Terminal Command Documentation
**Goal**: Implement all commands specified in TERMINAL_GUIDE.md

**Tasks**:
1. **[Backend]** Add help command showing available commands
2. **[Backend]** Add tab completion support for sensor names/IDs
3. **[Backend]** Add watch mode for continuous monitoring
4. **[Frontend]** Add command examples and help tooltips

---

## Phase 4: Integration & Testing

### Objective 4.1: End-to-End Sensor Workflow
**Goal**: Complete sensor configuration → data collection → display pipeline

**Tasks**:
1. **[Integration]** Test complete workflow:
   - Configure sensor via web interface
   - Save configuration and reboot
   - Verify sensor appears in data flow
   - Test terminal commands
   - Validate Modbus register mapping

2. **[Testing]** Validate each sensor type:
   - I2C: BME280, VL53L1X simulation
   - Analog: voltage divider sensors
   - Digital: switch/relay sensors
   - UART: simulated RS485 sensor

### Objective 4.2: Error Handling & Validation
**Goal**: Robust error handling for sensor operations

**Tasks**:
1. **[Backend]** Add sensor health monitoring
2. **[Backend]** Handle sensor communication failures gracefully
3. **[Frontend]** Display sensor error states in UI
4. **[Backend]** Log sensor errors for debugging

### Objective 4.3: Documentation & Examples
**Goal**: Complete documentation for restored functionality

**Tasks**:
1. **[Documentation]** Update TERMINAL_GUIDE.md with implemented commands
2. **[Documentation]** Create sensor configuration examples
3. **[Documentation]** Update README with new capabilities
4. **[Documentation]** Formula examples and syntax reference

---

## Implementation Priority

### High Priority (Immediate)
1. ✅ **Phase 1.1 & 1.2**: Restore basic sensor configuration and formula parser
2. ✅ **Phase 2.1**: Raw sensor data display
3. ✅ **Phase 3.1**: Basic terminal commands

### Medium Priority (Next)
4. **Phase 2.2**: Calibration modal and data flow visualization
5. **Phase 3.2**: Enhanced terminal interface
6. **Phase 1.3**: Advanced pin assignment logic

### Lower Priority (Future)
7. **Phase 4**: Full integration testing and documentation
8. **Advanced Features**: Real-time graphing, data logging, alert systems

---

## Success Criteria

- [ ] Sensor configuration modal allows selecting type and pin assignment
- [ ] Formula-based calibration converts raw values to engineering units
- [ ] Terminal commands can query and control all configured sensors
- [ ] Data flow visualization shows raw → calibrated → units transformation
- [ ] All sensor types (I2C, UART, Digital, Analog, OneWire) are supported
- [ ] Modbus registers correctly expose calibrated sensor values
- [ ] System maintains backward compatibility with existing configurations

## Memory & Performance Considerations

- Current usage: 29.8% RAM, 14.4% Flash
- Sensor functions should not exceed 5% additional RAM usage
- Formula parser must be efficient for real-time operations
- Terminal commands should respond within 100ms
- Sensor polling should not interfere with Modbus response times
    *   **Action:** Create two new handler functions, `handleGetAnalogConfig` and `handleSetAnalogConfig`, and register them in `setupWebServer()`.
        *   `handleGetAnalogConfig` (GET `/analogconfig`): Responds with a JSON object containing the `aInMultiplier` and `aInOffset` arrays from the `config`.
        *   `handleSetAnalogConfig` (POST `/analogconfig`): Receives a JSON object with the new multiplier/offset values and saves them using `saveConfig()`.

4.  **[Task 4] Apply Calibration Logic:**
    *   **File:** `src/main.cpp`
    *   **Action:** In the `updateIOpins()` function, after you read the raw analog values into `ioStatus.aIn`, apply the calibration formula before the values are used elsewhere. You'll need a new array in `IOStatus` to hold the calibrated values.
        ```cpp
        // In sys_init.h, add to IOStatus:
        float aInCalibrated[3];

        // In main.cpp, inside updateIOpins():
        for (int i = 0; i < 3; i++) {
            // ioStatus.aIn[i] is the raw mV value
            ioStatus.aInCalibrated[i] = (ioStatus.aIn[i] * config.aInMultiplier[i]) + config.aInOffset[i];
        }
        // Then, ensure the web UI and Modbus use aInCalibrated where appropriate.
        ```

**Web UI (`data/`)**

5.  **[Task 5] Add Analog Configuration UI:**
    *   **File:** `data/index.html`
    *   **Action:** Add a new card titled "Analog Input Configuration". Inside, create a table with rows for AI1, AI2, and AI3, and columns for "Multiplier" and "Offset", each with an `<input type="number">`. Add a "Save Analog Configuration" button.

6.  **[Task 6] Implement Frontend Logic:**
    *   **File:** `data/script.js`
    *   **Action:**
        *   Create a `loadAnalogConfig()` function that fetches from `/analogconfig` and populates the input fields.
        *   Create a `saveAnalogConfig()` function that reads the values from the inputs, POSTs them to `/analogconfig`, and shows a success/error toast.
        *   Call `loadAnalogConfig()` on page load.

**Simulator (`simulator/server.js`)**

7.  **[Task 7] Mock the New Endpoints:**
    *   **File:** `simulator/server.js`
    *   **Action:**
        *   Add GET `/analogconfig` and POST `/analogconfig` handlers. The simulator should store these settings in its `state` object.
        *   Modify the `/iostatus` endpoint to return both raw and calibrated analog values, applying the stored multiplier/offset to the simulated data.

#### **Part 1.2: Non-Linear (Polynomial) Calibration**

**Goal:** Extend the linear calibration to support polynomial equations (e.g., `y = ax^2 + bx + c`).

**Firmware (`src/main.cpp`, `include/sys_init.h`)**

8.  **[Task 8] Enhance Data Structures:**
    *   **File:** `include/sys_init.h`
    *   **Action:** Update the `Config` struct to store polynomial coefficients. A 2D array is a good choice.
        ```cpp
        struct Config {
            // ... existing fields
            // For a 2nd order polynomial (ax^2 + bx + c), we need 3 coefficients.
            float aInCoefficients[3][3]; // [input_index][coefficient_index]
            char aInEqType[3]; // 'L' for Linear, 'P' for Polynomial
        };
        ```

9.  **[Task 9] Update API Endpoint:**
    *   **File:** `src/main.cpp`
    *   **Action:** Modify `handleGetAnalogConfig` and `handleSetAnalogConfig` to handle the new equation type and coefficient fields.

10. **[Task 10] Implement Polynomial Evaluation:**
    *   **File:** `src/main.cpp`
    *   **Action:** Update the calibration logic in `updateIOpins()`. It should now check `config.aInEqType` and apply either the linear or polynomial formula.
        ```cpp
        // In updateIOpins()
        for (int i = 0; i < 3; i++) {
            float x = ioStatus.aIn[i]; // raw mV
            if (config.aInEqType[i] == 'P') {
                float a = config.aInCoefficients[i][0];
                float b = config.aInCoefficients[i][1];
                float c = config.aInCoefficients[i][2];
                ioStatus.aInCalibrated[i] = (a * x * x) + (b * x) + c;
            } else { // Linear
                ioStatus.aInCalibrated[i] = (x * config.aInMultiplier[i]) + config.aInOffset[i];
            }
        }
        ```

**Web UI (`data/`) & Simulator (`simulator/server.js`)**

11. **[Task 11] Update UI and Simulator:**
    *   **File:** `data/index.html`, `data/script.js`, `simulator/server.js`
    *   **Action:** Update the "Analog Input Configuration" UI to include a dropdown to select "Linear" or "Polynomial". The input fields should dynamically change based on the selection. Update the JavaScript and simulator to match.

---

### Phase 2: Web-based Peripheral Terminal

**Goal:** Create a terminal in the UI to send commands and see replies from peripherals connected to the device.

**Firmware (`platformio.ini`, `src/main.cpp`)**

12. **[Task 12] Add WebSocket Library:**
    *   **File:** `platformio.ini`
    *   **Action:** Add a WebSocket server library compatible with the RP2040. A common choice is `links2004/WebSockets`.
        ```ini
        lib_deps =
            ... existing libraries ...
            links2004/WebSockets
        ```

13. **[Task 13] Initialize WebSocket Server:**
    *   **File:** `src/main.cpp`
    *   **Action:** Include the WebSocket header. In `setup()`, create a `WebSocketsServer` object and begin listening on a port (e.g., 81). Set up an event handler function.
        ```cpp
        #include <WebSocketsServer.h>
        WebSocketsServer webSocket = WebSocketsServer(81);

        void webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length);

        void setup() {
            // ... after network setup ...
            webSocket.begin();
            webSocket.onEvent(webSocketEvent);
        }
        ```

14. **[Task 14] Handle WebSocket Events and Commands:**
    *   **File:** `src/main.cpp`
    *   **Action:**
        *   In `loop()`, add `webSocket.loop();`.
        *   Implement the `webSocketEvent` function. It will handle connections, disconnections, and text messages.
        *   Inside the `WStype_TEXT` case, you will parse the incoming `payload`. This is your command parser.
        *   Start with simple commands like `help` or `i2cscan`. For `i2cscan`, you'll write code to scan the I2C bus and send the results back to the client using `webSocket.sendTXT()`.

15. **[Task 15] Integrate Peripheral Drivers (SDI-12):**
    *   **File:** `platformio.ini`, `src/main.cpp`
    *   **Action:**
        *   Add an SDI-12 library to `platformio.ini` (e.g., `EnviroDIY/Arduino-SDI-12`).
        *   In your command parser, add a case for SDI-12 commands. The command handler will then call the SDI-12 library functions and send the output back over the WebSocket.

**Web UI (`data/`)**

16. **[Task 16] Create Terminal UI:**
    *   **File:** `data/index.html`
    *   **Action:** Add a new card for the "Terminal". It should contain a `<div>` or `<pre>` for output and an `<input type="text">` for command entry, plus a "Send" button.

17. **[Task 17] Implement Terminal Frontend Logic:**
    *   **File:** `data/script.js`
    *   **Action:**
        *   On page load, establish a WebSocket connection to the device (`ws = new WebSocket('ws://' + window.location.host + ':81/');`).
        *   Implement `ws.onopen`, `ws.onclose`, and `ws.onerror` to show connection status in the terminal.
        *   Implement `ws.onmessage`. When a message is received, append its content to the terminal output `<div>`.
        *   Add a function to send commands. It should read the input field's value and send it using `ws.send()`. Also, hook this to the "Enter" key on the input field.

**Simulator (`simulator/package.json`, `simulator/server.js`)**

18. **[Task 18] Add WebSocket Support to Simulator:**
    *   **File:** `simulator/package.json`
    *   **Action:** Add the `ws` library: `npm install ws`.
    *   **File:** `simulator/server.js`
    *   **Action:** Require the `ws` library and create a WebSocket server alongside the Express app.

19. **[Task 19] Mock Terminal Commands:**
    *   **File:** `simulator/server.js`
    *   **Action:** In the simulator's WebSocket server logic, listen for incoming messages. Implement handlers for commands like `help`, `i2cscan`, etc., that return hardcoded, realistic-looking responses. This allows you to develop and test the UI without needing the firmware to be complete.

This itemized list provides a clear path from your current state to the desired functionality, ensuring that you build upon a solid foundation at each step.