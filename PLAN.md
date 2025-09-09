Of course. Implementing a web terminal and advanced analog calibration is a significant but very achievable project. Breaking it down into a clear, itemized task list is the best way to approach it.

Here is a phased plan, ordered to build features incrementally. This plan is designed to be followed within your Visual Studio Code and PlatformIO environment.

### High-Level Strategy

We will tackle this in two major phases. It's crucial to complete the analog calibration first, as it builds upon existing UI and firmware structures. The web terminal is a larger feature that requires adding real-time communication (WebSockets) and is best done second.

*   **Phase 1: Advanced Analog Input Calibration**
    *   First, implement simple linear calibration (multiplier and offset).
    *   Then, extend it to support non-linear polynomial equations.
*   **Phase 2: Web-based Peripheral Terminal**
    *   Add WebSocket support to both the firmware and the simulator.
    *   Build the terminal UI.
    *   Implement the command parser and handlers for I2C and SDI-12.

---

### Phase 1: Advanced Analog Input Calibration

#### **Part 1.1: Linear Calibration (Multiplier & Offset)**

**Goal:** Allow users to enter a multiplier and offset for each analog input to convert raw mV to a final unit (e.g., pressure, temperature).

**Firmware (`src/main.cpp`, `include/sys_init.h`)**

1.  **[Task 1] Update Data Structures:**
    *   **File:** `include/sys_init.h`
    *   **Action:** Modify the `Config` struct to store calibration settings for the three analog inputs. Add these new fields:
        ```cpp
        struct Config {
            // ... existing fields
            float aInMultiplier[3];
            float aInOffset[3];
        };

        // Also update DEFAULT_CONFIG
        const Config DEFAULT_CONFIG = {
            // ... existing fields
            {1.0, 1.0, 1.0}, // aInMultiplier
            {0.0, 0.0, 0.0}, // aInOffset
        };
        ```

2.  **[Task 2] Update Configuration Management:**
    *   **File:** `src/main.cpp`
    *   **Action:** Update `loadConfig()` and `saveConfig()` to handle the new `aInMultiplier` and `aInOffset` arrays. This involves serializing and deserializing them from `config.json`. Remember to handle the case where these fields might be missing from an older config file.

3.  **[Task 3] Create a New API Endpoint for Analog Config:**
    *   **File:** `src/main.cpp`
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