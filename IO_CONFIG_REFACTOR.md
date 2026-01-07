# I/O Configuration Refactor - Complete System Design

**Status:** Implementation Phase  
**Created:** November 25, 2025  
**Objective:** Remove hardcoded pin assignments and implement fully dynamic I/O configuration via JSON with automation rules

---

## Control System Functions Supported

The system implements **industrial automation patterns** for intelligent I/O control:

### ✅ Currently Implemented
| Function | Purpose | Example |
|----------|---------|---------|
| **Simple Control** | Direct output based on Modbus register | IF Temperature > 80 THEN Set Pump ON |
| **Pulse/Momentary** | Output pulses for fixed duration | Buzzer activation for 500ms |
| **Invert Logic** | Flip ON/OFF for normally-closed devices | Solenoid: ON = close, OFF = open |
| **Manual Override** | Checkbox control for real-time testing | Toggle pump without rule evaluation |
| **Priority Rules** | Multiple rules per pin with priority levels | Rule 1 = safety shutoff, Rule 2 = normal operation |

### 🔄 Recommended Future Additions
| Function | Purpose | Implementation Notes |
|----------|---------|----------------------|
| **Interlock** | Prevent simultaneous outputs (conflict prevention) | Mutex check: "Only 1 pump ON" |
| **Delay-On Timer** | Wait X seconds before activating | Use `millis()` tracking, check elapsed time |
| **Delay-Off Timer** | Output stays ON for X seconds after trigger clears | Extend rule to track OFF timestamp |
| **Hysteresis** | Anti-chatter with upper/lower thresholds | Temp > 80 = ON, Temp < 75 = OFF (5° deadband) |
| **Averaging** | Smooth noisy sensor data via moving average | Buffer last N readings, evaluate average |
| **Sequencing** | Execute outputs in order with delays | Step 1: Pump ON; Step 2: Wait 3s; Step 3: Heater ON |
| **Logic Gates** | Combine conditions with AND/OR/NOT | (Temp > 80 AND Pressure > 100) OR Alarm |

**Design Philosophy:** Start with core features (currently done), add advanced patterns incrementally. Each pattern works independently; users enable only what they need.

---

## 1. Problem Statement

### Current State (Problematic)
- **sys_init.h** defines hardcoded pin arrays:
  - `DIGITAL_INPUTS[] = {0, 1, 2, 3, 4, 5, 6, 7}` (fixed to GP0-GP7)
  - `DIGITAL_OUTPUTS[] = {8, 9, 10, 11, 12, 13, 14, 15}` (fixed to GP8-GP15)
  - `ANALOG_INPUTS[] = {26, 27, 28}` (ADC-only, kept as-is)
- These hardcoded assignments **conflict** with dynamic I2C/UART/sensor pin allocation
- Users cannot reassign pins dynamically via web UI
- The I/O configuration is split between sys_init.h, config.json, and web UI logic with no unified source of truth

### Issues This Creates
1. **Pin Conflicts:** User might assign I2C sensors to GP0-GP7, but firmware still treats them as digital inputs
2. **Inflexible:** Cannot easily add/remove/reconfigure I/O without code changes
3. **UI Mismatch:** Web UI shows generic "Digital Input 0-7" labels instead of actual GP pin numbers
4. **No Dynamic Output Assignment:** Must recompile to change which pins are outputs
5. **Limited Rules Engine:** No way to trigger outputs based on sensor/register values without coding

---

## 2. Proposed Solution Architecture

### 2.1 New Files & Structure

```
├── data/
│   ├── config.json              (EXISTING: Network + Modbus settings)
│   ├── sensors.json             (EXISTING: Sensor configurations)
│   ├── io_config.json           (NEW: Dynamic I/O pin mappings + rules)
│   ├── index.html               (UPDATED: New I/O config UI section)
│   └── script.js                (UPDATED: I/O config API calls + rules UI)
│
├── include/
│   ├── sys_init.h               (MODIFIED: Remove hardcoded pin arrays, add IO_CONFIG)
│   └── i2c_bus_manager.h        (EXISTING: Already created)
│
└── src/
    └── main.cpp                 (MODIFIED: Load io_config.json, apply rules engine)
```

