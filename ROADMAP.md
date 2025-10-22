# Modbus IO Module – Project Roadmap

_Last updated: October 2025_

## Executive Summary

This roadmap outlines the strategic direction for the Modbus IO Module project. It represents a consolidation of the Advanced Sensor Restoration Plan and the UI-Firmware Integration Analysis, establishing clear phases and priorities for bringing the system to production readiness.

---

## Vision

Deliver a flexible, web-configured Ethernet-based Modbus TCP IO module that:
- Exposes stable Modbus + HTTP REST interfaces
- Enables rapid integration of multiple sensor types (I2C, UART, OneWire, Analog, Digital)
- Provides a modern, intuitive web UI for configuration and real-time monitoring
- Maintains deterministic resource usage on the RP2040 microcontroller
- Supports formula-based calibration with engineering unit conversion
- Includes diagnostic terminal for advanced troubleshooting

---

## Current Status

### ✅ Implemented & Stable
- Web server with filesystem persistence
- Basic IO configuration (digital I/O, analog inputs with ADC)
- Core Modbus TCP server functionality
- Network configuration (DHCP + static IP fallback)
- Web UI framework and responsive design
- Latch management for digital inputs
- Per-client Modbus register synchronization
- LittleFS-based configuration persistence

### ⚠️ Partially Implemented
- Sensor configuration infrastructure (data structures exist, some functions commented)
- Formula parser library (available but not integrated)
- EZO sensor support (basic structure, needs calibration enhancement)
- Terminal UI components (HTML/CSS exists, backend commands missing)

### ❌ Not Yet Implemented
- Generic sensor type framework (I2C, UART, OneWire, Analog, Digital abstraction)
- Dynamic command system for peripheral communication
- Bus conflict prevention and scheduling
- Web-based terminal with WebSocket communication
- Comprehensive error handling and diagnostics
- Full sensor type registry with named sensor abstraction
- Real-time data flow visualization

---

## Phase 1: Restore Core Sensor Functionality (Immediate Priority)

**Goal:** Establish stable, configurable sensor infrastructure that bridges UI and firmware.

### 1.1 Activate Generic Sensor Configuration
- [ ] Uncomment and enhance `loadSensorConfig()` and `saveSensorConfig()` in firmware
- [ ] Update `SensorConfig` struct to support all planned sensor types
- [ ] Implement sensor type validation and defaults
- [ ] Add sensor initialization logic for each protocol type
- [ ] Update REST API to expose current sensor configuration

### 1.2 Integrate Formula-Based Calibration
- [ ] Uncomment formula parser header and validation functions
- [ ] Implement calibration application in sensor reading pipeline
- [ ] Add calibration testing endpoint for UI validation
- [ ] Support both linear (multiplier + offset) and polynomial (ax² + bx + c) equations
- [ ] Expose engineering units throughout REST API and Modbus

### 1.3 Implement Pin Assignment Logic
- [ ] Create hardware-specific pin mapping for W5500-EVB-Pico
- [ ] Validate pin assignments per protocol (I2C: 0x03-0x77, Analog: GPIO 26-28, etc.)
- [ ] Prevent pin conflicts and double-assignment
- [ ] Expose available pins via `/available-pins` endpoint with protocol filtering
- [ ] Update firmware to initialize sensors on correct pins

### 1.4 Enhance Web UI for Sensor Configuration
- [ ] Add sensor type dropdown dynamically based on protocol
- [ ] Implement pin selection dropdown (populated from firmware)
- [ ] Add I2C address field (visible only for I2C protocol)
- [ ] Add formula input field with examples and validation
- [ ] Add engineering units field
- [ ] Ensure "Save & Reboot" initiates firmware reboot after configuration POST

**Estimated Effort:** 2-3 weeks  
**Success Criteria:**
- Sensors can be configured via UI without firmware reboot until "Save & Reboot"
- Pin conflicts are prevented
- Formulas are validated and applied correctly
- Calibrated values are displayed alongside raw values

---

## Phase 2: Develop Data Flow Visualization & Diagnostics

**Goal:** Provide clear visibility into sensor data transformation from raw → calibrated → Modbus.

### 2.1 Raw Sensor Data Display
- [ ] Update `/iostatus` endpoint to include raw values alongside calibrated
- [ ] Group sensor display by type (I2C, UART, Analog, OneWire, Digital)
- [ ] Add real-time status indicators (active, error, disabled)
- [ ] Include last update timestamp for each sensor

