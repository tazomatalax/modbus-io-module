# Modbus IO Module – Improvement Plan

_Last updated: 2025-10-06_

## 2025-10-06 - Web UI and Firmware Alignment Analysis

Analysis of current implementation reveals gaps between web UI capabilities and firmware implementation that need to be addressed:

### Current Status Assessment

1. **Generic Sensor Configuration**
   - ✅ UI: Supports protocol selection (I2C, UART, One-Wire, Analog)
   - ✅ UI: Allows custom polling intervals per bus
   - ❌ Firmware: Missing dynamic command execution for generic sensors
   - ❌ Firmware: Bus-level polling frequencies not fully implemented

2. **Named Sensor Support**
   - ✅ UI: Can select predefined sensor types
   - ⚠️ Firmware: Partially implemented (DS18B20, EZO-PH, EZO-EC, SHT30)
   - ❌ Firmware: Missing systematic approach for named sensor abstraction

3. **Bus Management**
   - ✅ UI: Configurable bus parameters (I2C address, UART baud rate, etc.)
   - ⚠️ Firmware: Basic I2C and One-Wire support exists
   - ❌ Firmware: Missing bus conflict prevention and sequencing

### Implementation Plan

#### Phase 1: Dynamic Command System
1. Create command queue per bus type
2. Implement configurable polling frequencies
3. Add protocol-specific command formatting
4. Integrate with existing sensor configuration

#### Phase 2: Named Sensor Framework
1. Create sensor type registry
2. Define standard sensor interfaces
3. Implement automatic initialization
4. Add named sensor abstraction layer

#### Phase 3: Bus Management System
1. Implement bus scheduling
2. Add conflict prevention
3. Support non-blocking operations
4. Integrate with command system

## 2025-10-06 - Earlier Identified Improvements

During initial testing of sensor configuration through the web UI, several areas for improvement were identified:

### 1. Bus/Pin Polling Frequency Management
- Need to implement polling frequency configuration at the bus/pin level
- Individual sensor measurement commands for generic I2C and OneWire sensors
- Strategy for avoiding timing conflicts on shared buses

### 2. Bus Conflict Prevention Strategy
#### A. Strict Bus Sequencing
- **1-Wire Protocol**:
  - Implement proper bus reset sequence (0xF0)
  - Use MATCH ROM (0x55) + 64-bit serial for specific devices
  - Use SKIP ROM (0xCC) + CONVERT T (0x44) for simultaneous polling
- **I2C Protocol**:
  - Address conflict management
  - Support for TCA9548A multiplexer
  - Sequential device addressing with response waiting
- **UART Protocol**:
  - Separate TX/RX pin management
  - Hardware/software UART multiplexer support

#### B. Non-blocking Sensor Management
Implement asynchronous polling approach:
1. Request: Send measurement initiation command
2. Wait: Non-blocking wait while polling other sensors
3. Read: Get results on subsequent polling loop pass

#### C. Fault Tolerance
- Data validation before calibration
- CRC checking for 1-Wire
- I2C bus recovery routine
- Sensor timeout implementation

### 3. Terminal Enhancements
- Add live command/response watching in web UI terminal
- Show sensor communication sequence in real-time
- Implement "Send to Config" button functionality
- Add digital pin state scanning (pulled up/latched)
- Add pin state display in terminal dropdowns

### 4. Data Extraction Process
- Fix data byte and checksum byte identification
- Improve terminal-to-config data string transfer
- Enhance data parsing configuration modal
- Add checksum validation in parsing process

### 5. Digital Pin Management
- Add comprehensive pin state scanning
- Show pin states in terminal dropdowns
- Match functionality to I2C pin scanning interface

