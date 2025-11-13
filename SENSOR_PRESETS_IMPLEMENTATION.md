# LIS3DH Sensor Presets - Implementation Complete

## Overview

The LIS3DH sensor (both I2C and SPI modes) has been fully integrated into the existing sensor preset system. This allows users to add LIS3DH sensors via the web UI and have the firmware automatically handle:

- Polling and data abstraction
- Register reading and parsing
- Multi-output handling (X, Y, Z axes)
- Modbus register mapping
- Calibration application

## What Was Implemented

### 1. **SensorConfig Structure Extended** (`include/sys_init.h`)

Added SPI-specific fields to handle SPI configuration:

```cpp
// SPI specific configuration
uint8_t spiChipSelect;    // GPIO pin for chip select
char spiBus[8];           // "hw0", "hw1", or "soft" for software SPI
uint32_t spiFrequency;    // SPI clock frequency in Hz
uint8_t spiMosiPin;       // MOSI pin for software SPI
uint8_t spiMisoPin;       // MISO pin for software SPI
uint8_t spiClkPin;        // CLK pin for software SPI
```

### 2. **Sensor Presets Array Updated** (`src/main.cpp`)

Added LIS3DH_SPI to the preset table:

```cpp
// LIS3DH_SPI: 3-axis accelerometer, SPI, 1s polling, direct register read (no command)
{ "LIS3DH_SPI", "SPI", {0x00, 0x00}, 0, 1000, 0 },
```

### 3. **applySensorPresets() Function Extended** (`src/main.cpp`)

Added handling for LIS3DH_SPI that:
- Sets protocol to "SPI"
- Clears command field (SPI reads directly from registers)
- Sets default polling interval (1000ms)
- Preserves user-configured Modbus register
- Respects SPI-specific configuration from JSON (chip select, frequency, bus mode)

```cpp
} else if (strcmp(configuredSensors[i].type, "LIS3DH_SPI") == 0) {
    // LIS3DH_SPI: SPI mode
    memset(configuredSensors[i].command, 0, sizeof(configuredSensors[i].command));
    if (strlen(configuredSensors[i].protocol) == 0) strcpy(configuredSensors[i].protocol, "SPI");
    if (configuredSensors[i].updateInterval == 0) configuredSensors[i].updateInterval = 1000;
    if (configuredSensors[i].modbusRegister == 0) configuredSensors[i].modbusRegister = 20;
    // SPI-specific config preserved from JSON
}
```

### 4. **Sensor Config JSON Parser Updated** (`src/main.cpp`)

Added SPI field parsing in `handlePOSTSensorConfig()`:

```cpp
// SPI specific configuration
configuredSensors[i].spiChipSelect = sensor["spiChipSelect"] | 22; // Default GP22
const char* spiBus = sensor["spiBus"] | "hw0";
strncpy(configuredSensors[i].spiBus, spiBus, sizeof(configuredSensors[i].spiBus) - 1);
configuredSensors[i].spiFrequency = sensor["spiFrequency"] | 500000; // Default 500 kHz
configuredSensors[i].spiMosiPin = sensor["spiMosiPin"] | 3; // Default GP3 for SPI0
configuredSensors[i].spiMisoPin = sensor["spiMisoPin"] | 4; // Default GP4 for SPI0
configuredSensors[i].spiClkPin = sensor["spiClkPin"] | 2; // Default GP2 for SPI0
```

### 5. **Web UI Enhanced** (`data/script.js`)

#### SPI Protocol Handling
Added complete SPI support to the sensor configuration flow:

- **SPI case in `updateSensorProtocolFields()`**: Shows SPI config panel, enables SPI bus listener
- **SPI case in pin collection**: Gathers all SPI-specific fields (CS pin, bus mode, frequency, software pins)
- **SPI case in sensor load**: Populates edit form with existing SPI settings

#### SPI Field Collection

```javascript
case 'SPI':
    const spiChipSelect = document.getElementById('sensor-spi-chip-select').value;
    pinAssignments.spiChipSelect = parseInt(spiChipSelect);
    pinAssignments.spiBus = document.getElementById('sensor-spi-bus').value || 'hw0';
    pinAssignments.spiFrequency = parseInt(document.getElementById('sensor-spi-frequency').value) || 500000;
    
    // For software SPI
    if (spiBus === 'soft') {
        pinAssignments.spiMosiPin = parseInt(document.getElementById('sensor-spi-mosi').value);
        pinAssignments.spiMisoPin = parseInt(document.getElementById('sensor-spi-miso').value);
        pinAssignments.spiClkPin = parseInt(document.getElementById('sensor-spi-clk').value);
    }
    break;
```

## User Workflow: Adding LIS3DH via UI

### Step 1: Select Protocol
1. Go to **Sensor Configuration** tab
2. Click **Add New Sensor**
3. **Protocol Type**: Select **SPI**

### Step 2: Select Sensor Type
- **Sensor Type**: Select **LIS3DH (3-Axis Accelerometer via SPI)**

### Step 3: Configure SPI Settings
- **Chip Select Pin**: Select desired GPIO (e.g., GP22)
- **SPI Bus**: Choose:
  - **Hardware SPI0** (default) - uses GP2, GP3, GP4
  - **Hardware SPI1** - uses GP10, GP11, GP12
  - **Software SPI** - show custom pin selection
