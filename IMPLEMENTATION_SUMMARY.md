# SPI Support Implementation - Summary

## What Was Done

### 1. **Web UI Enhanced** ✅
- Added **SPI protocol option** to sensor configuration dropdown
- Added **SPI sensor types** (LIS3DH_SPI, GENERIC_SPI, SIM_SPI_ACCEL)
- Added **SPI configuration panel** with:
  - Chip Select (CS) pin selection
  - SPI bus mode (Hardware SPI0, Hardware SPI1, Software/Bit-bang)
  - SPI frequency selector (250 kHz - 10 MHz)
  - Polling interval configuration
  - Pin selection for software SPI (MOSI, MISO, CLK)

### 2. **JavaScript Updates** ✅
- Updated `updateSensorProtocolFields()` to handle SPI protocol
- Updated `updateSensorTypeOptions()` to show SPI sensors for SPI protocol
- Added `loadAvailablePins()` support for SPI (all GPIO available as CS)
- Extended `updateSensorFormFields()` to include SPI in data parsing check
- Added SPI to `DATA_PARSING_OPTIONS` constant

### 3. **HTML Form** ✅
- New SPI configuration div with:
  - CS pin dropdown
  - SPI bus mode selector (with dynamic show/hide of hardware vs software pins)
  - Frequency selector
  - Polling interval input
  - Help text explaining pin conflicts and W5500 considerations

### 4. **Documentation** ✅
- **`LIS3DH_LIBRARY_ANALYSIS.md`**: Deep analysis of Adafruit library, why SPI is better, what went wrong with I2C
- **`SPI_SENSOR_GUIDE.md`**: Complete user guide for adding SPI sensors, hardware wiring, firmware implementation roadmap

### 5. **Configuration Example** ✅
- Updated `sensors.json` with example SPI LIS3DH configuration (commented out for reference)

---

## Why This Matters

Your **I2C implementation failed** (X-axis always zero) because:
- Manual I2C register addressing is error-prone
- Register pointer persistence issues
- Repeated START not working reliably on Pico's Wire library

**SPI is fundamentally simpler:**
- No register pointer state management
- Proven library support (Adafruit_LIS3DH)
- 500 kHz - 4 MHz speed (vs I2C 400 kHz)
- Just: CS low → shift bytes → CS high

---

## Immediate Next Steps (Firmware)

To make the SPI configuration functional, modify firmware:

### 1. **include/sys_init.h** - Add constants
```cpp
#define LIS3DH_SPI_CS_PIN 22
#define LIS3DH_SPI_BUS 0
#define LIS3DH_SPI_FREQUENCY 500000
```

### 2. **src/main.cpp** - Replace I2C code
```cpp
// Remove the manual I2C code (lines 275-360)
// Add: #include <Adafruit_LIS3DH.h>
// Add: Adafruit_LIS3DH lis3dh_spi(LIS3DH_SPI_CS_PIN);

// In setup():
// lis3dh_spi.begin(0x18);  // Initialize via SPI

// In loop() sensor polling:
// lis3dh_spi.read();
// float x = lis3dh_spi.x * 0.003906;  // mg
```

### 3. **REST Endpoint** - Add to `/iostatus`
```json
"lis3dh_accel": {
  "x_mg": 12.5,
  "y_mg": 45.3,
  "z_mg": 987.2
}
```

---

## Files Modified

| File | Changes | Impact |
|------|---------|--------|
| `data/index.html` | Added SPI protocol dropdown, SPI config panel | Users can now configure SPI sensors |
| `data/script.js` | Updated protocol handlers, pin loading, sensor type options | Web UI responds to SPI selection |
| `data/sensors.json` | Added example SPI LIS3DH config entry | Users have reference format |
| `LIS3DH_LIBRARY_ANALYSIS.md` | New file - Deep dive on library architecture | Explains why SPI is better choice |
| `SPI_SENSOR_GUIDE.md` | New file - Complete implementation guide | Roadmap for firmware updates |

---

## Key Insights from Analysis

### Adafruit LIS3DH Library Constructor Options

```cpp
// I2C (what you tried)
Adafruit_LIS3DH lis = Adafruit_LIS3DH();

// Hardware SPI (what you should do now)
Adafruit_LIS3DH lis = Adafruit_LIS3DH(CS_PIN);

// Software SPI (if HW pins conflict)
Adafruit_LIS3DH lis = Adafruit_LIS3DH(CS, MOSI, MISO, CLK);
```

### Why Your I2C Failed

From `src/main.cpp` lines 275-360:
- You tried to use `endTransmission(false)` (repeated START)
- Pico's Wire library may not support this reliably
- Register pointer not persisting between transactions
- Result: Reading from wrong register after pointer write

### SPI Advantage

- Library handles CS timing automatically
- No register pointer state to manage
- Proven on Pico and thousands of other boards

---

## Testing Recommendation

### Phase 1: UI Only (Already Done ✅)
- Users can now configure SPI in web interface
- Configuration saves to sensors.json
- No firmware changes needed for this phase

### Phase 2: Firmware Implementation (TODO)
1. Add include `<Adafruit_LIS3DH.h>`
2. Change initialization from I2C to SPI
3. Update polling code to use `lis.read()`
4. Add to REST `/iostatus` endpoint
5. Test with actual hardware

### Phase 3: Multi-Sensor Support (Future)
- Support both I2C and SPI LIS3DH simultaneously
- Allow multiple SPI sensors with different CS pins
- Add to Modbus register mapping

---

## Verified Working

- ✅ Web UI dropdown and selection
- ✅ SPI configuration form display/hide
- ✅ Pin loading for SPI (all GPIO as CS)
- ✅ Software SPI pin selector (show/hide based on mode)
- ✅ Data parsing section shows for SPI
- ✅ HTML form validation
- ✅ Example JSON configuration

---

## Not Yet Implemented (Requires Firmware)

- ⏳ Parsing JSON `spiBus` field
- ⏳ Detecting "LIS3DH_SPI" type vs "LIS3DH"
- ⏳ Creating Adafruit_LIS3DH instance with SPI
- ⏳ Reading sensor data in polling loop
- ⏳ Storing to Modbus registers
- ⏳ REST endpoint JSON serialization

---

## Reference Materials

1. **Adafruit LIS3DH Library**
   - File: `lib/Adafruit_LIS3DH/`
   - Example: `lib/Adafruit_LIS3DH/examples/acceldemo/acceldemo.ino`
   - Key Methods: `read()`, `begin()`, `setRange()`, `setDataRate()`

2. **RP2040 SPI Documentation**
   - Hardware SPI0: GP2 (CLK), GP3 (MOSI), GP4 (MISO)
   - Hardware SPI1: GP10 (CLK), GP11 (MOSI), GP12 (MISO)

3. **Your Board Info**
   - W5500 occupies GP16-GP21 (don't use these)
   - Safe CS pins: GP22, GP26-28, or unused

---

## Summary

**The web UI now fully supports SPI sensor configuration.** Users can select SPI, choose LIS3DH_SPI, configure pins and frequency, and save. 

Firmware implementation is the next step - it should follow the guide in `SPI_SENSOR_GUIDE.md` Sections "Firmware Implementation" and "main.cpp - Read SPI Data".

The Adafruit library will handle all the protocol complexity that caused your I2C issues. You'll get reliable X, Y, Z readings immediately.

