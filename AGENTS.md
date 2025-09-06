<div align="center">

# Modbus IO Module – Engineering & Agent Operations Guide

Fast orientation + consistent, high‑quality contributions for an embedded Modbus + web‑configured IO & sensor gateway (RP2040 + W5500). This guide is optimized for AI coding agents and human reviewers.

</div>

---

## 0. Mission & Principles
Deliver maintainable firmware + web UI that: (1) exposes stable Modbus + HTTP contracts, (2) enables rapid integration of additional digital / analog / I2C / smart (EZO) sensors, (3) keeps simulator strictly for UI workflow validation (no build dependency), and (4) preserves deterministic resource usage (RAM / flash / heap) on microcontroller.

Key principles:
1. Determinism over abstraction – avoid dynamic allocation in fast paths (sensor polling, Modbus service loop) except where already established (EZO objects).
2. One source of truth for config/state; never fork logic differently in simulator other than data generation.
3. Additive evolution – extend register & REST contracts with versioned documentation before refactors.
4. Separation – simulator is a test harness for the web UI only; it must not influence firmware code layout or introduce dev‑only branches in `src/`.

---

## 1. High‑Level Architecture Map

| Layer | Responsibility | Key Files | Notes |
|-------|----------------|----------|-------|
| Hardware Abstraction | Pin maps, watchdog, network, Modbus server objects, sensor structs | `include/sys_init.h` | Keep constants + structs stable; bump `CONFIG_VERSION` when serialized layout changes. |
| Firmware Core | Setup/init, IO scan loop, Modbus client mgmt, HTTP handlers | `src/main.cpp` | Loop updates: client accept, IO refresh, sensor handling, web server, watchdog. |
| Persistence | Config & sensor profiles (LittleFS JSON) | `CONFIG_FILE`, `SENSORS_FILE` | Bound by JSON doc capacity (watch memory). |
| Web Interface | Static assets served from flash | `data/index.html`, `data/script.js`, etc. | UI polls `/config`, `/iostatus`, posts mutations. |
| External Protocols | Modbus TCP, HTTP REST | Modbus server + `WebServer` | Register + endpoint contract documented here. |
| Simulator (UI Harness) | Express server + synthetic state | `simulator/server.js` | NEVER required to build firmware. Mirrors endpoints for UI dev only. |

---

## 2. Code Index (Fast Jump Table)

| Concern | Function(s) / Section | Purpose |
|---------|-----------------------|---------|
| Boot sequence | `setup()` | Init FS, load config & sensors, pins, Ethernet, Modbus, web server, I2C bus, watchdog. |
| Main service loop | `loop()` | Accept Modbus clients, poll them, update IO, handle EZO sensors, HTTP dispatch, wdt reset. |
| Config persistence | `loadConfig()`, `saveConfig()` | JSON <-> `Config` struct. Validation + default fallback. |
| IO mapping | `updateIOpins()` | Sample DI/AI, manage latching/inversion, propagate DO changes, periodic sensor simulation bridge. |
| Client register sync | `updateIOForClient()` | Pushes state into per‑client Modbus server (discrete, coils, inputs). |
| Sensor configuration | `loadSensorConfig()`, `saveSensorConfig()` | Dynamic sensor slot population. |
| EZO lifecycle | `initializeEzoSensors()`, `handleEzoSensors()` | Lazy init, async read command cadence (1s/5s). |
| REST endpoints | `handle*` functions | One handler per path; must remain concise + validation heavy. |
| Latch mgmt | `resetLatches()`, `handleReset*` | Clear latched DI states. |
| Sensor commands | `handleSensorCommand()` | Send arbitrary EZO command; track pending + response. |

---

## 3. Supported & Target Sensor / Bus Protocols

Current implemented / scaffolded:
* Digital Inputs / Outputs: direct GPIO (latched, inversion, pullups)
* Analog Inputs: ADC (12‑bit -> millivolt scaling)
* I2C Generic Sensors: pattern for BME280 + VL53L1X placeholders
* Atlas Scientific EZO modules over I2C (PH / DO / EC / RTD, extensible)
* Modbus TCP Server: multiple concurrent clients, per‑client server instance replication

