# W5500-EVB-PoE-Pico Pin Mapping Reference

## Pin Numbering Convention Used in Firmware

**IMPORTANT**: The firmware uses **GPIO numbers**, NOT physical pin numbers!

When the code refers to pin "16", it means **GPIO16**, which is **physical pin 21** on the board.

## Critical Pin Clarification

**Physical pins 31, 32, 34 (marked as GP26, GP27, GP28 on the board) are ADC-ONLY pins and CANNOT be used for I2C, UART, or digital I/O!**

These pins can only be used for analog voltage measurements.

## W5500 Ethernet Module Reserved Pins

The following GPIO pins are **RESERVED** for the W5500 Ethernet module and **CANNOT** be used for sensors:

| GPIO | Physical Pin | W5500 Function | Description |
|------|-------------|----------------|-------------|
| 16   | 21          | MISO          | SPI Master In Slave Out |
| 17   | 22          | CS            | SPI Chip Select |
| 18   | 24          | SCK           | SPI Clock |
| 19   | 25          | MOSI          | SPI Master Out Slave In |
| 20   | 26          | RST           | Reset |
| 21   | 27          | IRQ           | Interrupt Request |
| 22   | 29          | EXT_LED       | External LED |

**Total Reserved: GPIO 16-22 (Physical pins 21-29)**

## Available Pins for Sensor Configuration

### Digital I/O Pins (Fixed Assignment)

#### Digital Inputs (GPIO 0-7)
| GPIO | Physical Pin | Function | Notes |
|------|-------------|----------|-------|
| 0    | 1           | DI0      | Digital Input 0 |
| 1    | 2           | DI1      | Digital Input 1 |
| 2    | 4           | DI2      | Digital Input 2 |
| 3    | 5           | DI3      | Digital Input 3 |
| 4    | 6           | DI4      | Digital Input 4 |
| 5    | 7           | DI5      | Digital Input 5 |
| 6    | 9           | DI6      | Digital Input 6 |
| 7    | 10          | DI7      | Digital Input 7 |

#### Digital Outputs (GPIO 8-15)
| GPIO | Physical Pin | Function | Notes |
|------|-------------|----------|-------|
| 8    | 11          | DO0      | Digital Output 0 |
| 9    | 12          | DO1      | Digital Output 1 |
| 10   | 14          | DO2      | Digital Output 2 |
| 11   | 15          | DO3      | Digital Output 3 |
| 12   | 16          | DO4      | Digital Output 4 |
| 13   | 17          | DO5      | Digital Output 5 |
| 14   | 19          | DO6      | Digital Output 6 |
| 15   | 20          | DO7      | Digital Output 7 |

### Analog Inputs (Fixed Assignment)
| GPIO | Physical Pin | Function | ADC Channel | Range |
|------|-------------|----------|-------------|-------|
| 26   | 31          | AI0      | ADC0        | 0-3.3V |
| 27   | 32          | AI1      | ADC1        | 0-3.3V |
| 28   | 34          | AI2      | ADC2        | 0-3.3V |

### Flexible Pins (Available for Sensor Configuration)

These pins can be dynamically assigned to sensors in the web interface:

| GPIO | Physical Pin | Available For | Notes |
|------|-------------|---------------|-------|
| 0    | 1           | I2C, UART, One-Wire, Digital | Shared with DI0 |
| 1    | 2           | I2C, UART, One-Wire, Digital | Shared with DI1 |
| 2    | 4           | I2C, UART, One-Wire, Digital | Can be I2C SDA |
| 3    | 5           | I2C, UART, One-Wire, Digital | Can be I2C SCL |
| 4    | 6           | UART, One-Wire, Digital | |
| 5    | 7           | UART, One-Wire, Digital | |
| 6    | 9           | I2C, UART, One-Wire, Digital | Can be I2C SDA |
| 7    | 10          | I2C, UART, One-Wire, Digital | Can be I2C SCL |
| 8    | 11          | UART, One-Wire, Digital | Shared with DO0 |
| 9    | 12          | UART, One-Wire, Digital | Shared with DO1 |
| 10   | 14          | UART, One-Wire, Digital | Shared with DO2 |
| 11   | 15          | UART, One-Wire, Digital | Shared with DO3 |
| 12   | 16          | UART, One-Wire, Digital | Shared with DO4 |
| 13   | 17          | UART, One-Wire, Digital | Shared with DO5 |
| 14   | 19          | UART, One-Wire, Digital | Shared with DO6 |
| 15   | 20          | UART, One-Wire, Digital | Shared with DO7 |
| 23   | 30          | UART, One-Wire, Digital | |
| 26   | 31          | **ADC ONLY** | **Cannot be used for I2C/UART** |
| 27   | 32          | **ADC ONLY** | **Cannot be used for I2C/UART** |
| 28   | 34          | **ADC ONLY** | **Cannot be used for I2C/UART** |

