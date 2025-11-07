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
- **IO**: 8 DI (GP0-7), 8 DO (GP8-15), 3 AI (GP26-28)
- **Sensors**: I2C bus (GP24/25) for EZO, BME280, DS18B20, and custom sensors
- **Modbus**: TCP port 502 (configurable)

For complete pinout and electrical specs, see **[Pinout & Interfaces](docs/hardware/pinout-and-interfaces.md)**.

## Documentation

- **[Contributing Guide](CONTRIBUTING.md)** – Development standards and workflow
- **[Project Roadmap](ROADMAP.md)** – Strategic phases and feature planning
- **[Architecture Overview](docs/architecture/system-overview.md)** – Design and data flows
- **[Hardware Pinout](docs/hardware/pinout-and-interfaces.md)** – GPIO and interfaces
- **[Calibration Guide](docs/guides/calibration-guide.md)** – Sensor calibration formulas
- **[Terminal Guide](docs/guides/terminal-guide.md)** – Diagnostic commands
- **[Full Documentation Index](docs/README.md)** – Complete guide directory

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
