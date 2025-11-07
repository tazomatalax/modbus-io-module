# Hardware Pinout and Interfaces

## Board Overview

**Module**: Wiznet W5500-EVB-Pico  
**Processor**: RP2040 (Dual-core ARM Cortex-M0+)  
**RAM**: 264 KB  
**Flash**: 2 MB (with LittleFS for configuration)  
**Ethernet**: W5500 with lwIP stack  
**Power**: USB-C or PoE (with PoE module)  
**USB**: Custom VID/PID (0x04D8:0xEB64) for device identification

---

## Pin Assignments

### Digital Inputs (DI) – GPIO 0-7

Used for monitoring external digital signals (switches, relays, sensors). Each input can be independently configured with:
- **Pullup resistor** (internal)
- **Inversion** (logical NOT)
- **Latching** (input remains ON until manually reset)

| Function | GPIO | Description |
|----------|------|-------------|
| DI1 | GP0 | Digital Input 1 |
| DI2 | GP1 | Digital Input 2 |
| DI3 | GP2 | Digital Input 3 |
| DI4 | GP3 | Digital Input 4 |
| DI5 | GP4 | Digital Input 5 |
| DI6 | GP5 | Digital Input 6 |
| DI7 | GP6 | Digital Input 7 |
| DI8 | GP7 | Digital Input 8 |

**Voltage Levels**: 3.3V logic (GPIO can tolerate ≤3.6V)  
**Modbus**: FC2 (Discrete Inputs) registers 0-7

---

### Digital Outputs (DO) – GPIO 8-15

Used for controlling external devices (relays, solenoids, indicators). Each output can be:
- **Toggled** via web UI or Modbus
- **Inverted** (logical NOT)
- **Initialized** ON or OFF at startup

| Function | GPIO | Description |
|----------|------|-------------|
| DO1 | GP8 | Digital Output 1 |
| DO2 | GP9 | Digital Output 2 |
| DO3 | GP10 | Digital Output 3 |
| DO4 | GP11 | Digital Output 4 |
| DO5 | GP12 | Digital Output 5 |
| DO6 | GP13 | Digital Output 6 |
| DO7 | GP14 | Digital Output 7 |
| DO8 | GP15 | Digital Output 8 |

**Voltage Levels**: 3.3V output (source/sink capability)  
**Max Current**: ~25 mA per pin (check RP2040 datasheet for multiple pins)  
**Modbus**: FC1/FC5 (Coils) registers 0-7

---

### Analog Inputs (AI) – GPIO 26-28

12-bit ADC inputs for reading analog sensor signals. Each input:
- **Resolution**: 12-bit (0-4095)
- **Reference**: 3.3V (0-3300 mV range)
- **Sampling**: Per-loop updates (configurable interval via `/ioconfig`)

| Function | GPIO | ADC Channel | Range | Resolution |
|----------|------|-------------|-------|------------|
| AI1 | GP26 | ADC0 | 0-3300 mV | 0.8 mV/step |
| AI2 | GP27 | ADC1 | 0-3300 mV | 0.8 mV/step |
| AI3 | GP28 | ADC2 | 0-3300 mV | 0.8 mV/step |

**Calibration**: Linear (multiplier + offset) or polynomial (ax² + bx + c)  
**Modbus**: FC4 (Input Registers) addresses 0-2  
**REST**: `/iostatus` → `analog_inputs` array

---

## Communication Interfaces

### I2C Bus – GPIO 24 (SDA), GPIO 25 (SCL)

Standard I2C protocol for sensor connectivity. Supports:
- **Speed**: 100 kHz (standard mode)
- **Voltage**: 3.3V logic
- **Pull-ups**: 4.7 kΩ typical (may be on-board or external)

**Typical Devices**:
- Atlas Scientific EZO sensors (PH, DO, EC, RTD)
- Environmental sensors (BME280, SHT3x, SHT4x)
- Distance sensors (VL53L1X)
- ADC expanders (ADS1115)
- Multiplexers (TCA9548A for address conflicts)

**Configuration**: Via web UI sensor setup
- **Address Range**: 0x03-0x77 (user-selectable per sensor)
- **Polling**: Configurable per sensor (default 5000 ms)
- **Max Sensors**: Depends on available addresses and SRAM

---

### Ethernet – SPI (GPIO 16-19, 21)

W5500 module connection via SPI for network connectivity.

| Function | GPIO |
|----------|------|
| MISO | GP16 |
| SCK | GP18 |
| MOSI | GP19 |
| CS (Chip Select) | GP17 |
| IRQ (Interrupt) | GP21 |

**Speed**: 25 MHz SPI clock  
**Protocols**: Modbus TCP (port 502, configurable), HTTP (port 80)  
**Network Configuration**: DHCP or static IP

---

### UART Interface (Future)

Pins reserved for RS485/UART sensor communication:
- **TX**: GP0 or GP16 (GPIO 1 alternate)
- **RX**: GP1 or GP17 (GPIO 1 alternate)

*Currently used for other purposes; reserved for future RS485 Modbus RTU client bridge.*

---

## Modbus Register Map

### Discrete Inputs (FC2) – Read-Only

| Address | Function | Source | Description |
|---------|----------|--------|-------------|
| 0-7 | DI States | GPIO 0-7 (post-processing) | Logical state of digital inputs (inverted if configured) |

---

### Coils (FC1/FC5) – Read/Write