### 2.2 New JSON Structure: `io_config.json`

```json
{
  "_comment": "I/O Configuration - Dynamically manages GPIO pin assignments and automation rules",
  "_architecture": "Master I/O configuration replacing hardcoded pin arrays in sys_init.h",
  "_version": 1,
  
  "version": 1,
  
  "digital_pins": [
    {
      "gpPin": 0,
      "label": "Input - Door Sensor",
      "mode": "input",
      "pullup": true,
      "invert": false,
      "latch": true,
      "latched": false,
      "modbusRegister": 100,
      "rules": []
    },
    {
      "gpPin": 1,
      "label": "Input - Motion Sensor",
      "mode": "input",
      "pullup": false,
      "invert": false,
      "latch": false,
      "latched": false,
      "modbusRegister": 101,
      "rules": []
    },
    {
      "gpPin": 8,
      "label": "Output - Pump Control",
      "mode": "output",
      "initialState": false,
      "currentState": false,
      "modbusRegister": 200,
      "rules": [
        {
          "id": "rule_001",
          "enabled": true,
          "description": "Turn pump ON when pressure > 100 psi",
          "trigger": {
            "modbusRegister": 50,
            "condition": ">",
            "value": 100
          },
          "action": {
            "type": "set_output",
            "value": true,
            "latchOutput": false
          },
          "priority": 1
        },
        {
          "id": "rule_002",
          "enabled": true,
          "description": "Turn pump OFF when pressure < 50 psi",
          "trigger": {
            "modbusRegister": 50,
            "condition": "<",
            "value": 50
          },
          "action": {
            "type": "set_output",
            "value": false,
            "latchOutput": false
          },
          "priority": 2
        }
      ]
    },
    {
      "gpPin": 9,
      "label": "Output - Alarm",
      "mode": "output",
      "initialState": false,
      "currentState": false,
      "modbusRegister": 201,
      "rules": [
        {
          "id": "rule_003",
          "enabled": true,
          "description": "Trigger alarm if temperature > 80°C",
          "trigger": {
            "modbusRegister": 30,
            "condition": ">",
            "value": 80
          },
          "action": {
            "type": "set_output_and_latch",
            "value": true
          },
          "priority": 1
        }
      ]
    },
    {
      "gpPin": 4,
      "label": "SDA Pin - I2C0",
      "mode": "i2c",
      "protocol": "I2C",
      "busId": "I2C0",
      "pairedPin": 5,
      "comment": "I2C protocol pin - do not modify"
    },
    {
      "gpPin": 5,
      "label": "SCL Pin - I2C0",
      "mode": "i2c",
      "protocol": "I2C",
      "busId": "I2C0",
      "pairedPin": 4,
      "comment": "I2C protocol pin - do not modify"
    }
  ],
  
  "analog_pins": [
    {
      "adcPin": 26,
      "label": "Analog - Pressure",
      "enabled": true,
      "modbusRegister": 10,
      "scalingMin": 0,
      "scalingMax": 4095,
      "outputMin": 0,
      "outputMax": 100,
      "unit": "psi"
    },
    {
      "adcPin": 27,
      "label": "Analog - Temperature",
      "enabled": true,
      "modbusRegister": 11,
      "scalingMin": 0,
      "scalingMax": 4095,
      "outputMin": -40,
      "outputMax": 125,
      "unit": "°C"
    },
    {
      "adcPin": 28,
      "label": "Analog - Humidity",
      "enabled": false,
      "modbusRegister": 12,
      "scalingMin": 0,
      "scalingMax": 4095,
      "outputMin": 0,
      "outputMax": 100,
      "unit": "%"
    }
  ]
}
```

---

## 3. Detailed Component Breakdown

### 3.1 SensorConfig Struct Changes (sys_init.h)

