Modbus IO Module — PC Simulator

What this gives you
- Serves the existing web UI (from ../data) so you can click through the app in a browser
- Implements the device REST API on your PC: /config, /iostatus, /ioconfig, /setoutput, /reset-latches, /reset-latch
- Simulates digital inputs (with optional latching/inversion), digital outputs, analog inputs, and I2C-like temperature/humidity
- Provides a functional Modbus TCP server on the configured port (default 502) so a Modbus master can read the same data as the UI
- Dev convenience: auto-reload with nodemon, and a contract-check endpoint to alert when the UI expects sensors the simulator doesn’t expose

Prereqs
- Node.js 18+ installed (Check: node -v)

Quick start (Windows PowerShell)
1) Install dependencies
   - From the workspace root:
  npm install --prefix ./simulator

2) Start the simulator
   - From the workspace root:
     npm run start --prefix ./simulator

Dev mode (auto-reload)
- From the workspace root:
  - npm run dev --prefix ./simulator
  - This watches simulator/server.js and the ../data folder (html/css/js). The server restarts or static UI reloads on changes.

3) Open the web UI
   - Browser: http://localhost:8080

Endpoints implemented
- GET  /config         -> returns network + UI info
- POST /config         -> accepts DHCP, IP, subnet, gateway, hostname, modbus_port; replies {success:true, ip:"x.x.x.x"}
- GET  /iostatus       -> returns di/di_raw/di_latched/do/ai and i2c_sensors
- POST /setoutput      -> x-www-form-urlencoded: output=N&state=0|1
- GET  /ioconfig       -> returns DI/DO config arrays
- POST /ioconfig       -> accepts arrays: di_pullup, di_invert, di_latch, do_invert, do_initial_state
- POST /reset-latches  -> clears all DI latches
- POST /reset-latch    -> JSON { input: index }

Contract and health
- GET  /__contract      -> Shows what i2c sensor keys the UI references vs. what the simulator provides.
  - If the UI is updated to add/remove sensors (e.g., adds pressure), the simulator logs a contract warning on startup and this endpoint will list any mismatches.

Simulation control endpoints (to drive tests)
- GET  /simulate/sensors           -> { mode, temperature, humidity, pressure }
- POST /simulate/sensors           -> JSON { mode: 'auto'|'manual', temperature, humidity, pressure }
- GET  /simulate/di                -> { mode, dInRaw, dIn, dInLatched }
- POST /simulate/di                -> JSON { mode: 'auto'|'manual', index, value }
- GET  /simulate/ai                -> { ai: [mV0, mV1, mV2] }
- POST /simulate/ai                -> JSON { ai: [mV0, mV1, mV2] }

Sim Controls (what to change during tests)
- I2C sensors: use /simulate/sensors to switch between auto and manual and to set specific values (temperature, humidity, pressure)
- Digital inputs: use /simulate/di to set raw DI states in manual mode; latching/inversion rules are applied automatically
- Analog inputs: use /simulate/ai to set millivolts for AI1–AI3
- Digital outputs: click in the UI or POST /setoutput output=N&state=0|1

Notes
- Modbus TCP is implemented for the most relevant function codes to mirror firmware:
  - FC 01 Read Coils:       0–7 -> digital outputs; 100–107 -> read 0 (reserved for latch reset)
  - FC 02 Read Discrete Inputs: 0–7 -> digital inputs (after inversion/latch handling)
  - FC 04 Read Input Registers:
    0–2 -> analog inputs in mV
    3   -> temperature x100 (e.g., 2550 = 25.50°C)
    4   -> humidity x100   (e.g., 6050 = 60.50%)
  - FC 05 Write Single Coil:
    0–7     -> set digital outputs (logical)
    100–107 -> reset latched input (write ON to reset)
- The simulator uses port 8080 for HTTP by default. Change with env var HTTP_PORT.
- Connect to the device using https://peakeinnovation.com/modbus-toolbox.html to read and write values over modbus TCP
  - This tool supports Modbus TCP and RTU, master and slave modes, and can read coils (FC01), discrete inputs (FC02), input registers (FC04), and write single coil (FC05). For this simulator use TCP Master mode and connect to host: localhost, port: 502.
  - Example reads:
    - Coils 0–7 for digital outputs; Discrete Inputs 0–7 for digital inputs; Input Registers 0–2 for analog inputs (mV), 3 for temperature×100, 4 for humidity×100. Write Single Coil 0–7 to set outputs; 100–107 to reset DI latches.
  - Project and downloads: https://github.com/PeakeElectronicInnovation/ModbusTerm

Troubleshooting
- Ports in use? Pick a new HTTP_PORT or modbus_port in the UI.
- UI not loading? Ensure you started from the project root and that ../data exists.
- Modbus 502 already in use? The simulator will log a warning and set modbus_server_error in /config; change modbus_port in the UI and Save.

How to test I2C sensor data flow end-to-end
1) Start the simulator and open the UI (see Quick start above)
2) Set sensors to manual values (PowerShell examples):
  - Force specific sensor readings:
    Invoke-RestMethod -Method Post -ContentType 'application/json' -Uri http://localhost:8080/simulate/sensors -Body '{"mode":"manual","temperature":25.50,"humidity":60.25}'
3) Verify in the browser UI
  - The I2C Sensors section should show Temperature 25.50 °C and Humidity 60.25 %
4) Verify via Modbus master (TCP to localhost:502)
  - Read Input Registers starting at 3, quantity 2
  - Expect: Reg3 = 2550 (25.50°C), Reg4 = 6025 (60.25%)
5) Switch back to automatic trends (optional):
  Invoke-RestMethod -Method Post -ContentType 'application/json' -Uri http://localhost:8080/simulate/sensors -Body '{"mode":"auto"}'

Contract alerting (keeping UI and simulator in sync)
- On startup the simulator scans data/script.js for references like i2c_sensors.<key> and compares them with the simulator’s available sensors.
- If there are keys used by the UI that the simulator doesn’t provide, a console warning is printed and GET /__contract lists them under missing_in_server.
- If you add a new sensor to the UI, either use /simulate/sensors (manual mode) to provide values or extend the simulator to include the new sensor in server.js (state.io and serverSensorKeys).