### 2.2 Calibration Modal & Data Flow Visualization
- [ ] Create calibration editor modal in web UI
- [ ] Show raw value → formula → calibrated result flow
- [ ] Allow inline formula testing with sample values
- [ ] Visual arrows and color coding showing transformation pipeline
- [ ] Support formula editing and live validation

### 2.3 Terminal-Based Diagnostics
- [ ] Implement backend terminal command handler
- [ ] Add sensor query commands: `sensor list`, `sensor read <id>`, `sensor info <id>`, `sensor test <id>`
- [ ] Add IO commands: `di read <0-7>`, `do write <0-7> HIGH/LOW`, `ai read <0-2>`
- [ ] Add network commands: `ipconfig`, `ping <ip>` (simple connectivity check)
- [ ] Add I2C bus scan: `i2cscan` (enumerate all I2C devices)
- [ ] Maintain terminal output log and command history

### 2.4 WebSocket Terminal UI (Optional for Phase 2)
- [ ] Implement WebSocket server on device (port 81)
- [ ] Connect frontend terminal to backend via WebSockets
- [ ] Real-time command/response with output streaming
- [ ] Add command autocomplete based on available sensors

**Estimated Effort:** 2-3 weeks  
**Success Criteria:**
- Data flow is visually intuitive and updated in real-time
- Terminal commands accurately query and control all sensor types
- Formula testing shows expected results before applying to production
- Error states are clearly communicated to user

---

## Phase 3: Bus Management & Advanced Sensor Support

**Goal:** Support multiple concurrent sensors with conflict prevention and flexible scheduling.

### 3.1 Bus Scheduling & Conflict Prevention
- [ ] Implement per-bus command queues (I2C, UART, OneWire)
- [ ] Create non-blocking sensor polling state machine
- [ ] Add configurable polling intervals per sensor
- [ ] Support I2C multiplexer (TCA9548A) for address conflicts
- [ ] Implement 1-Wire bus reset and ROM matching
- [ ] Add timeout and error recovery mechanisms

### 3.2 Named Sensor Framework
- [ ] Create sensor type registry (DS18B20, BME280, EZO-PH, EZO-EC, EZO-RTD, SHT3x, VL53L1X, etc.)
- [ ] Define standardized interfaces for each sensor family
- [ ] Implement automatic initialization and capability detection
- [ ] Add sensor-specific calibration templates

### 3.3 Extended Sensor Support
- [ ] DS18B20 (1-Wire temperature) with CRC validation
- [ ] BME280 / BME680 (environmental: temp, humidity, pressure)
- [ ] SHT3x / SHT4x (humidity/temperature)
- [ ] VL53L1X (time-of-flight distance)
- [ ] ADS1115 (I2C ADC for extended analog channels)
- [ ] RS485 Modbus RTU client bridge (future)

### 3.4 Modbus Register Allocation
- [ ] Reserve register blocks for extended sensor types
- [ ] Document and maintain backward-compatible register map
- [ ] Support dynamic register assignment per configuration
- [ ] Ensure no collisions between sensor types

**Estimated Effort:** 3-4 weeks  
**Success Criteria:**
- Multiple sensors on shared bus (I2C, 1-Wire) operate without conflicts
- Polling intervals are configurable and respected
- New sensor types can be added without breaking existing functionality
- Modbus registers accurately reflect all configured sensors

---

## Phase 4: Production Hardening & Documentation

**Goal:** Ensure system is production-ready, well-documented, and maintainable.

### 4.1 Error Handling & Resilience
- [ ] Add comprehensive sensor health monitoring
- [ ] Implement graceful degradation for failed sensors
- [ ] Add watchdog supervision of main loop (5s timeout)
- [ ] Persist recovery state and error logs
- [ ] Add factory reset capability with confirmation

### 4.2 Performance Optimization
- [ ] Audit and optimize I2C communication timing (<5ms per operation)
- [ ] Ensure loop iteration under watchdog timeout
- [ ] Right-size JSON documents to available SRAM
- [ ] Profile and optimize Modbus response times

### 4.3 Comprehensive Documentation
- [ ] Update README.md with condensed overview and links to detailed docs
- [ ] Complete sensor integration guide with examples
- [ ] Document all REST endpoints with request/response examples
- [ ] Create terminal command reference with use cases
- [ ] Add troubleshooting guide based on common issues