_Last updated: 2025-09-24_
existing features of the web ui to keep:
- header showing modbus client status.
-network configuration section
-IO status section containing the sensor dataflow(sensor dataflow to be improved as per plan)
-IO configuration that allows basic modbus latch functions
-sensor configuration section with a table showing sensors configured and settings(including the pins the sensors are added on). This section has an add sensor button that allows adding sensors by first specifying the protocol type then adding a sensor type from a sensor type dropdown with a list of hardcoded sensors (aranged by protocol) and an option to add a generic sensor of any protocol type.
-terminal interface that allows watching traffic on any ports and pins of the wiznet w5500 and also allows sending comands as per the terminal_guide.md to the various sensor types

Improvements needed

## 1. Sensor configuration/Add Sensor Modal
  - The dropdown is dynamically populated with sensor types relevant to the selected protocol.This includes any sensors that are hard coded. hard coded sensors that are activated by this process can still have the pin assignments eddited in the pin assignment drop down.
  - When a protocol is selected, the pin selection dropdown appears with only the currently available pins for that protocol at that time. ie it looks in the firmaware to see the sensors condigured and gives a list of pins available to which sensors of that protocol can be assigned. Need to take into account the pinout of the wiznet w5500.
  -
  - When I2C is selected, a field for entering/selecting the I2C address appears.
  - The field is inactive for all other protocols.

## Web UI and Firmware Integration

### Pin Assignment Logic (UI & Firmware)

The UI logic now uses the actual board pin lists for each protocol type, matching your hardware. The dynamic list of available pins is kept in the JavaScript variable `availablePins`, which is initialized from `boardPins` at page load and updated as sensors are assigned or released. This ensures that only valid, unallocated pins are shown for each sensor type and protocol, and prevents double-assignment or conflicts.

If you encounter a duplicate `protocolTypes` declaration in your code, remove any extra `const protocolTypes = ...` to resolve this error and ensure the dropdowns work correctly.

This approach keeps the UI and firmware tightly linked and makes future reference and troubleshooting easier.
### 2. Dataflow Display
- **Raw Data**: Shows live values from the assigned pins for each sensor.
- **Calibration Pane**: Shows/edits calibration math and, for digital sensors, data extraction logic. This allows any output from any sensor type to be converted to engineering units that reflect the real world state.
- **Calibrated Value**: Shows the calibrated value that results from the calibration pane displayed in the Modbus register it is sent to.

### 3. Terminal/Firmware Link
functionality to watch data transmission on selected pins and ports is available for fault finding sensor connections and address faults etc. protocol and pins are selected for querry and either the watch button can be pressed or commands specific to the sensor type; as per the TERMINAL_GUIDE.md can be issued to the various sensors.

### 4. Code Linkage Checklist
-The different sections of the web ui need to dynamically update according to the sensors configured as do the pin assignments in the firmware. 

---### 
The current frontend logic matches the intended workflow:

Clicking "Add Sensor" opens the modal and does not push anything to the firmware.
Filling out the modal and clicking "Add" adds the sensor to the local sensorConfigData array and updates the table in the UI only.
The firmware is not updated until the user clicks "Save & Reboot", which calls saveSensorConfig(). This function POSTs the entire sensor array to /sensors/config on the firmware.
The pin assignment dropdowns are populated by calling /available-pins?protocol=... when the protocol is selected, which is correct.

Summary of the process:

"Add Sensor" → opens modal, no firmware call.
Fill out modal, click "Add" → updates local array and table, no firmware call.
"Save & Reboot" → POSTs all sensor config to firmware.
If you are seeing any firmware calls before "Save & Reboot", or if the UI is not behaving as described, there may be a bug in the event handling or a stray call to saveSensorConfig().

If you want to further improve or debug:

Make sure no other code is calling saveSensorConfig() except the "Save & Reboot" button.
Confirm that the pin dropdowns are always populated from /available-pins and not from stale or hardcoded data.

This document is the authoritative improvement plan for linking the sensor config UI, dataflow display, and firmware/terminal logic. All future work should reference and update this plan as features are implemented or changed.
