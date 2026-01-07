# Coexistence Model Testing Guide

This document describes how to test the coexistence model for output pin control via Modbus registers and automation rules.

## Overview

The coexistence model allows:
1. **Web UI** to set output pins directly (legacy method)
2. **Modbus Rules** to control pins based on other register conditions
3. **External SCADA** to override/lock the logic by writing to the monitoring register

## Architecture

- Each `IOPin` has a `modbusRegister` field that acts as both:
  - **Control/Monitoring Register**: External system can read/write to it
  - **State Feedback**: The current pin state is written here by rules

- When `modbusRegister == 0`, no override capability exists
- When `modbusRegister > 0`, external writes are monitored

## Test Scenarios

### Test 1: UI Set Output → Modbus Register Updated

**Objective**: Verify that setting a pin via web UI updates the Modbus holding register

**Steps**:
1. Configure an output pin (e.g., GP8) with:
   - `isInput`: false
   - `modbusRegister`: 100 (or any unused register)
2. Set the pin HIGH via web UI: POST `/setoutput?output=0&state=1`
3. Read the Modbus holding register 100 using a Modbus client
4. **Expected**: Register 100 should contain `1`

**Verification Code** (using modbus-client in Python):
```python
from pymodbus.client.sync import ModbusTcpClient as ModbusClient

client = ModbusClient('192.168.1.10', port=502)
client.connect()

# Read register 100 (where GP8 state is monitored)
result = client.read_holding_registers(100, 1)
print(f"Register 100: {result.registers[0]}")  # Should be 1 if GP8 is HIGH
```

### Test 2: Automation Rule → Modbus Register Updated

**Objective**: Verify that rules update the Modbus register when triggered

**Steps**:
1. Create a rule on output pin GP8:
   - Condition: IF Register 50 == 100 (some trigger register)
   - Action: SET OUTPUT to HIGH
   - Register GP8's state to register 100
2. Write value 100 to register 50 via Modbus client
3. Check register 100 at GP8
4. **Expected**: 
   - Rule triggers when register 50 becomes 100
   - Register 100 updates to 1 (HIGH)
   - GPIO pin GP8 goes HIGH

**Python Test**:
```python
from pymodbus.client.sync import ModbusTcpClient as ModbusClient

client = ModbusClient('192.168.1.10', port=502)
client.connect()

# Write trigger value to register 50
client.write_registers(50, [100])
time.sleep(0.1)  # Wait for rule evaluation (~50ms)

# Check result at register 100
result = client.read_holding_registers(100, 1)
print(f"Register 100 after rule: {result.registers[0]}")  # Should be 1

# Check GPIO physically with multimeter
```

### Test 3: LOCK - Write 0 to Monitoring Register

**Objective**: Verify that writing 0 to the monitoring register locks the pin OFF and disables rules

**Steps**:
1. Start with GP8 in a rule-controlled state (HIGH from rule)
2. Write 0 to register 100 (the monitoring register) via Modbus:
   ```python
   client.write_registers(100, [0])
   ```
3. Check Serial output for: `[External Override] GP%d LOCKED OFF via register`
4. Try to trigger the rule again (write to register 50)
5. **Expected**:
   - GPIO pin GP8 immediately goes LOW (off) 
   - Serial shows LOCKED message
   - Rules DO NOT execute while locked
   - GPIO stays LOW even if rule condition is met

**Expected Serial Output**:
```
[External Override] GP8 LOCKED OFF via register 100 (write 0)
[IO Rule DEBUG] GP8 Rule 'My Rule': ... (rule will evaluate but be skipped due to externallyLocked)
```

### Test 4: UNLOCK - Write Non-Zero to Monitoring Register

**Objective**: Verify that writing non-zero to the monitoring register unlocks the pin and restores rule control

**Steps**:
1. Pin is currently LOCKED (from Test 3)
2. Write any non-zero value to register 100 via Modbus:
   ```python
   client.write_registers(100, [1])
   ```
3. Check Serial output for: `[External Override] GP%d UNLOCKED via register`
4. Trigger the rule again (write 100 to register 50)
5. **Expected**:
   - Serial shows UNLOCKED message
   - Rules re-activate
   - GPIO pin responds to rule conditions again
   - Rule execution is visible in serial logs

**Expected Serial Output**:
```
[External Override] GP8 UNLOCKED via register 100 (write 1)
[IO Rule DEBUG] GP8 Rule 'My Rule': ALL CONDITIONS MET
[IO Rule] FOLLOW_CONDITION: Rule 'My Rule' GP8 = HIGH
```

### Test 5: Consistency Check - Multiple Clients

