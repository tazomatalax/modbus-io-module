# Modbus TCP IO Module

A flexible Ethernet-based Modbus TCP IO module built on the Wiznet W5500-EVB-Pico board (RP2040). Features a modern web interface for configuration and real-time monitoring with support for multiple sensor types, mathematical calibration, and built-in diagnostic tools.

## Key Features

- **Digital IO**: 8 inputs + 8 outputs with configurable pullup, inversion, and latching
- **Analog Inputs**: 3 channels (12-bit ADC, 0-3300 mV with calibration)
- **I2C Sensors**: Configurable multi-sensor support with formula-based calibration
- **Modbus TCP**: Stable register interface with per-client synchronization
- **Web UI**: Modern, responsive interface for configuration and monitoring
- **Terminal**: Built-in diagnostics for network and sensor troubleshooting
- **Network**: DHCP + static IP fallback with persistent configuration

## Quick Start

1. **Power & Network**: Connect via USB or PoE; connect Ethernet cable
2. **Upload Filesystem**: In PlatformIO, run `PlatformIO: Upload File System Image` to upload web assets
3. **Access Web Interface**: Find device IP from router or Ethernet status, open in browser
4. **Configure**: Set network, IO, and sensors via web UI
5. **Monitor**: Watch real-time IO status; control outputs; read sensors

For detailed setup, see the **[Getting Started Guide](docs/guides/)**.

## Hardware

- **Board**: Wiznet W5500-EVB-Pico (RP2040 + W5500)
- **IO**: 8 DI (GP0-7), 8 DO (GP8-15), 3 AI (GP26-28) - *Hardcoded pins, dynamic configuration in development*
- **Sensors**: I2C (default GP4/GP5, dynamically configurable), UART, OneWire, SPI support
- **Modbus**: TCP port 502 (configurable)

**Note:** IO configuration is currently in hybrid mode - legacy hardcoded pin arrays coexist with new dynamic `io_config.json` system. Full migration to dynamic configuration planned for future release.

For complete pinout and electrical specs, see **[Pinout & Interfaces](docs/hardware/pinout-and-interfaces.md)**.

## Documentation

### Core Documentation
- **[Agent Implementation Guide](AGENTS.md)** – Quick-start for AI coding agents
- **[Contributing Guide](CONTRIBUTING.md)** – Development standards and workflow
- **[Project Roadmap](ROADMAP.md)** – Strategic phases and feature planning
- **[Changelog](CHANGELOG.md)** – Version history and release notes

### Technical Documentation
- **[Architecture Overview](docs/architecture/system-overview.md)** – Design and data flows
- **[Hardware Pinout](docs/hardware/pinout-and-interfaces.md)** – GPIO and interfaces
- **[Calibration Guide](docs/guides/calibration-guide.md)** – Sensor calibration formulas
- **[Terminal Guide](docs/guides/terminal-guide.md)** – Diagnostic commands
- **[Full Documentation Index](docs/README.md)** – Complete guide directory

### Archive
Historical planning documents and implementation notes are preserved in [archive/](archive/) for reference.

## Development

### Environment
- **Build**: PlatformIO with Arduino framework
- **Board**: Raspberry Pi Pico (RP2040)
- **Libraries**: ArduinoModbus, ArduinoJson, W5500lwIP, LittleFS

### Building
```bash
# Build firmware
pio run

# Upload to device
pio run -t upload

# Upload filesystem (web assets)
pio run -t uploadfs
```