| Address | Function | Target | Description |
|---------|----------|--------|-------------|
| 0-7 | DO Control | GPIO 8-15 | Logical state of digital outputs |
| 100-107 | DI Latch Reset | Latch Array | Write 1 to clear latch for input 0-7 (auto-resets) |

---

### Input Registers (FC4) – Read-Only

| Address | Function | Source | Unit | Description |
|---------|----------|--------|------|-------------|
| 0 | AI1 Value | GPIO 26 (ADC0) | mV | Calibrated analog input 1 (0-3300) |
| 1 | AI2 Value | GPIO 27 (ADC1) | mV | Calibrated analog input 2 (0-3300) |
| 2 | AI3 Value | GPIO 28 (ADC2) | mV | Calibrated analog input 3 (0-3300) |
| 3-4 | Reserved | – | – | Future: environmental sensors (temp, humidity) |
| 5-15 | Reserved | – | – | Future: extended sensor types |

---

### Holding Registers (FC3/FC16) – Reserved

| Address | Function | Purpose |
|---------|----------|---------|
| 0-15 | Reserved | Available for future configuration parameters |

---

## Watchdog & Supervision

**Watchdog Timer (WDT)**:
- **Timeout**: 5 seconds
- **Purpose**: Automatic system reset if main loop stalls
- **Reset**: Called on each loop iteration
- **Implication**: Main loop must complete in <5000 ms

---

## Power Considerations

| Supply | Voltage | Current | Notes |
|--------|---------|---------|-------|
| USB-C | 5V | Up to 500 mA (USB) | Direct board supply |
| PoE | 48V → 3.3V | Up to 1 A | Requires PoE module; provides isolated supply |
| GPIO Output | 3.3V | ~25 mA per pin | Total limited by RP2040 pad drivers |
| GPIO Input | 3.3V | Pull-ups optional | Selectable via web UI per input |

---

## System Architecture Block Diagram

```
┌─────────────────────────────────────────────────────────┐
│                      RP2040 Processor                    │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Main Loop                                           │ │
│  │ • Setup & initialization                            │ │
│  │ • Modbus client accept & service                    │ │
│  │ • IO sampling & latching                            │ │
│  │ • I2C sensor polling                                │ │
│  │ • HTTP request handling                             │ │
│  │ • Watchdog reset                                    │ │
│  └─────────────────────────────────────────────────────┘ │
│          │              │              │                  │
│          ▼              ▼              ▼                  │
│   ┌─────────────┐ ┌─────────────┐ ┌──────────────┐      │
│   │  GPIO I/O   │ │  SPI/W5500  │ │  I2C Bus     │      │
│   │  DI/DO/ADC  │ │  Ethernet   │ │  Sensors     │      │
│   │  LittleFS   │ │  Network    │ │  (I2C/OneW)  │      │
│   └─────────────┘ └─────────────┘ └──────────────┘      │
│          │              │              │                  │
└──────────┼──────────────┼──────────────┼──────────────────┘
           │              │              │
           ▼              ▼              ▼
    ┌───────────┐ ┌───────────────┐ ┌─────────────┐
    │ DI/DO/AI  │ │  Ethernet RJ45│ │  I2C Device │
    │  Signals  │ │  (W5500)      │ │  Connector  │
    └───────────┘ └───────────────┘ └─────────────┘
```

---

## Timing Constraints

| Operation | Target | Limit | Notes |
|-----------|--------|-------|-------|
| Main Loop | <500 ms | <5000 ms (WDT) | Polling all IO + sensors + HTTP |
| I2C Op | <5 ms | <10 ms | Avoid blocking; use state machine if needed |
| Modbus Response | <100 ms | <500 ms | Register read latency |
| HTTP Response | <200 ms | <1000 ms | Web UI responsiveness |
| Sensor Poll | 5000 ms (default) | Configurable | Per-sensor interval |

---

## Derate Ratings

When using multiple GPIO outputs simultaneously:
- **Recommended**: ≤50 mA total across all outputs
- **Absolute Maximum**: ~200 mA across entire RP2040 GPIO bank
- **Heat Dissipation**: Monitor temperature if high current sustained

---

## Troubleshooting

### GPIO Input Not Responding
1. Verify external signal voltage (should be 3.3V logic)
2. Check pullup setting in `/ioconfig`
3. Use terminal command `di read <0-7>` to verify GPIO read
4. Inspect physical connection for corrosion or loose wiring

### Analog Input Out of Range
1. Calibrate using `/analogconfig` endpoint (set multiplier/offset)
2. Verify signal is within 0-3.3V range
3. Check for AC noise; may need filtering capacitor on input
4. Use terminal command `ai read <0-2>` to verify ADC read

### I2C Sensor Not Found
1. Run `i2cscan` terminal command to enumerate I2C devices
2. Verify address in sensor configuration matches device
3. Check pull-up resistors on SDA/SCL (4.7 kΩ typical)
4. Confirm sensor power supply is connected and stable

### Network Connectivity Issues
1. Verify Ethernet cable is properly seated
2. Check IP configuration via web UI (`/config`)
3. Use `ping` terminal command to test connectivity
4. Review W5500 interrupt line (GP21) for proper connection

---

## References

- **RP2040 Datasheet**: https://datasheets.raspberrypi.com/rp2040/rp2040-datasheet.pdf
- **W5500 Datasheet**: https://www.wiznet.io/
- **Modbus Specification**: http://www.modbus.org/specs.php
