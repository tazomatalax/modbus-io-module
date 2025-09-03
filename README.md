# Modbus TCP IO Module

A flexible Ethernet-based Modbus TCP IO module built on the Wiznet W5500-EVB-Pico board (RP2040). Features a modern web interface for configuration and real-time monitoring.

![W5500-EVB-PoE-Pico Pinout](images/W5500-EVB-PoE-Pico-pinout.png)

## Features

### Network Configuration
- DHCP support with fallback to static IP
- Configurable network settings via web interface
- Custom hostname support
- Real-time IP address display
- Built-in LED indicates Modbus client connection status

### IO Capabilities
- **Digital Inputs**: 8 channels (GP0-GP7)
  - Configurable pullup resistors
  - Input inversion option
  - Latching capability (inputs remain ON until reset)
  - Latch reset via web interface or Modbus
- **Digital Outputs**: 8 channels (GP8-GP15)
  - Toggle outputs directly from web interface
  - Configurable initial state (ON/OFF at startup)
  - Output inversion option
  - Real-time status updates
- **Analog Inputs**: 3 channels (GP26-GP28)
  - 12-bit resolution (0-4095)
  - 3.3V reference voltage
  - Values displayed in millivolts (0-3300mV)
  - Real-time trend graphs

### Modbus Server
- Protocol: Modbus TCP
- Default Port: 502
- Register Map:
  - **Discrete Inputs (FC2)**: 16 inputs
    - 0-7: Digital input states
  - **Coils (FC1/FC5)**: 128 coils
    - 0-7: Digital output control
    - 100-107: Digital input latch reset
  - **Input Registers (FC4)**: 32 registers
    - 0-2: Analog input values (millivolts)
    - 3: Temperature (scaled ×100, e.g., 2550 = 25.50°C)
    - 4: Humidity (scaled ×100, e.g., 6050 = 60.50%)
    - 5-31: Available for additional sensors
  - **Holding Registers (FC3/FC16)**: 16 registers

### Web Interface
![Web Interface - Network](images/web-interface-1.png)

![Web Interface - IO Status](images/web-interface-2.png)

![Web Interface - IO Configuration](images/web-interface-3.png)

- Modern, responsive design
- Live IO status updates
- Interactive digital output control
- Digital input latch reset functionality
- Configuration management
  - Network settings
  - DHCP toggle with sliding switch
  - Hostname configuration
  - IO configuration with table-based layout
    - Digital input pullup, inversion, and latching options
    - Digital output initial state and inversion options
- Status indicators
  - Current IP address
  - Hostname
  - Modbus client connection status
- Analog input trend visualization

## Hardware

### Board
- **Module**: Wiznet W5500-EVB-Pico
- **Processor**: RP2040 (Dual-core ARM Cortex-M0+)
- **Ethernet**: W5500 with lwIP stack
- **Power**: USB or PoE (requires PoE module)
- **USB**: Custom VID/PID for unique device identification

### IO Pin Assignments

#### Digital IO

| Function | GPIO Pin | Description |
|----------|----------|-------------|
| DI1 | GP0  | Digital Input 1 |
| DI2 | GP1  | Digital Input 2 |
| DI3 | GP2  | Digital Input 3 |
| DI4 | GP3  | Digital Input 4 |
| DI5 | GP4  | Digital Input 5 |
| DI6 | GP5  | Digital Input 6 |
| DI7 | GP6  | Digital Input 7 |
| DI8 | GP7  | Digital Input 8 |
| DO1 | GP8  | Digital Output 1 |
| DO2 | GP9  | Digital Output 2 |
| DO3 | GP10 | Digital Output 3 |
| DO4 | GP11 | Digital Output 4 |
| DO5 | GP12 | Digital Output 5 |
| DO6 | GP13 | Digital Output 6 |
| DO7 | GP14 | Digital Output 7 |
| DO8 | GP15 | Digital Output 8 |

#### Analog Inputs

| Function | GPIO Pin | ADC Channel | Range |
|----------|----------|-------------|--------|
| AI1 | GP26 | ADC0 | 0-3300mV |
| AI2 | GP27 | ADC1 | 0-3300mV |
| AI3 | GP28 | ADC2 | 0-3300mV |

#### Ethernet Interface

| Function | GPIO Pin |
|----------|----------|
| CS   | GP17 |
| IRQ  | GP21 |
| SCK  | GP18 |
| MOSI | GP19 |
| MISO | GP16 |

#### I2C Interface

