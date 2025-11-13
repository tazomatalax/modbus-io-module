# LIS3DH Adafruit Library Analysis

## Overview
The Adafruit LIS3DH library (`lib/Adafruit_LIS3DH/`) provides abstraction over both **I2C** and **SPI** communication modes. The library handles all the complexity of protocol interaction, making the user code nearly identical regardless of which bus is used.

## Key Design Insights

### 1. Multiple Instantiation Patterns

The library supports **three constructor patterns**:

```cpp
// Pattern 1: I2C (default)
Adafruit_LIS3DH(TwoWire *Wi = &Wire);
// Usage: Adafruit_LIS3DH lis = Adafruit_LIS3DH();

// Pattern 2: Hardware SPI
Adafruit_LIS3DH(int8_t cspin, SPIClass *theSPI = &SPI, 
                uint32_t frequency = LIS3DH_DEFAULT_SPIFREQ);
// Usage: Adafruit_LIS3DH lis = Adafruit_LIS3DH(10);  // CS on pin 10

// Pattern 3: Software SPI (bit-banging)
Adafruit_LIS3DH(int8_t cspin, int8_t mosipin, int8_t misopin, 
                int8_t sckpin, uint32_t frequency = LIS3DH_DEFAULT_SPIFREQ);
// Usage: Adafruit_LIS3DH lis = Adafruit_LIS3DH(10, 11, 12, 13);
```

### 2. Why SPI is Easier