**REMOVE** hardcoded arrays:
```cpp
// OLD - DELETE THESE:
const uint8_t DIGITAL_INPUTS[] = {0, 1, 2, 3, 4, 5, 6, 7};
const uint8_t DIGITAL_OUTPUTS[] = {8, 9, 10, 11, 12, 13, 14, 15};
// KEEP ONLY:
const uint8_t ANALOG_INPUTS[] = {26, 27, 28};
```

**UPDATE** Config struct (if needed) - check if already has IO settings:
- Likely need to add field for I/O config file path (or keep default `/io_config.json`)

**ADD** new struct for I/O configuration:
```cpp
struct IOPin {
    uint8_t gpPin;
    char label[32];
    char mode[16];           // "input", "output", "i2c", "uart", "unused"
    bool pullup;             // For inputs
    bool invert;             // For inputs/outputs
    bool latch;              // For inputs (latching behavior)
    bool latched;            // Current latch state
    bool initialState;       // For outputs
    bool currentState;       // Current output state
    uint16_t modbusRegister; // Associated register
    char protocol[16];       // "I2C", "UART", "One-Wire", "SPI", etc.
    int pairedPin;           // For I2C/UART pairs
};

struct IORule {
    char id[16];
    bool enabled;
    char description[64];
    
    // Trigger condition
    uint16_t triggerModbusRegister;
    char triggerCondition[4];  // "==", "<", ">", "<=", ">=", "!="
    int triggerValue;
    
    // Action to take
    char actionType[32];  // "set_output", "set_output_and_latch", "pulse_output"
    bool actionValue;
    uint16_t actionDuration;  // For pulse actions (ms)
    uint8_t priority;
};

struct IOConfig {
    uint8_t version;
    IOPin digitalPins[28];      // Max 28 pins (excluding reserved: 16-21, 22)
    uint8_t digitalPinCount;
    IORule rules[50];           // Max 50 automation rules
    uint8_t ruleCount;
    // Analog pins stay fixed
};
```

### 3.2 main.cpp Changes

#### 3.2.1 New Functions to Add

```cpp
// Loading and saving
void loadIOConfig();                    // Parse io_config.json
void saveIOConfig();                    // Save io_config.json to filesystem
void applyIOConfigToPins();             // Apply mode/pullup/invert/initial states
void initializeIOPins();                // Set all pins to configured modes

// Rules engine
void evaluateIOAutomationRules();       // Check all rules, execute matching ones
void executeIORule(const IORule& rule);  // Perform rule action
bool checkRuleTrigger(const IORule& rule); // Evaluate trigger condition

// Digital I/O operations
void setDigitalOutput(uint8_t pin, bool state, bool allowLatch = false);
void getDigitalInput(uint8_t pin, bool& state);
void resetIOLatch(uint8_t pin);
void resetAllIOLatches();

// Modbus sync
void updateIOStatusFromModbus();        // Sync Modbus register states to I/O
void updateModbusFromIOStatus();        // Sync I/O states to Modbus registers
```

#### 3.2.2 Setup() Changes
- Call `loadIOConfig()` after `loadSensorConfig()`
- Call `applyIOConfigToPins()` to set pin modes
- Call `initializeIOPins()` to set initial output states

#### 3.2.3 Loop() Changes
- Call `evaluateIOAutomationRules()` at appropriate frequency (e.g., every 100ms)
- Sync I/O state changes to Modbus registers

### 3.3 Web UI Changes (data/index.html & data/script.js)

#### 3.3.1 modify I/O Configuration Section