Planned / recommended additions (design considerations included so agents can implement safely):
| Protocol / Device Class | Typical Address / Range | Library Pattern | Integration Notes |
|-------------------------|-------------------------|-----------------|-------------------|
| BME280 / BME680 | 0x76 / 0x77 | Adafruit_BME280 / BME680 | One global instance; map temp/hum/press to registers; optional compensation fields. |
| SHT3x / SHT4x | 0x44 / 0x45 | Sensirion libs | Similar cadence to BME; ensure non‑blocking poll. |
| VL53L1X (ToF) | 0x29 | Pololu / ST | Distance mapping (mm) -> assign dedicated Modbus input registers. |
| DS18B20 (1‑Wire) | GPIO + discovery | OneWire + DallasTemperature | Single bus; prepare for dynamic sensor count (extend `MAX_SENSORS`). |
| I2C ADC Expanders (e.g., ADS1115) | 0x48–0x4B | Adafruit_ADS1X15 | Extend analog channel capacity; maintain scaling doc. |
| SPI Sensors (future) | Chip‑select mapped | Appropriate driver | Abstract with per‑driver init so W5500 SPI coexist (bus arbitration / speed). |
| UART (RS485 Modbus RTU client) | N/A | ArduinoRS485 + ModbusClient | Could allow bridging RTU sensors into TCP map; must isolate timing in loop. |

Bus Access Rules:
1. I2C operations must be short (avoid blocking >5ms inside `loop()`); prefer state machines if needed.
2. Do not expand dynamic allocations; reuse static structs/arrays—raise constants only after RAM audit.
3. New driver code should be guarded behind sensor type string pattern (e.g., `if (strcmp(type,"BME280")==0) { ... }`). For larger logic, refactor into `sensors/<Type>.h/.cpp` (create folder) and expose `bool read<Type>(SensorConfig&, IOStatus&)`.

---

## 4. Sensor Integration Workflow (Authoritative Checklist)

1. Registration
  - Add sensor entry to `sensors.json` (UI or manual) with: `enabled`, `name`, `type`, `i2cAddress`, `modbusRegister`.
  - If new type: define mapping rules (what data fields it populates) and update Section 7 register map if new registers consumed.
2. Firmware Hook
  - Extend `updateIOpins()` (for periodic read OR trigger scheduling) or add logic inside a specialized `handle<Type>Sensors()` invoked from loop.
  - For I2C: Probe in an `initialize<Type>()` path similar to `initializeEzoSensors()`.
3. Data Storage
  - Use existing float fields if semantically aligned (e.g., temperature). If adding new measurement dimension, extend `IOStatus` (KEEP ORDER – bump `CONFIG_VERSION` only if persistence struct changes, not for volatile runtime structs). Document the new field.
4. Modbus Exposure
  - Choose an unused Input Register (FC4) index; update table (Section 7). Keep addresses contiguous per sensor family where possible.
5. REST Exposure
  - Decide if value belongs inside `/iostatus` payload: nest under `i2c_sensors` using deterministic key naming (lower snake case). Add UI consumption logic.
6. UI Update
  - Modify `data/script.js` to visualize new value(s) gracefully (fallback to hidden when key absent).
7. Simulator (Optional, UI Only)
  - If UI feature depends on new key, extend simulator synthetic generation. DO NOT mirror firmware internals—only emit JSON shape.
8. Test Matrix
  - No sensor configured -> legacy placeholders persist.
  - Multiple sensors of mixed types -> ensure no register collision.
  - Disabled sensor -> no polling, no stale register updates.
9. Logging & Diagnostics
  - Add a concise `Serial.printf` on init & each read error; avoid verbose flooding (rate limit if inside fast loops).

Fast Failure Conditions (reject PR / patch if):
* Adds blocking delay >10ms inside `loop()` path.
* Introduces dynamic heap churn inside sensor poll (> occasional new for fixed EZO instances).
* Expands JSON doc capacity without memory headroom justification.

---

## 5. REST API Contract (Firmware)

