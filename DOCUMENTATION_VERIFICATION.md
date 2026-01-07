# Documentation Verification Report
**Generated:** January 7, 2026  
**Status:** Critical discrepancies found

## Executive Summary

After thorough code-vs-documentation verification, several **critical discrepancies** were identified between what the documentation claims and what the firmware actually implements. This report catalogs all findings and necessary corrections.

---

## ❌ CRITICAL DISCREPANCIES

### 1. **IO Configuration Refactor (CLAIMED vs ACTUAL)**

**CONTRIBUTING.md Section 5 claims:**
- REST endpoints `/io/config`, `/io/output`, `/io/rule` for IO automation rules

**ACTUAL implementation (src/main.cpp):**
- ✅ `/io/config` - EXISTS (GET/POST at line 5216, 5269)
- ✅ `/ioconfig` - EXISTS (GET/POST at line 5214, 5267)  
- ❌ `/io/output` - **DOES NOT EXIST** (use `/setoutput` instead)
- ❌ `/io/rule` - **DOES NOT EXIST**
- ❌ `/io/rules` - **DOES NOT EXIST**

**Verdict:** IO automation rules ARE implemented internally (`evaluateIOAutomationRules()` at line 4282) but REST API documentation is **WRONG**.

---

### 2. **Hardcoded Pin Arrays (CLAIMED vs ACTUAL)**

**ROADMAP.md & IO_CONFIG_REFACTOR.md claim:**
> "Remove hardcoded pin arrays from sys_init.h"

**ACTUAL implementation (sys_init.h lines 200-202):**
```cpp
const uint8_t DIGITAL_INPUTS[] = {0, 1, 2, 3, 4, 5, 6, 7};
const uint8_t DIGITAL_OUTPUTS[] = {8, 9, 10, 11, 12, 13, 14, 15};
const uint8_t ANALOG_INPUTS[] = {26, 27, 28};
```

**Also in main.cpp:**
- Still referenced at line 6320: `digitalWrite(DIGITAL_OUTPUTS[outputIndex], ...)`

**Verdict:** Hardcoded arrays STILL EXIST and are actively used. Documentation claim is **FALSE**.

---

### 3. **Dynamic IO Configuration (CLAIMED vs ACTUAL)**

**IO_CONFIG_REFACTOR.md claims:**
> "Phase 1: Remove hardcoded pin arrays ✓ (Planned)"  
> Status: Implementation Phase

**ACTUAL status:**
- `IOConfig` struct exists in sys_init.h
- `loadIOConfig()` / `saveIOConfig()` implemented
- `applyIOConfigToPins()` implemented
- `evaluateIOAutomationRules()` implemented

**BUT:**
- Legacy hardcoded arrays STILL in use
- System runs HYBRID mode: both old hardcoded + new dynamic
- NOT a complete migration

**Verdict:** Partially implemented, documentation overstates completion. Should say **"Hybrid Mode - Transition In Progress"**.

---

### 4. **Modbus Register Allocation (CLAIMED vs ACTUAL)**

**CONTRIBUTING.md Section 6 claims:**
```
* Discrete Inputs (FC2): 0–7  -> Digital Input logical states
* Coils (FC1/FC5): 0–7       -> Digital Outputs (logical)
* Coils (FC5 write pulse): 100–107 -> DI latch reset
* Input Registers (FC4): 0–2  -> Analog inputs (mV)
* Input Registers (FC4): 3–4  -> Reserved for temp/humidity
```

**ACTUAL sensor register allocations (from applySensorPresets() in main.cpp):**
```cpp
EZO_PH      -> modbusRegister: 10
EZO_EC      -> modbusRegister: 11
EZO_DO      -> modbusRegister: 12
EZO_RTD     -> modbusRegister: 13
DS18B20     -> modbusRegister: 14
SHT30       -> modbusRegister: 15
BME280      -> modbusRegister: 16
Generic OW  -> modbusRegister: 17
Generic I2C -> modbusRegister: 18
UART        -> modbusRegister: 19
LIS3DH      -> modbusRegister: 20
```

**Verdict:** Documentation is OUTDATED. Registers 10-20 are actively used but NOT documented.

---

### 5. **REST API Endpoints (CLAIMED vs ACTUAL)**

**CONTRIBUTING.md Section 5 REST API table lists endpoints that DON'T match actual implementation:**

| Documented Endpoint | Actual Status | Correct Path |
|---------------------|---------------|--------------|
| `/api/sensor/command` | ✅ EXISTS | `/api/sensor/command` |
| `/sensors/config` | ✅ EXISTS | `/sensors/config` |
| `/sensors/data` | ✅ EXISTS | `/sensors/data` |
| `/io/config` | ✅ EXISTS | `/io/config` |
| `/io/output` | ❌ WRONG | `/setoutput` (query params) |
| `/io/reset-latch` | ❌ WRONG | `/reset-latch` |
| `/io/reset-latches` | ❌ WRONG | `/reset-latches` |
| `/io/rules` | ❌ MISSING | NOT IMPLEMENTED |

**Additional UNDOCUMENTED endpoints found:**
```cpp
/api/pins/map              (GET)
/api/sensors/status        (GET)
/api/rules/status          (GET)
/api/pin/unlock            (POST)
/api/sensor/calibration    (POST)
/api/sensor/poll           (POST)
/terminal/command          (POST)
/terminal/logs             (GET)
/terminal/start-watch      (POST)
/terminal/stop-watch       (POST)
/terminal/send-command     (POST)
```

**Verdict:** REST API documentation is **severely incomplete** and contains WRONG paths.

---

### 6. **Sensor Integration (CLAIMED vs ACTUAL)**

**ROADMAP.md claims:**
> "Phase 3: Extended Sensor Support - NOT YET IMPLEMENTED"