**HTML Structure:**
```html
<!-- I/O Configuration Panel -->
<section id="io-config-section">
  <h2>GPIO Configuration</h2>
  
  <!-- Pin Grid: Display all available pins -->
  <div id="gpio-pins-grid" class="pins-grid">
    <!-- Generated by JavaScript -->
  </div>
  
  <!-- Automation Rules Section -->
  <div id="automation-rules-section">
    <h3>Automation Rules</h3>
    <button id="add-rule-btn">+ Add Rule</button>
    <div id="rules-list">
      <!-- Generated by JavaScript -->
    </div>
  </div>
  
  <!-- Rule Modal (for adding/editing) -->
  <div id="rule-modal" class="modal">
    <div class="modal-content">
      <h3>Automation Rule</h3>
      <label>Description: <input type="text" id="rule-description"></label>
      
      <label>Trigger Condition:
        <select id="rule-trigger-register">
          <!-- Populated with available registers -->
        </select>
        <select id="rule-trigger-condition">
          <option value="==">=</option>
          <option value="<"><</option>
          <option value=">">></option>
          <option value="<=">&lt;=</option>
          <option value=">=">&gt;=</option>
          <option value="!=">!=</option>
        </select>
        <input type="number" id="rule-trigger-value">
      </label>
      
      <label>Action:
        <select id="rule-action-type">
          <option value="set_output">Set Output</option>
          <option value="set_output_and_latch">Set & Latch Output</option>
          <option value="pulse_output">Pulse Output</option>
        </select>
        <select id="rule-action-output-pin">
          <!-- Populated with output pins -->
        </select>
        <select id="rule-action-value">
          <option value="true">ON</option>
          <option value="false">OFF</option>
        </select>
        <input type="number" id="rule-pulse-duration" placeholder="Duration (ms)">
      </label>
      
      <label><input type="checkbox" id="rule-enabled"> Enabled</label>
      
      <button id="save-rule-btn">Save Rule</button>
      <button id="cancel-rule-btn">Cancel</button>
    </div>
  </div>
</section>
```

#### 3.3.2 JavaScript Logic

**New API Endpoints to Support:**
```javascript
// GET /io/config - Retrieve current I/O configuration
fetch('/io/config')
  .then(r => r.json())
  .then(config => {
    renderIOPinsGrid(config.digitalPins);
    renderAutomationRules(config.rules);
  });

// POST /io/config - Save updated I/O configuration
fetch('/io/config', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(ioConfig)
});

// POST /io/output - Set digital output immediately
fetch('/io/output', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ pin: 8, state: true })
});

// POST /io/rule - Add/update automation rule
// DELETE /io/rule/{ruleId} - Delete rule
```

**UI Rendering Functions:**
```javascript
function renderIOPinsGrid(pins) {
  // For each pin:
  // - Show current state
  // - Show mode indicator (input/output/i2c/unused)
  // - If input: show pullup, invert, latch checkboxes
  // - If output: show set ON/OFF buttons, initial state
  // - If i2c/uart: show protocol label (locked)
  // - Allow renaming pin label
}

function renderAutomationRules(rules) {
  // List all rules with enable/disable toggle
  // Show rule description, trigger, action
  // Edit/delete buttons for each
}

function showRuleModal(existingRule = null) {
  // Modal dialog for creating/editing rules
  // Dropdowns populated from current Modbus registers
  // Action dropdowns filtered based on output pins
}
```

---

## 4. Implementation Phases

### Phase 1: Backend Infrastructure ✓ (Planned)
- [ ] Add `IO_PIN` and `IO_RULE` structs to sys_init.h
- [ ] Create `io_config.json` schema documentation
- [ ] Remove hardcoded pin arrays from sys_init.h
- [ ] Implement `loadIOConfig()`, `saveIOConfig()`
- [ ] Implement pin mode initialization (`applyIOConfigToPins()`)
- [ ] Implement basic I/O operations (setOutput, getInput, resetLatch)

### Phase 2: Automation Rules Engine (Planned)
- [ ] Implement `evaluateIOAutomationRules()` main loop
- [ ] Implement `checkRuleTrigger()` condition evaluation
- [ ] Implement `executeIORule()` action execution
- [ ] Implement rule priority execution
- [ ] Add pulse/timed action support

### Phase 3: Modbus Integration (Planned)
- [ ] Update Modbus server to expose I/O registers from io_config.json
- [ ] Implement `updateModbusFromIOStatus()` (read I/O → Modbus)
- [ ] Implement `updateIOStatusFromModbus()` (write Modbus → I/O)
- [ ] Handle bidirectional register updates

