# Modbus IO Module – Improvement Plan

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

---

This document is the authoritative improvement plan for linking the sensor config UI, dataflow display, and firmware/terminal logic. All future work should reference and update this plan as features are implemented or changed.