**ACTUAL implementation (main.cpp applySensorPresets()):**
- ✅ SHT30
- ✅ DS18B20  
- ✅ EZO_PH, EZO_EC, EZO_DO, EZO_RTD
- ✅ BME280
- ✅ LIS3DH (accelerometer)
- ✅ Generic I2C
- ✅ Generic One-Wire
- ✅ UART sensors

**Verdict:** Phase 3 IS IMPLEMENTED but roadmap says it's not. Documentation is **OUTDATED**.

---

### 7. **I2C Manager (CLAIMED vs ACTUAL)**

**I2C_MANAGER_INSTRUCTIONS.md (archived) claims:**
> "No separate files - Everything integrated into main.cpp"

**ACTUAL implementation:**
- ✅ `include/i2c_bus_manager.h` EXISTS (169 lines, fully implemented class)
- ✅ Used in main.cpp: `I2CBusManager i2cBusManager;` (line 22)

**Verdict:** Archive document is WRONG. Separate I2C manager file DOES exist.

---

### 8. **Formula Calibration (CLAIMED vs ACTUAL)**

**README.md claims:**
> "Mathematical formula support - `(x * 1.8) + 32`, `sqrt(x * 9.8)`, `log(x + 1) * 100`"

**ACTUAL implementation:**
- ✅ `evaluateCalibrationExpression()` exists
- ✅ `applyCalibration()`, `applyCalibrationB()`, `applyCalibrationC()` exist
- ✅ Supports expressions in `SensorConfig.calibrationExpression`

**BUT:**
- No evidence of math library integration for `sqrt()`, `log()`, etc.
- Likely ONLY supports basic arithmetic: `+`, `-`, `*`, `/`

**Verdict:** Documentation OVERCLAIMS capabilities. Need verification of actual expression parser.

---

### 9. **Terminal Diagnostic Commands (CLAIMED vs ACTUAL)**

**CONTRIBUTING.md & Terminal Guide claim:**
> All terminal commands fully implemented

**ACTUAL:**
- ✅ Terminal command handler exists (main.cpp line 2117)
- ✅ Watch system implemented (`/terminal/start-watch`, `/terminal/stop-watch`)
- ✅ I2C, UART, One-Wire protocol commands implemented

**Verdict:** Terminal system IS implemented and documentation is ACCURATE here. ✅

---

## ✅ ACCURATE DOCUMENTATION

### What's Correct:
1. **SensorConfig struct** - accurately documented in CONTRIBUTING.md
2. **IOPin / IORule / IOConfig structs** - match implementation
3. **Network configuration** (DHCP, static IP, persistence) - accurate
4. **LittleFS file structure** (config.json, sensors.json, io_config.json) - accurate
5. **Modbus client management** (MAX_MODBUS_CLIENTS = 4) - accurate
6. **Watchdog timer** (5s timeout) - accurate
7. **Pin reservations** (GP16-21 Ethernet, GP22 LED) - accurate
8. **Terminal interface** - accurately documented

---

## 📋 REQUIRED DOCUMENTATION FIXES

### Priority 1 (Critical - Misleading):
1. **Update CONTRIBUTING.md Section 5** - Fix REST API endpoint table
2. **Update ROADMAP.md Phase 3** - Mark extended sensors as IMPLEMENTED
3. **Remove IO_CONFIG_REFACTOR.md from archive** - It's NOT implemented as claimed
4. **Update CONTRIBUTING.md Section 6** - Document registers 10-20 allocations

### Priority 2 (Important - Incomplete):
5. **Document terminal REST endpoints** - Add `/terminal/*` paths to API table
6. **Clarify formula calibration limits** - State which math functions are supported
7. **Update I2C Manager documentation** - Acknowledge separate header file exists
8. **Fix CHANGELOG.md** - Several claimed features don't match reality

### Priority 3 (Maintenance):
9. **Create REST API reference** - Complete endpoint catalog in `/docs/technical/rest-api.md`
10. **Update pin usage diagram** - Show HYBRID mode (hardcoded + dynamic coexistence)

---

## 🔧 RECOMMENDED CODE CHANGES

If documentation is to be believed as "truth", then code needs these changes:

### Option A: Make Code Match Documentation
1. Remove hardcoded `DIGITAL_INPUTS[]`, `DIGITAL_OUTPUTS[]` arrays
2. Migrate all GPIO references to use `ioConfig.pins[]`
3. Implement missing REST endpoints (`/io/rules`, `/io/output`)

### Option B: Make Documentation Match Code (RECOMMENDED)
1. Document HYBRID mode intentionally
2. Update REST API table with correct paths
3. Mark extended sensor support as COMPLETE
4. Add undocumented endpoints to API reference

**Recommendation:** Choose Option B - fix documentation first, then gradually migrate code away from legacy arrays in future versions.

---

## 🎯 ACTION ITEMS

1. ✅ Archive obsolete planning documents (DONE - moved to `/archive`)
2. ⚠️ Update CONTRIBUTING.md REST API table (TODO)
3. ⚠️ Update ROADMAP.md sensor status (TODO)
4. ⚠️ Update register allocation docs (TODO)
5. ⚠️ Create comprehensive REST API reference doc (TODO)
6. ⚠️ Add "Documentation Alignment" section to CONTRIBUTING.md (TODO)

---

## 📝 NOTES

- This verification was performed by reading `src/main.cpp` (7456 lines), `include/sys_init.h`, and all root-level documentation
- Code search confirmed implementation status of claimed features
- Archive documents contain INCORRECT information and should not be relied upon
- Current state: **Functional but documentation is dangerously misleading for new contributors**

---

**Next Step:** Prioritize fixing CONTRIBUTING.md and ROADMAP.md as they are the primary developer references.