| Method | Path | Handler | Purpose | Body / Response Notes |
|--------|------|---------|---------|-----------------------|
| GET | `/config` | `handleGetConfig` | Network + modbus + IO summary | Returns IPs, modbus status, counts. |
| POST | `/config` | `handleSetConfig` | Update network & port (reboots) | Reject invalid IP/port; size limit 256 chars. |
| GET | `/iostatus` | `handleGetIOStatus` | Live IO state snapshot | Includes latched arrays + analog + EZO meta. |
| GET | `/ioconfig` | `handleGetIOConfig` | IO feature configuration | Pullup/invert/latch + output init. |
| POST | `/ioconfig` | `handleSetIOConfig` | Mutate IO behavior live | Immediate pinMode updates for pullups. |
| POST | `/setoutput` | `handleSetOutput` | Set digital output | Logical state propagated to all clients. |
| POST | `/reset-latches` | `handleResetLatches` | Clear all DI latches | JSON success response. |
| POST | `/reset-latch` | `handleResetSingleLatch` | Clear specific latch | Body `{ "input": <0-7> }`. |
| GET | `/sensors/config` | `handleGetSensorConfig` | List sensor slots | Array with `enabled,type,i2cAddress`. |
| POST | `/sensors/config` | `handleSetSensorConfig` | Replace sensor set | Validates length + names + I2C addr; reboots. |
| POST | `/api/sensor/command` | `handleSensorCommand` | Send custom EZO command | Body: sensorIndex + command, async reply later in `/iostatus`. |

Simulator duplicates shapes it needs for UI, but MAY add simulator‑only keys (flagged by `is_simulator`). Firmware MUST NOT depend on them.

---

## 6. Modbus Register Allocation Strategy

Current mapping (see `main.cpp` comments):
* Discrete Inputs (FC2): 0–7  -> Digital Input logical states (post invert + latch logic)
* Coils (FC1/FC5): 0–7       -> Digital Outputs (logical)
* Coils (FC5 write pulse): 100–107 -> DI latch reset commands (write 1 => clears, auto resets to 0)
* Input Registers (FC4): 0–2  -> Analog inputs (mV)
* Input Registers (FC4): 3–4  -> Reserved for temperature / humidity (disabled until real sensor active)

When adding new sensor registers:
1. Reserve contiguous block; document start + length.
2. Update this section and the comment block in `main.cpp`.
3. Avoid repurposing existing addresses (backward compatibility).

Future expansion suggestion:
| Range | Purpose (Proposed) |
|-------|--------------------|
| 5–15  | Extended environmental sensors (pressure, VOC, light, distance) |
| 16–31 | Custom user sensor values (dynamic map) |
| 64–95 | Derived/calculated metrics (averages, alarms) |

---

## 7. Adding a New Sensor Type – Minimal Example (BME280)

Changes:
1. Dependencies: Add library to `lib/` (or reference via PlatformIO if allowed) – ensure license compatibility.
2. In `main.cpp` top section: include driver & instantiate object (commented template exists).
3. Init in `setup()` after I2C begin:
```cpp
if (!bme.begin(0x76)) {
  Serial.println("BME280 init failed");
} else {
  Serial.println("BME280 OK");
}
```
4. Read path inside periodic sensor window (e.g., inside `updateIOpins()` timed block):
```cpp
if (strcmp(configuredSensors[i].type, "BME280") == 0) {
  ioStatus.temperature = bme.readTemperature();
  ioStatus.humidity = bme.readHumidity();
  ioStatus.pressure = bme.readPressure() / 100.0F; // hPa
}
```
5. Expose registers 3 & 4 (uncomment existing lines) ensuring scaling (x100 if converted to integer) OR keep float only in REST.
6. UI: add display for temperature/humidity keys if not already visible.
7. Simulator: only if UI needs synthetic values beyond existing baseline – extend server to re‑emit keys (already present baseline supports temperature/humidity/pressure).

---

## 8. Simulator Policy (Strict Separation)

The simulator (`simulator/server.js`) is a UI contract verification tool. It MUST NOT:
* Gate or alter firmware control flow.
* Introduce compile flags in firmware.
* Contain logic the firmware relies on for correctness.

Agent Rules:
1. When adding a new REST endpoint for UI purposes, FIRST implement in firmware; THEN add a minimal mirror to simulator (no business logic duplication) so UI can call it.
2. Do NOT add firmware‑only experimental endpoints to simulator.
3. Any simulator extension must state: `// simulator-only: mirrors firmware shape` above stub.
4. The simulator may expose diagnostic extras (e.g., `is_simulator`) – UI must treat them as optional.