### Phase 4: Web UI Frontend (Planned)
- [ ] Create I/O Configuration section in index.html
- [ ] Implement pin grid renderer with dynamic UI
- [ ] Implement automation rules editor modal
- [ ] Add API endpoint handlers in main.cpp (`handleIOConfig`, `handleIOOutput`, `handleIORule`)
- [ ] Implement real-time updates (WebSocket or polling)

### Phase 5: Testing & Validation (Planned)
- [ ] Unit test individual rules evaluation
- [ ] Integration test: Multiple rules firing
- [ ] Integration test: Output state changes reflected in Modbus
- [ ] Hardware test: Actual GPIO state changes
- [ ] Conflict resolution test: Rules + manual output commands

---

## 5. Coexistence Model: External Modbus Control

### Overview
The **Coexistence Model** enables bidirectional control of I/O pins via Modbus registers while maintaining automation rules. External SCADA systems can manually override pin states in real-time, and the device reflects all state changes (rule-driven or external) back to the Modbus registers.

### Architecture
```
┌─────────────────────────────────────────────────┐
│   Automation Rules Engine (evaluateIOAutomationRules)  │
└────────┬────────────────────────────┬───────────┘
         │                            │
    ┌────▼──────────────┐        ┌───▼────────────────┐
    │ applyExternal     │        │ Rule Evaluation    │
    │ ModbusOverride()  │        │ (if no override)   │
    └────┬──────────────┘        └───┬────────────────┘
         │                            │
         └────────┬───────────────────┘
                  │
         ┌────────▼─────────┐
         │ GPIO Pin State   │
         │ (digitalWrite)   │
         └────────┬─────────┘
                  │
         ┌────────▼──────────────────┐
         │ Write State to Modbus     │
         │ Holding Register (1 or 0) │
         └───────────────────────────┘
```

### Execution Flow

**Every loop cycle, the system:**

1. **Check for External Override** (`applyExternalModbusOverride()`)
   - Read configured Modbus holding register for each pin
   - If value changed (0 or 1), apply immediately to GPIO
   - Log external override with source register
   - **Priority:** External writes bypass automation rules this cycle

2. **Evaluate Automation Rules** (if no external override)
   - Read trigger condition from Modbus registers
   - If rule condition met, execute action (SET, TOGGLE, PULSE, LATCH)
   - Update GPIO pin state
   - Write result back to holding register

3. **State Feedback Loop**
   - After any state change (rule or external), write 1 or 0 to configured holding register
   - External SCADA sees current state immediately
   - Enables real-time monitoring and verification

### Register Mapping

Each configured output pin uses a **Modbus Holding Register** for bidirectional communication:

| Register | From Device | To Device | Value |
|----------|-------------|-----------|-------|
| Holding Reg N | GPIO State (1=ON, 0=OFF) | External Command | 0 or 1 |

**Example:** Pin GP8 configured with register 200
- Device writes GPIO state to holding register 200 after rule execution
- SCADA writes 1 to register 200 to turn pump ON
- Device reads register 200 at start of next cycle and immediately sets GP8 to 1
- Device updates register 200 with actual GPIO state for verification

### Use Cases

#### 1. Emergency Stop (SCADA Override)
```
Rule: If temp > 100 THEN pump ON
SCADA: Sees temp rising, writes 0 to pump register 200
Device: Immediately sets GPIO to 0 (pump OFF), bypassing rule
Result: Emergency stop works even if rules are active
```

#### 2. Manual Maintenance Mode
```
Technician: Needs to test pump wiring
SCADA: Write 1 to register 200 → pump ON
Device: Applies manually, can repeat as needed
Result: Manual control without changing rules or firmware
```

#### 3. State Verification
```
Rule: Executed SET pump ON
Device: Writes 1 to register 200
SCADA: Reads register 200, sees 1
Result: SCADA confirms rule executed correctly
```

#### 4. Integrated Monitoring
```
Multiple rules: Pressure rule, Temperature rule, Manual override
Device: All state changes written to registers
SCADA Dashboard: Displays actual vs. requested state
Result: Full observability of I/O control logic
```

### Implementation Details