### Adding Sensors
1. Follow the **[Sensor Integration Workflow](CONTRIBUTING.md#4-sensor-integration-workflow-authoritative-checklist)** in CONTRIBUTING.md
2. Review **[System Architecture](docs/architecture/system-overview.md)** for register allocation
3. Reference **[EZO Sensor Polling](docs/technical/ezo-sensor-polling.md)** for I2C patterns

## Modbus Register Map

| Type | Address | Function | Source |
|------|---------|----------|--------|
| FC2 | 0-7 | Digital Input states | GPIO 0-7 |
| FC1/FC5 | 0-7 | Digital Output control | GPIO 8-15 |
| FC1/FC5 | 100-107 | DI Latch reset | Latch array |
| FC4 | 0-2 | Analog input (mV) | GPIO 26-28 (ADC) |
| FC4 | 3+ | Sensor values | I2C / configured sensors |

See **[Pinout & Interfaces](docs/hardware/pinout-and-interfaces.md#modbus-register-map)** for complete map.

## Supported Sensors

- **EZO Sensors** (Atlas Scientific): pH, DO, EC, RTD with calibration
- **Environmental**: BME280, SHT3x, SHT4x (via I2C)
- **Temperature**: DS18B20 (OneWire), RTD (I2C)
- **Distance**: VL53L1X (time-of-flight)
- **Expandable**: Generic I2C, UART, OneWire, Digital, Analog

## Troubleshooting

### Web Interface Not Loading
- Verify `PlatformIO: Upload File System Image` was run
- Check device IP via router status page
- Ensure Ethernet cable is connected

### Sensor Not Found
- Run terminal command `i2cscan` to enumerate I2C devices
- Verify sensor I2C address in configuration
- Check SDA (GP24) and SCL (GP25) connections
- Confirm 4.7kΩ pull-ups on I2C bus

## Persistent Configuration & JSON Files

The firmware uses LittleFS (flash filesystem) to store persistent configuration. Understanding these JSON files is essential for troubleshooting and development.

### Configuration Files

#### 1. **config.json** – Network & I/O Settings
**Location**: Flash filesystem (LittleFS)  
**Purpose**: Stores network configuration (IP, gateway, subnet, Modbus port) and IO behavior (pullups, inversion, latching).

**Structure**:
```json
{
  "version": 1,
  "dhcpEnabled": false,
  "ip": [192, 168, 1, 10],
  "gateway": [192, 168, 1, 1],
  "subnet": [255, 255, 255, 0],
  "modbusPort": 502,
  "hostname": "modbus-io-module",
  "diPullup": [true, true, ...],    // Digital input pullup flags
  "diInvert": [false, false, ...],  // Digital input inversion
  "diLatch": [false, false, ...],   // Digital input latching
  "doInvert": [false, false, ...],  // Digital output inversion
  "doInitialState": [false, ...]    // Initial DO states on boot
}
```

**Firmware Interaction**:
- Loaded during boot via `loadConfig()`
- Applied to Ethernet driver immediately via `setupEthernet()`
- When modified via web UI POST `/config`, saved and applied immediately via `reapplyNetworkConfig()`
- Changes persist across reboots

#### 2. **sensors.json** – Sensor Configuration
**Location**: Flash filesystem (LittleFS)  
**Purpose**: Stores all I2C, UART, OneWire, and analog sensor configurations including calibration parameters.

**Structure**:
```json
{
  "sensors": [
    {
      "enabled": true,
      "name": "IMU",
      "type": "LIS3DH",
      "protocol": "I2C",
      "i2cAddress": 24,
      "modbusRegister": 3,
      "command": "0x00 0x00",
      "updateInterval": 1000,
      "delayBeforeRead": 0,
      "calibration": {
        "offset": 0,
        "scale": 1,
        "expression": "",           // Optional: math expression for calibration
        "polynomialStr": ""         // Optional: polynomial coefficients
      }
    }
  ]
}
```

**Firmware Interaction**:
- Loaded during boot via `loadSensorConfig()`
- Populates `configuredSensors[]` array used for polling
- Polling queue (`i2cQueue`, `uartQueue`, `oneWireQueue`) reads sensor type and parameters to determine how to read each sensor
- Sensor type string ("LIS3DH", "EZO_PH", "DS18B20", etc.) determines which protocol handler processes the read
- Calibration parameters applied to raw sensor values in `applyCalibration()`, `applyCalibrationB()`, `applyCalibrationC()` functions
- When modified via web UI POST `/sensors/config`, saved and device reboots to apply

### Data Flow: How Sensors Are Polled

1. **Boot**: `setup()` → `loadSensorConfig()` → populates `configuredSensors[]`
2. **Main Loop**: `loop()` → `updateIOpins()` → checks sensor `updateInterval` timers
3. **Enqueue**: If timer elapsed, calls `enqueueBusOperation(sensorIndex, protocol)`
4. **Queue Processing**:
   - `processI2CQueue()` reads sensor type, executes I2C state machine
   - For LIS3DH: writes register address 0xA8 (with auto-increment), reads 6 bytes, parses X/Y/Z
   - For EZO: sends command string, waits for response, parses millivolt reading
   - For DS18B20: sends read command, waits conversion, parses temperature
5. **Data Storage**: Raw value → Calibration function → `configuredSensors[i].calibratedValue` → Modbus register
6. **Web Export**: `/iostatus` and `/sensors/data` endpoints serialize `configuredSensors[]` to JSON

### REST Endpoints & Data Retrieval

| Endpoint | Purpose | Data Source |
|----------|---------|------------|
| `GET /iostatus` | Real-time IO status + sensor values | `ioStatus` struct + `configuredSensors[]` |
| `GET /sensors/data` | Extended sensor telemetry | `configuredSensors[]` array |
| `GET /config` | Current network config | `config` struct |
| `POST /config` | Update network settings | Parses JSON, calls `saveConfig()`, `reapplyNetworkConfig()` |
| `GET /sensors/config` | Sensor configuration list | `sensors.json` contents |
| `POST /sensors/config` | Update sensor definitions | Saves `sensors.json`, triggers reboot |

### Debugging Architecture

**Design Philosophy**: Debugging is **not** implemented via embedded Serial.print() statements scattered throughout the code. Instead, all diagnostics flow through the **web UI Terminal** which provides real-time filtering and protocol analysis.

#### Web UI Terminal Features
- **I2C Traffic Monitor**: Watch register writes/reads for any sensor in real-time
- **Protocol Filtering**: Select specific I2C address, sensor name, or "all" to narrow focus
- **Timestamp Correlation**: See exact millisecond timing of each operation
- **Transaction Logging**: Every I2C operation logged as: TX (write) → ACK → REQ (read) → RX → VAL (parsed)

#### How to Debug Sensors

1. **Open Web UI** → Terminal tab
2. **Start Watching I2C**: Select sensor or I2C address
3. **Observe Logs**:
   - **TX**: Register address or command being sent
   - **ACK**: Acknowledgment received
   - **REQ**: How many bytes requested
   - **RX**: Raw hex bytes received
   - **VAL**: Parsed/calibrated values
4. **Interpret Pattern**:
   - All zeros → sensor not outputting data (initialization or register issue)
   - 0x80 repeated → sensor in default state (not polled or bad config)
   - Garbage values → scaling factor or byte parsing wrong
   - Timeouts → I2C bus issue or wrong address

#### No Serial Debug Code Needed

The firmware does **not** add temporary `Serial.printf()` statements for debugging. Instead:
- Use the web terminal to watch live I2C traffic
- Check `/sensors/data` endpoint for current sensor values
- Review `config.json` and `sensors.json` to verify configuration
- Use Modbus client to read registers and verify export

This keeps the codebase clean and allows debugging without recompilation.


### Modbus Not Responding
- Verify port 502 in network configuration
- Check firewall allows connections
- Use terminal `ipconfig` command to verify network status

For more, see **[Terminal Guide](docs/guides/terminal-guide.md#troubleshooting)** and **[Pinout & Interfaces](docs/hardware/pinout-and-interfaces.md#troubleshooting)**.

## Version & License

- **Current**: v2.0.0 (September 2025)
- See **[Changelog](CHANGELOG.md)** for version history

## Contributing

See **[CONTRIBUTING.md](CONTRIBUTING.md)** for development standards, coding guidelines, and contribution workflow.