**Objective**: Verify coexistence works correctly with multiple connected Modbus clients

**Steps**:
1. Connect Client A (sets rules, reads states)
2. Connect Client B (external SCADA, sends lock command)
3. Client A: Set up a rule on GP8
4. Client A: Trigger rule → GP8 should go HIGH, register 100 should show 1
5. Client B: Write 0 to register 100 → `[External Override] LOCKED` message
6. Client A: Rule triggers again → GP8 stays LOW (locked)
7. Client B: Write 1 to register 100 → `[External Override] UNLOCKED` message
8. Client A: Rule triggers → GP8 goes HIGH again
9. **Expected**: Both clients see consistent state

### Test 6: UI Override After External Lock

**Objective**: Verify that Web UI can also trigger unlock

**Steps**:
1. Pin is LOCKED (write 0 to register 100)
2. Use POST `/api/unlock-pin` endpoint:
   ```
   POST /api/unlock-pin
   Content-Type: application/json
   {"gpPin": 8}
   ```
3. **Expected**:
   - Serial shows: `[Web UI] GP8 UNLOCKED via web interface`
   - `externallyLocked` flag is cleared
   - Rules resume control
   - Equivalent to writing non-zero to register 100

## Debugging Checklist

- [ ] Pin has `modbusRegister` configured in `io_config.json` (not 0)
- [ ] At least one Modbus client is connected (`connectedClients > 0`)
- [ ] Serial monitor shows debug messages for rule evaluation
- [ ] Modbus register reads show correct values using a client tool
- [ ] GPIO pin state matches register value
- [ ] `externallyLocked` flag transitions correctly in Serial output
- [ ] Both Web UI and Modbus register write operations update the lock state

## Expected Behavior Summary

| Action | State | Register | Pin | Rule Exec |
|--------|-------|----------|-----|-----------|
| Rule triggers (locked=false) | HIGH | 1 | HIGH | YES |
| Write 0 to register | LOCKED | 0 | LOW | NO |
| Write 1 to register | UNLOCKED | 1 | Per rule | YES |
| Set via Web UI | (state) | (state) | (state) | NO* |

*Web UI sets state directly, bypassing rules but updating register for monitoring

## Serial Debug Output Examples

### Successful Lock/Unlock Cycle
```
[External Override] GP8 LOCKED OFF via register 100 (write 0)
[IO Rule DEBUG] GP8 Rule 'Pump Control': ...
[IO Rule DEBUG] GP8 Rule 'Pump Control': ALL CONDITIONS MET
[External Override] GP8 UNLOCKED via register 100 (write 1)
[IO Rule DEBUG] GP8 Rule 'Pump Control': FOLLOW_CONDITION: Rule 'Pump Control' GP8 = HIGH
```

### Successful Web UI Write to Register
```
[Web UI] GP8 state written to Modbus register 100: 1
```

## Common Issues & Solutions

### Issue: Register not updating after UI change
- **Cause**: Pin not found in `ioConfig.pins` array or `modbusRegister` is 0
- **Fix**: Check `io_config.json` - ensure pin is defined with non-zero `modbusRegister`

### Issue: Lock/Unlock not working
- **Cause**: No Modbus clients connected (`connectedClients == 0`)
- **Fix**: Verify Modbus client connection in Serial output before testing

### Issue: Rules still execute when locked
- **Cause**: `externallyLocked` flag not checked in rule evaluation
- **Fix**: Check line 4227 in main.cpp - should skip pins with `externallyLocked == true`

### Issue: Pin state goes to wrong level when locked
- **Cause**: Invert logic not applied correctly
- **Fix**: When locking, code uses `ioPin.invert ? HIGH : LOW` which is correct

## Configuration Example

Add this to `io_config.json` for testing:

```json
{
  "version": 1,
  "pins": [
    {
      "gpPin": 8,
      "label": "Pump Output",
      "isInput": false,
      "pullup": false,
      "invert": false,
      "latched": false,
      "modbusRegister": 100,
      "ruleCount": 1,
      "rules": [
        {
          "description": "Pump Control",
          "enabled": true,
          "priority": 1,
          "trigger": {
            "conditionCount": 1,
            "conditions": [
              {
                "modbusRegister": 50,
                "condition": "==",
                "triggerValue": 100,
                "nextOperator": "AND"
              }
            ]
          },
          "action": {
            "type": "FOLLOW_CONDITION",
            "value": 1,
            "pulseDurationMs": 0
          }
        }
      ]
    }
  ],
  "pinCount": 1
}
```

---

**Last Updated**: 2025-11-25
**Status**: Ready for testing