**Function: `applyExternalModbusOverride()`**
- Called **first** in each automation cycle
- Checks each configured output pin's holding register
- If value is 0 or 1 and differs from current state:
  - Apply to GPIO immediately
  - Log override with timestamp
  - Skip rule evaluation for this pin this cycle
- Handles pin inversion: external 1 → GPIO writes inverted state

**State Write After Rules**
- After executing SET, TOGGLE, or LATCH actions
- Write result (0 or 1) back to configured holding register
- Enables external verification and monitoring
- Accessible to all connected Modbus clients

**Multi-Client Support**
- External overrides checked from any connected Modbus client
- State feedback written to first connected client
- Prevents conflicts: first client to connect "owns" control

### Configuration

Add `modbusRegister` field to each IOPin in `io_config.json`:

```json
{
  "pins": [
    {
      "gpPin": 8,
      "label": "Pump Control",
      "mode": "output",
      "modbusRegister": 200,
      "currentState": false,
      "invert": false,
      "rules": [
        {
          "id": 1,
          "description": "Turn ON if pressure > 100",
          "trigger": {
            "modbusRegister": 50,
            "condition": ">",
            "triggerValue": 100
          },
          "action": {
            "type": "set_output",
            "value": true
          }
        }
      ]
    }
  ]
}
```

**Web UI:** 
- Add field for Modbus register number in "Add Output Pin" modal
- Display current register value in status dashboard
- Optional: Show "override pending" indicator if external write detected

---

## 5. Migration Path from Old System

### Before Integration
- Old system: sys_init.h hardcoded pins + Config struct I/O fields
- Code references: `DIGITAL_INPUTS[i]`, `DIGITAL_OUTPUTS[i]`

### Migration Steps
1. **Create default io_config.json** from current hardcoded values
2. **Update all pin references** in code: `configuredSensors[i].outputPin` → `ioConfig.digitalPins[pin].currentState`
3. **Add backward compatibility** in loadIOConfig() to import old Config.diPullup[] settings
4. **Deprecate** old pin arrays and Config I/O fields
5. **Test** with existing sensor configurations to ensure no conflicts

---

## 6. Conflict Resolution Strategy

### Pin Conflict Detection
When loading sensors:
- Check if any sensor's pin pair overlaps with I/O pins
- If conflict detected:
  - Log warning with specific pins
  - Disable conflicting I/O pin (set mode to "disabled")
  - Warn user via web UI
  - Provide UI button to auto-resolve (suggests pin swaps)

### Auto-Resolution Algorithm
- Offer alternative pin pairs for I2C/UART sensors
- Offer alternative pins for I/O (if available)
- User approves/rejects suggestion
- Save resolved configuration

---

## 7. API Endpoints (REST)

| Method | Path | Handler | Purpose |
|--------|------|---------|---------|
| GET | `/io/config` | `handleGetIOConfig` | Get current I/O configuration |
| POST | `/io/config` | `handleSetIOConfig` | Save I/O configuration (validate, check conflicts) |
| POST | `/io/output` | `handleSetOutput` | Immediately set digital output |
| POST | `/io/reset-latch` | `handleResetLatch` | Clear latch on input pin |
| POST | `/io/reset-latches` | `handleResetLatches` | Clear all input latches |
| GET | `/io/rules` | `handleGetIORule` | Get automation rules |
| POST | `/io/rules` | `handleAddIORule` | Add/update automation rule |
| DELETE | `/io/rules/{ruleId}` | `handleDeleteIORule` | Delete automation rule |
| POST | `/io/rules/execute` | `handleManualRuleExecution` | Manually trigger rule for testing |

---

## 8. Data Storage Strategy

### File Organization
```
LittleFS (Pico Flash Storage)
├── /config.json          (Network, Modbus settings) ~ 512 bytes
├── /sensors.json         (Sensor configurations) ~ 4KB
└── /io_config.json       (I/O pins + rules) ~ 4KB
```

### Size Constraints
- **Max 28 GPIO pins** (minus reserved: 16-21, 22) = realistic ~20 configurable
- **Per-pin overhead**: ~200 bytes (label, mode, state, flags)
- **Per-rule overhead**: ~150 bytes
- **Total I/O config**: ~4KB (20 pins + 50 rules)
- **Total system**: ~10KB (comfortable within Pico LittleFS space)