**I2C Challenges (as you've experienced):**
- Complex register addressing protocol
- Auto-increment bit manipulation (0xA8 vs 0x28)
- Repeated START vs STOP sequencing
- Per-byte latency accumulation
- Register pointer state persistence issues (your X-axis zero problem likely stems from this)

**SPI Advantages:**
- Simpler protocol: CS low → shift bytes → CS high
- No register pointer persistence
- Higher throughput (400 kHz I2C vs 500+ kHz SPI default)
- No repeated START complications
- Library handles all protocol details

### 3. Library Architecture

The library uses Adafruit's **BusIO** abstraction layer:
- `Adafruit_SPIDevice` handles SPI transactions
- `Adafruit_I2CDevice` handles I2C transactions
- **Single `read()` method** that works identically for both buses
  
The library internally detects which bus was initialized and routes all communication through the correct interface automatically.

### 4. Data Reading Pattern

Regardless of I2C vs SPI:

```cpp
lis.read();  // Fetches X, Y, Z into internal buffer

// Access raw data:
int16_t x_raw = lis.x;  // Already bit-shifted and scaled
int16_t y_raw = lis.y;
int16_t z_raw = lis.z;

// Or get normalized event (m/s²):
sensors_event_t event;
lis.getEvent(&event);
float x_ms2 = event.acceleration.x;  // Already in SI units
```

The library handles:
- ✅ Register address byte construction
- ✅ Multi-byte reads with auto-increment
- ✅ Byte order (little-endian) conversion
- ✅ Bit shifting (10-bit extraction from 16-bit register)
- ✅ Scale factor application (3.906 mg/LSB for ±2g)
- ✅ Temperature compensation (optional)

**This is why your manual I2C code had issues** - you were managing all these complexities yourself, and register persistence/X-axis pointer issues likely stem from the repeated START not working reliably.

### 5. Performance Modes Supported

```cpp
// Performance modes affect data width:
LIS3DH_MODE_LOW_POWER       // 8-bit data (fast, lower accuracy)
LIS3DH_MODE_NORMAL          // 10-bit data (standard, what you want)
LIS3DH_MODE_HIGH_RESOLUTION // 12-bit data (slower, higher accuracy)

// Data rates available:
LIS3DH_DATARATE_1_HZ
LIS3DH_DATARATE_10_HZ
LIS3DH_DATARATE_25_HZ
LIS3DH_DATARATE_50_HZ
LIS3DH_DATARATE_100_HZ
LIS3DH_DATARATE_200_HZ
LIS3DH_DATARATE_400_HZ
LIS3DH_DATARATE_LOWPOWER_1K6HZ
LIS3DH_DATARATE_LOWPOWER_5KHZ

// Full-scale ranges:
LIS3DH_RANGE_2_G   // ±2g (default, standard 3.906 mg/LSB)
LIS3DH_RANGE_4_G   // ±4g (7.812 mg/LSB)
LIS3DH_RANGE_8_G   // ±8g (15.625 mg/LSB)
LIS3DH_RANGE_16_G  // ±16g (31.25 mg/LSB)
```

### 6. Why Your Manual I2C Implementation Failed

Looking at your debug output:
```
Raw: [0x0 0x0 0x0 0xc5 0xc0 0xf7]
Raw: [0x0 0x0 0x40 0xc4 0x80 0xf6]
```

**The pattern shows:** X is always 0x00 0x00, but Y and Z vary. This suggests:
- **Hypothesis A (Most Likely):** Register pointer not being set correctly. Each I2C transaction might be reading from wrong starting register.
- **Hypothesis B:** The repeated START your code attempted isn't working on Pico's Wire library, so register address isn't being latched.
- **Hypothesis C:** Sensor needs inter-transaction delay longer than 100 microseconds

The Adafruit library **avoids all this** by:
1. Using proven transaction patterns (likely just normal STOP, not repeated START)
2. Using SPIDevice/I2CDevice abstraction which handles protocol nuances per-microcontroller
3. Having been tested on thousands of boards (including Pico)

---

## Recommendation: Switch to SPI

### Why Now:
1. **Your I2C attempt has systemic issues** (X-axis dead)
2. **SPI is simpler** - just CS, MOSI, MISO, CLK
3. **Library already written** - just change 1 line of code
4. **W5500 already uses SPI** - you've proven SPI works on your board

### Pin Assignment (RP2040 / Pico):
- **MOSI:** GP3 (Pin 5) or GP7 (Pin 10) or others
- **MISO:** GP0 (Pin 1) or GP4 (Pin 6) or others  
- **CLK:** GP2 (Pin 4) or GP6 (Pin 9) or others
- **CS:** Any GPIO not used by W5500 (W5500 uses GP16-GP21, so GP22+ or GP15-below safe)

**Recommended:** 
- Use different SPI bus than W5500 (if Pico has SPI1)
- Or use software SPI on unused pins
- Or use pins from the same SPI bus if no conflicts

### Implementation Path:
1. Add SPI protocol to web UI sensor config (simple dropdown addition)
2. Modify `sys_init.h` to add SPI configuration constants
3. Modify LIS3DH initialization to detect SPI vs I2C from config
4. Create SPI-based Adafruit_LIS3DH instance instead of I2C
5. Testing: Read should now give sensible X, Y, Z values immediately

---

## Code Generation Strategy

### Current Manual I2C in main.cpp (Lines ~275-360):
- Raw Wire.beginTransmission/endTransmission calls
- Manual byte parsing
- Bit shift and scale factor application

### Proposed Change:
- Replace with: `#include <Adafruit_LIS3DH.h>`
- Create: `Adafruit_LIS3DH lis = Adafruit_LIS3DH(CS_PIN);  // SPI version`
- Main loop: `lis.read(); float x = lis.x * 0.003906; // Already shifted/scaled by library`
- Clean, tested, proven code

---

## Files to Modify

1. **`data/script.js`** - Add SPI to protocol options
2. **`data/index.html`** - Add SPI pin configuration form fields
3. **`include/sys_init.h`** - Add SPI pin constants
4. **`src/main.cpp`** - Replace manual I2C with Adafruit library initialization
5. **`data/sensors.json`** - Add example SPI LIS3DH config

---

## Appendix: Library Constants

From `Adafruit_LIS3DH.h`:

```cpp
#define LIS3DH_DEFAULT_ADDRESS 0x18     // I2C default address
#define LIS3DH_DEFAULT_SPIFREQ 500000   // 500 kHz SPI default
#define LIS3DH_REG_WHOAMI 0x0F          // Should return 0x33
#define LIS3DH_REG_CTRL1 0x20           // Control register 1
#define LIS3DH_REG_CTRL4 0x23           // Control register 4 (range)
#define LIS3DH_REG_OUTX_L 0x28          // X output low byte (start of 6-byte read)
```

Scale factors (from library):
```cpp
#define LIS3DH_LSB16_TO_KILO_LSB10 64000   // For 10-bit mode: divide by this to get gs
#define LIS3DH_LSB16_TO_KILO_LSB12 16000   // For 12-bit mode
#define LIS3DH_LSB16_TO_KILO_LSB8 256000   // For 8-bit mode
```

Your ±2g / 10-bit mode uses the 64000 scalar (or 3.906 mg/LSB as you discovered).