## Pre-configured I2C Pin Pairs

The firmware provides these I2C pin combinations in the web interface:

| Pair # | SDA GPIO | SCL GPIO | SDA Pin | SCL Pin | Description |
|--------|----------|----------|---------|---------|-------------|
| 1      | 4        | 5        | 6       | 7       | Primary I2C |
| 2      | 2        | 3        | 4       | 5       | Alternative I2C pair |
| 3      | 6        | 7        | 9       | 10      | Secondary I2C pair |

## Pin Conflict Detection

The firmware automatically prevents conflicts:

### I2C Sensors
- **Shared Pins**: Multiple I2C sensors can share the same SDA/SCL pins
- **Conflicts**: I2C pins cannot be used for UART, One-Wire, or Digital Counter on other sensors

### UART Sensors
- **Exclusive Pins**: Each UART sensor needs dedicated TX/RX pins
- **Conflicts**: UART pins cannot be shared with any other protocol

### One-Wire/Digital Counter Sensors
- **Exclusive Pins**: Each sensor needs a dedicated pin
- **Conflicts**: These pins cannot be shared with any other protocol

## Physical Board Reference

Refer to the included image: `images/W5500-EVB-PoE-Pico-pinout.png`

### Key Points:
1. **Pin 21 on the board = GPIO16** (Reserved for W5500)
2. **Pin 22 on the board = GPIO17** (Reserved for W5500)
3. When configuring sensors, use the **GPIO number**, not the physical pin number
4. The web interface displays GPIO numbers in pin selection dropdowns

## Example Configurations

### Example 1: EZO pH Sensor
- **I2C Address**: 0x63
- **SDA Pin**: 4 (Physical pin 6)
- **SCL Pin**: 5 (Physical pin 7)
- **Modbus Register**: 3

### Example 2: Multiple I2C Sensors
- **Sensor 1**: EZO pH on SDA=4, SCL=5, Address=0x63
- **Sensor 2**: EZO Temperature on SDA=4, SCL=5, Address=0x66
- **Sensor 3**: BME280 on SDA=2, SCL=3, Address=0x76

### Example 3: UART Sensor
- **TX Pin**: 4 (Physical pin 6)
- **RX Pin**: 5 (Physical pin 7)
- **Baud Rate**: 9600

## Troubleshooting

### Common Pin Configuration Issues:
1. **Using physical pin numbers instead of GPIO numbers** ❌
   - Incorrect: Setting pin "21" for sensor (this is GPIO21, which is reserved)
   - Correct: Setting pin "24" for sensor (this is GPIO24, physical pin 31)

2. **Trying to use reserved W5500 pins** ❌
   - The firmware will prevent this, but double-check your assignments

3. **Pin conflicts between sensors** ❌
   - UART sensors cannot share pins
   - One-Wire sensors need dedicated pins
   - Only I2C sensors can share SDA/SCL pins

### Verification:
- Check the Status IO page for "Pin Assignments" to verify your configuration
- The web interface shows both GPIO numbers and physical pin references
- Use the I2C scanner in the terminal to verify sensor connectivity

## Firmware Pin Definitions Summary

```cpp
// W5500 Reserved Pins (DO NOT USE)
#define PIN_ETH_MISO 16    // Physical pin 21
#define PIN_ETH_CS 17      // Physical pin 22
#define PIN_ETH_SCK 18     // Physical pin 24
#define PIN_ETH_MOSI 19    // Physical pin 25
#define PIN_ETH_RST 20     // Physical pin 26
#define PIN_ETH_IRQ 21     // Physical pin 27
#define PIN_EXT_LED 22     // Physical pin 29

// Available Flexible Pins for Sensors
// GPIO: 0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,23
// (Excludes W5500 pins 16-22)
// Note: GPIO 26,27,28 are ADC-only pins (Physical pins 31,32,34)
```

This document should be referenced when configuring sensors to ensure proper pin assignment and avoid conflicts with the W5500 Ethernet module.