Startup (UI dev only):
```bash
cd simulator
npm install
npm start        # http://localhost:8080
npm run dev      # (optional) watch mode
```

---

## 9. Quality Gates & Definition of Done

| Gate | Criteria |
|------|----------|
| Build | Code compiles under PlatformIO; no new warnings if avoidable. |
| Memory | Added globals stay within acceptable static RAM (audit if increasing arrays). |
| Loop Timing | No added blocking >10ms; sensor polling amortized. |
| REST Contract | Endpoints documented in Section 5 & mirrored if UI uses them. |
| Modbus Integrity | No register collisions; existing addresses unchanged. |
| Simulator | UI paths testable; simulator mirrors only required endpoints. |
| Logging | Serial logs concise; no spam every loop iteration. |
| Error Handling | All JSON input validated; failure returns 4xx with message. |

Pre‑merge checklist (tick ALL):
- [ ] Added/changed endpoints documented here.
- [ ] Sensor mapping updated (register + REST keys) if applicable.
- [ ] Simulator updated only if UI changed.
- [ ] Tested: no console errors in browser.
- [ ] Verified multiple Modbus clients still function.

---

## 10. Performance & Reliability Considerations
* Watchdog: keep loop under WDT timeout (5s) – avoid long sensor blocking calls; if unavoidable, convert to staged state machine.
* EZO cadence: maintain existing 5s interval & 1s wait pattern; changing requires re‑evaluating bus contention.
* Reboots: Some config POST handlers intentionally reboot (network changes). Do not silently skip reboot without updating design docs.
* JSON Document Sizes: Right‑size `StaticJsonDocument` – oversizing wastes SRAM; undersizing corrupts responses.

---

## 11. Naming & Key Conventions
| Domain | Convention | Example |
|--------|-----------|---------|
| Sensor Type String | Upper snake for families needing special handling | `EZO_PH`, `EZO_RTD` |
| REST JSON Keys | lower_snake (unless existing camel) | `modbus_port`, `di_pullup` |
| Internal Struct Fields | concise lower camel or snake as existing | `dInRaw`, `modbusRegister` |
| Added Measurement Keys | semantic, singular | `temperature`, `pressure`, `distance_mm` |

---

## 12. Rapid FAQ (for Agents)
Q: Need a new measurement not in `IOStatus`?  
A: Add field, update related REST serialization, document in Sections 4 & 6; no config version bump unless persisted.

Q: Need more sensors than `MAX_SENSORS`?  
A: Increase constant after confirming SRAM headroom; audit arrays sized by constant.

Q: Want to remove placeholder simulation code?  
A: Convert to conditional compile only if it materially saves space; otherwise keep to ease future sensor enablement.

Q: Add SPI sensor with W5500 present?  
A: Ensure bus speed negotiation; possibly wrap sensor transactions in critical section if timing issues appear.

---

## 13. Contribution Flow (Condensed)
1. Write or modify sensor / IO / endpoint logic in firmware.
2. Update REST + register documentation in this file.
3. If UI depends on it, mirror minimal stub in simulator.
4. Add UI changes (progress state, error handling).
5. Test (hardware if available) + simulator.
6. Submit patch referencing affected sections of this guide.

---

## 14. Future Enhancements (Backlog Seeds)
* Pluggable sensor driver interface directory (`/src/sensors/`).
* Telemetry batching endpoint (JSON snapshot) for external ingestion.
* Config diff + rollback mechanism.
* Modbus RTU (RS485) bridge mode – map downstream registers into local space.
* On‑device calibration storage (per sensor polynomial / expression like simulator calibration scaffolding).

---

## 15. Minimal Template Snippets

Sensor type conditional stub inside loop read section:
```cpp
if (strcmp(configuredSensors[i].type, "NEWTYPE") == 0) {
  // read value -> float val
  // assign to ioStatus.<field>
  // (optional) scale & write to modbus input register in updateIOForClient
}
```

Simulator stub (ONLY if UI needs it):
```javascript
app.get('/new/endpoint', (req,res)=>{
  // simulator-only: mirrors firmware shape (no business logic)
  res.json({ value: 0 });
});
```

---

### End of Guide

Maintain this file as authoritative reference. Every structural change must be reflected here to keep future autonomous contributions safe and aligned.