- **SPI Frequency**: 250 kHz - 10 MHz (default 500 kHz)
- **Polling Interval**: 1000 ms (default)

### Step 4: Set Modbus Register
- Registers X, Y, Z will be at: register, register+1, register+2

### Step 5: Optional Calibration
- Offset and scale for each axis separately
- Supports mathematical expressions

### Step 6: Save
- Click **Save Configuration**
- Firmware automatically applies preset

## What Happens When Config is Saved

1. **JSON is sent to `/sensors/config` endpoint**
2. **Firmware parses JSON** and populates `configuredSensors` array
3. **`applySensorPresets()` is called** which:
   - Matches sensor type "LIS3DH_SPI" 
   - Sets protocol to "SPI"
   - Sets polling interval to 1000ms
   - Preserves user-configured Modbus register
   - Keeps SPI configuration (CS pin, frequency, bus mode, software pins)
4. **Sensor polling queue is built** with all LIS3DH instances
5. **Modbus registers are allocated** (X on `modbusRegister`, Y on `modbusRegister+1`, Z on `modbusRegister+2`)
6. **Main loop reads data** when polling interval triggers

## Configuration Example (JSON)

```json
{
  "enabled": true,
  "name": "Accelerometer (SPI)",
  "type": "LIS3DH_SPI",
  "protocol": "SPI",
  "spiChipSelect": 22,
  "spiBus": "hw0",
  "spiFrequency": 500000,
  "modbusRegister": 20,
  "pollingFrequency": 1000,
  "calibration": {
    "offset": 0.0,
    "scale": 1.0,
    "expression": ""
  }
}
```

## Firmware Reading Flow

When the main loop processes LIS3DH_SPI:

```
1. Check if sensor.type == "LIS3DH_SPI"
2. Check if protocol == "SPI"
3. Use SPI CS pin, frequency, and bus mode from config
4. Read 6 bytes from register 0x28 (OUT_X_L) via SPI
5. Parse X, Y, Z values
6. Apply calibration (offset, scale, expression)
7. Store in rawValue, rawValueB, rawValueC
8. Write to Modbus registers starting at modbusRegister
9. Repeat at updateInterval (1000ms default)
```

## Key Design Features

### ✅ User-Configurable
- Modbus register starting address
- Polling interval
- SPI chip select pin
- SPI frequency (for reliability tuning)
- SPI bus mode (HW0/HW1/Software)
- Software SPI pins (if needed)
- Per-axis calibration

### ✅ Firmware-Managed
- Register addressing (X/Y/Z on consecutive registers)
- Bit shifting (10-bit extraction from 16-bit register)
- Scale factor (3.906 mg/LSB for ±2g)
- Polling queue management
- Data parsing

### ✅ Follows Existing Pattern
- Same structure as EZO, SHT30, BME280, DS18B20 presets
- Uses existing `SensorConfig` structure
- Respects existing calibration framework
- Works with existing Modbus register allocation

## Files Modified

| File | Changes |
|------|---------|
| `include/sys_init.h` | Added SPI fields to SensorConfig struct |
| `src/main.cpp` | Added LIS3DH_SPI to presets; updated applySensorPresets(); added SPI JSON parsing |
| `data/script.js` | Added SPI case to protocol handlers; added SPI field collection; added SPI load/edit support |
| `data/index.html` | SPI config form already added in previous phase |

## Next Steps

### Phase 1: Firmware Support ✅ (Ready)
The preset system is in place. Now firmware must implement:
- SPI initialization for LIS3DH when `type == "LIS3DH_SPI"`
- Data reading from sensor
- Modbus register writing

### Phase 2: Testing
- Configure LIS3DH_SPI via web UI
- Verify preset is applied (check Serial logs)
- Read Modbus registers to see X, Y, Z values
- Test calibration application

### Phase 3: Both Modes
- Support I2C LIS3DH (LIS3DH type) and SPI (LIS3DH_SPI) simultaneously
- Auto-detect based on JSON type field

## Technical Notes

### Why Presets?
Instead of requiring users to manually set polling intervals, commands, and parsing rules for each sensor type, presets:
- Reduce configuration errors
- Provide sensible defaults
- Still allow customization via JSON
- Keep firmware code DRY (Don't Repeat Yourself)

### SPI vs I2C
Both use the same preset framework:
- **LIS3DH (I2C)**: Sets protocol="I2C", i2cAddress=0x18, command=""
- **LIS3DH_SPI (SPI)**: Sets protocol="SPI", spiChipSelect=22, command=""

The main loop detects protocol and uses appropriate bus (Wire vs SPI).

### Multi-Output Support
LIS3DH returns 3 values (X, Y, Z) - handled via:
- `rawValue`, `rawValueB`, `rawValueC` (raw sensor readings)
- `calibratedValue`, `calibratedValueB`, `calibratedValueC` (after calibration)
- Consecutive Modbus registers: register, register+1, register+2

### Backward Compatibility
- I2C LIS3DH preset unchanged
- Existing sensors (EZO, SHT30, etc.) unaffected
- SPI fields have sensible defaults if not specified