### 4.4 Testing & Validation
- [ ] Unit tests for calibration formulas and sensor drivers
- [ ] Integration tests for complete sensor workflows
- [ ] Load testing with multiple concurrent Modbus clients
- [ ] Long-duration stability testing (48+ hours)
- [ ] Hardware compatibility matrix documentation

**Estimated Effort:** 2-3 weeks  
**Success Criteria:**
- System stable under continuous operation
- All features documented with examples
- Sensor failures do not crash system
- Performance metrics meet specification (loop <500ms, Modbus response <100ms)

---

## Implementation Timeline

```
Phase 1 (Weeks 1-3)   → Core sensor functionality restored
Phase 2 (Weeks 4-6)   → Data visualization & diagnostics operational
Phase 3 (Weeks 7-10)  → Bus management & extended sensors stable
Phase 4 (Weeks 11-13) → Production hardening & documentation complete

Total: ~13 weeks to production readiness
```

---

## Architecture Priorities

### Guiding Principles
1. **Determinism Over Abstraction** – Avoid dynamic allocation in fast paths except where established (EZO objects)
2. **Single Source of Truth** – No forked logic between simulator and firmware
3. **Additive Evolution** – Extend contracts with versioning before major refactors
4. **Separation of Concerns** – Simulator is UI test harness only, never influences firmware

### Code Organization
- `include/sys_init.h` – Hardware constants, pin maps, data structures
- `src/main.cpp` – Setup, main loop, Modbus, HTTP handlers
- `src/sensors/*.h/.cpp` – Modular sensor drivers (future structure)
- `src/modbus_handler.h/.cpp` – Register mapping and client sync (refactor opportunity)
- `src/web_server.h/.cpp` – HTTP endpoints and request handling (refactor opportunity)
- `data/` – Static web assets (HTML, CSS, JavaScript)
- `simulator/` – Express.js server for UI development

---

## Dependencies & Build Management

### Current Library Stack
- ArduinoModbus (Modbus TCP server)
- ArduinoJson (JSON serialization)
- Ethernet (W5500 driver via JAndrassy fork)
- ArduinoRS485 (future RS485 support)
- Ezo_I2c_lib (Atlas Scientific EZO sensors)

### Future Dependencies
- Adafruit_BME280 / BME680 (environmental sensors)
- Sensirion SHT library (humidity/temperature)
- Pololu VL53L1X (time-of-flight)
- DallasTemperature / OneWire (DS18B20)
- Adafruit_ADS1X15 (I2C ADC expander)

### Dependency Management
- All libraries declared in `platformio.ini` via `lib_deps`
- No vendored source in `lib/` directory (PlatformIO handles downloads)
- Versions pinned for reproducibility when stable

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| SRAM exhaustion with new sensors | Medium | High | Audit arrays on each addition, use careful sizing |
| I2C bus conflicts with multiplexed devices | Medium | High | Implement proper bus sequencing, test early |
| Modbus register collisions | Low | High | Centralized register allocation tracking |
| WebSocket server instability | Medium | Medium | Use proven library, extensive timeout testing |
| Performance regression in main loop | Medium | High | Profile on each phase completion |
| Configuration persistence corruption | Low | High | Add checksum validation, factory reset option |

---

## Success Metrics

- ✅ All Phases 1-4 completed on schedule
- ✅ Zero blocking delays >10ms in main loop
- ✅ Support for ≥5 concurrent sensor types
- ✅ ≥95% uptime in 48-hour stability test
- ✅ <100ms Modbus response time (FC2, FC3, FC4 reads)
- ✅ Complete test coverage for calibration and sensor drivers
- ✅ All endpoints documented with examples
- ✅ CI/CD pipeline with automated builds and tests

---

## Notes for Contributors

- Reference **CONTRIBUTING.md** for coding standards and architectural principles
- All new features must update this roadmap before implementation
- Simulator changes are UI-only; do not replicate firmware business logic
- Backwards compatibility is required for Modbus registers
- Performance budgets: <500ms loop, <5ms I2C operation, <100ms Modbus response

---

## Changelog

- **2025-10-22**: Initial roadmap consolidation from PLAN.md and IMPROVEMENT_PLAN.md
- **2025-10-22**: Reorganized into 4 strategic phases with clear success criteria