---

## 9. Default Configuration

On first boot (no io_config.json):
```json
{
  "version": 1,
  "digital_pins": [
    { "gpPin": 0, "label": "DI-0", "mode": "input", ... },
    { "gpPin": 1, "label": "DI-1", "mode": "input", ... },
    ...
    { "gpPin": 7, "label": "DI-7", "mode": "input", ... },
    { "gpPin": 8, "label": "DO-0", "mode": "output", ... },
    ...
    { "gpPin": 15, "label": "DO-7", "mode": "output", ... },
    { "gpPin": 4, "label": "SDA-I2C0", "mode": "i2c", ... },
    { "gpPin": 5, "label": "SCL-I2C0", "mode": "i2c", ... }
  ],
  "rules": []
}
```

---

## 10. Exception: Reserved/Fixed Pins

**Always Reserved:**
- GP16-GP21: Ethernet (W5500)
- GP22: LED

**Always ADC-Only (no GPIO):**
- ADC 0-2: (GP26, GP27, GP28)

**Configurable for Any Protocol:**
- GP0-GP15 (minus any reserved in user's hardware)
- Can be assigned: Digital I/O, I2C, UART, SPI, One-Wire sensors, etc.

---

## 11. Testing Checklist

- [ ] **Config Persistence**: Write io_config.json, power cycle, verify restored
- [ ] **Pin Conflict Detection**: Add I2C sensor to GP0, verify I/O pin disabled with warning
- [ ] **Rule Evaluation**: Configure rule "if register 50 > 100, set GP8 ON", trigger condition, verify GPIO state
- [ ] **Modbus Integration**: Set output via REST API, verify Modbus register updates
- [ ] **UI Pin Display**: Verify all pins show correct current state in grid
- [ ] **Latch Behavior**: Enable latch on input, trigger, verify stays ON until reset
- [ ] **Rule Priority**: Multiple rules same trigger, verify execute in priority order
- [ ] **Backward Compatibility**: Old config.json I/O settings imported correctly

---

## 12. Future Enhancements

- [ ] **Complex Logic**: AND/OR conditions between multiple registers
- [ ] **Timed Actions**: Delay before executing rule action
- [ ] **Statistics**: Count rule executions, pin state changes
- [ ] **Scheduling**: Time-based rules (e.g., "turn pump on at 6 AM")
- [ ] **Notifications**: Alert via email/webhook when rule fires
- [ ] **PLC-like Interface**: Ladder logic visual editor
- [ ] **Historical Data**: Log I/O state changes to SD card
- [ ] **Interlock Logic**: Prevent conflicting outputs (e.g., motor CW + CCW)

---

## 13. Success Criteria

✅ **All I/O configuration is dynamic** (no recompilation needed)  
✅ **Web UI shows actual GP pin numbers** (not generic "DI-0")  
✅ **No pin conflicts** between sensors and I/O  
✅ **Automation rules fully functional** (register conditions → output actions)  
✅ **Backward compatible** with existing sensor configurations  
✅ **Modbus registers reflect I/O states** (read/write)  
✅ **System boots and operates with zero hardcoded I/O pins**  

---

## 14. Rollback Plan

If issues discovered:
1. Keep old `sys_init.h` backup with hardcoded arrays commented
2. Build feature flag: `#define USE_LEGACY_IO_PINS 0` (default: new system)
3. If needed, revert to legacy by setting flag to 1
4. Gradually migrate code sections once new system proven stable

---

## References & Related Files

- **Current Architecture**: `copilot-instructions.md` (Section 3: Code Index)
- **I2C Bus Manager**: `include/i2c_bus_manager.h` (already created)
- **Sensor Config**: `include/sys_init.h` - `struct SensorConfig`
- **Web UI**: `data/index.html`, `data/script.js`
- **Modbus Mapping**: Section 6 in `copilot-instructions.md`

---

**Next Step:** Proceed to Phase 1 implementation once this plan is approved.