| Function | GPIO Pin | Description |
|----------|----------|-------------|
| SDA | GP24 | I2C Serial Data |
| SCL | GP25 | I2C Serial Clock |

*Note: I2C bus is initialized and available for sensor integration. Currently using placeholder data for Modbus registers 3-4.*

## Development

### Environment
- PlatformIO
- Framework: Arduino
- Board: Raspberry Pi Pico
- Core: Earlephilhower's Arduino core

### Dependencies
- Arduino Framework
- W5500lwIP Ethernet Library
- ArduinoModbus
- ArduinoJson
- LittleFS for file system operations

### Building and Flashing
1. Clone the repository
2. Open in PlatformIO
3. Build and upload to the board

## Configuration

### Default Network Settings
- DHCP: Enabled
- Fallback Static IP: 192.168.1.10
- Subnet: 255.255.255.0
- Gateway: 192.168.1.1
- Modbus Port: 502

### Memory Layout
- Configuration stored in LittleFS
- Version control for config structure
- Automatic migration of settings

## Usage

1. Power up the board via USB or PoE
2. Connect to network via Ethernet
3. Access web interface via IP address
4. Configure network settings if needed
5. Configure IO settings as required:
   - Set digital input pullup, inversion, and latching options
   - Configure digital output initial state and inversion options
6. Control digital outputs via web interface or Modbus
7. Monitor inputs and outputs in real-time
8. Reset latched inputs via web interface or by writing to Modbus coils 100-107

## Debugging
- Serial debug output (115200 baud)
- Web interface status indicators
- Modbus client connection monitoring
- Built-in LED indicates Modbus client connection

## I2C Sensor Integration Guide

The system is designed with built-in I2C sensor support and currently provides placeholder sensor data for testing and integration. Temperature and humidity data are available via Modbus Input Registers 3 and 4.

### Current Status
- **I2C Bus**: Initialized and ready (SDA: GP24, SCL: GP25)
- **Placeholder Data**: Simulated temperature/humidity values for testing
- **Modbus Mapping**: Registers 3 (temperature ×100) and 4 (humidity ×100)

### Adding Real I2C Sensors

To integrate actual I2C sensors (e.g., BME280, SHT30, DHT22), modify these files:

#### 1. Update Library Dependencies (`platformio.ini`)

Add your sensor library to the `lib_deps` section:

```ini
lib_deps = 
    # Existing libraries...
    adafruit/Adafruit BME280 Library@^2.2.2    ; For BME280
    # adafruit/Adafruit SHT31 Library@^2.2.0   ; For SHT31
    # adafruit/Adafruit Unified Sensor@^1.1.9  ; Often required
```

#### 2. Add Sensor Includes (`src/main.cpp` - Lines 4-11)

Replace the commented template includes:

```cpp
// Current template (lines 4-7):
// #include <Adafruit_Sensor.h>
// #include <Adafruit_BME280.h>

// Replace with actual includes:
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>
```

#### 3. Create Sensor Instance (`src/main.cpp` - Lines 9-11)

Replace the commented template instance:

```cpp
// Current template (lines 10-11):
// Adafruit_BME280 bme; // Create sensor object

// Replace with actual instance:
Adafruit_BME280 bme; // Create sensor object
```

#### 4. Initialize Sensor (`src/main.cpp` - Lines 87-93)

Replace the commented initialization in `setup()`:

```cpp
// Current template (lines 87-93):
// if (!bme.begin(0x76)) { // Common I2C address for BME280
//     Serial.println("Could not find a valid BME280 sensor, check wiring!");
//     // Handle sensor initialization failure as needed
// } else {
//     Serial.println("BME280 sensor initialized successfully");
// }

// Replace with actual initialization:
if (!bme.begin(0x76)) { // Common I2C address for BME280
    Serial.println("Could not find a valid BME280 sensor, check wiring!");
    // Handle sensor initialization failure as needed
} else {
    Serial.println("BME280 sensor initialized successfully");
}
```

#### 5. Replace Placeholder Data (`src/main.cpp` - Lines 605-624)

In the `updateIOpins()` function, replace placeholder data generation:

```cpp
// Current placeholder code (lines 605-614):
static uint32_t sensorReadTime = 0;
if (millis() - sensorReadTime > 1000) { // Update every 1 second
    // Placeholder sensor values - simulate realistic sensor readings
    ioStatus.temperature = 23.45 + sin(millis() / 10000.0) * 2.0;
    ioStatus.humidity = 55.20 + cos(millis() / 8000.0) * 5.0;
    ioStatus.pressure = 1013.25 + sin(millis() / 15000.0) * 10.0;
    sensorReadTime = millis();
}

// Replace with actual sensor readings:
static uint32_t sensorReadTime = 0;
if (millis() - sensorReadTime > 1000) { // Update every 1 second
    ioStatus.temperature = bme.readTemperature();    // Temperature in Celsius
    ioStatus.humidity = bme.readHumidity();          // Humidity in %
    ioStatus.pressure = bme.readPressure() / 100.0F; // Pressure in hPa
    
    // Add error checking:
    if (isnan(ioStatus.temperature) || isnan(ioStatus.humidity)) {
        Serial.println("Failed to read from BME280 sensor!");
        // Set default/error values if needed
        ioStatus.temperature = -999.0;
        ioStatus.humidity = -999.0;
    }
    sensorReadTime = millis();
}
```

### Sensor Examples

#### BME280 Environmental Sensor
- **I2C Address**: 0x76 or 0x77
- **Measurements**: Temperature, Humidity, Pressure
- **Library**: `Adafruit BME280 Library`
- **Typical Range**: -40°C to 85°C, 0-100% RH, 300-1100 hPa

#### SHT31 Temperature/Humidity Sensor
- **I2C Address**: 0x44 or 0x45
- **Measurements**: Temperature, Humidity
- **Library**: `Adafruit SHT31 Library`
- **Typical Range**: -40°C to 125°C, 0-100% RH

### Adding More Sensors

To add additional sensor data beyond temperature/humidity:

#### 1. Extend IOStatus Structure (`include/sys_init.h` - Lines 80-84)

```cpp
struct IOStatus {
    // Existing fields...
    float temperature;    // Temperature in Celsius
    float humidity;       // Humidity in %
    float pressure;       // Pressure in hPa
    
    // Add new sensor fields:
    float lightLevel;     // Light sensor (lux)
    float co2Level;       // CO2 sensor (ppm)
    float soilMoisture;   // Soil moisture (%)
};
```

#### 2. Map to Modbus Registers (`src/main.cpp` - Lines 628-633)

```cpp
void updateIOForClient(int clientIndex) {
    // Existing mappings...
    modbusClients[clientIndex].server.inputRegisterWrite(3, (uint16_t)(ioStatus.temperature * 100));
    modbusClients[clientIndex].server.inputRegisterWrite(4, (uint16_t)(ioStatus.humidity * 100));
    
    // Add new sensor mappings:
    modbusClients[clientIndex].server.inputRegisterWrite(5, (uint16_t)ioStatus.pressure);        // hPa as integer
    modbusClients[clientIndex].server.inputRegisterWrite(6, (uint16_t)ioStatus.lightLevel);      // Lux as integer
    modbusClients[clientIndex].server.inputRegisterWrite(7, (uint16_t)ioStatus.co2Level);        // PPM as integer
    modbusClients[clientIndex].server.inputRegisterWrite(8, (uint16_t)(ioStatus.soilMoisture * 100)); // Scaled x100
}
```

#### 3. Update Register Documentation (`src/main.cpp` - Lines 29-30)

```cpp
 * - Input Registers (FC4): 3 - Temperature (scaled x100, e.g., 2550 = 25.50°C)
 * - Input Registers (FC4): 4 - Humidity (scaled x100, e.g., 6050 = 60.50%)
 * - Input Registers (FC4): 5 - Pressure (hPa as integer, e.g., 1013 = 1013 hPa)
 * - Input Registers (FC4): 6 - Light Level (lux as integer)
 * - Input Registers (FC4): 7 - CO2 Level (ppm as integer)
 * - Input Registers (FC4): 8 - Soil Moisture (scaled x100, e.g., 4530 = 45.30%)
```

### Testing Without Physical Sensors

The current implementation includes realistic placeholder data that simulates sensor behavior:
- **Temperature**: Varies between 21.45°C and 25.45°C
- **Humidity**: Varies between 50.20% and 60.20%
- **Update Rate**: Every 1 second

This allows full Modbus TCP testing and integration validation before connecting physical sensors.

### Troubleshooting I2C Sensors

1. **Check Wiring**: Verify SDA (GP24) and SCL (GP25) connections
2. **I2C Address**: Use I2C scanner sketch to verify sensor address
3. **Power Supply**: Ensure sensor has proper 3.3V power
4. **Serial Output**: Monitor debug messages during sensor initialization
5. **Pull-up Resistors**: Some sensors may require external 4.7kΩ pull-ups
