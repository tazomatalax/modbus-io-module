# System Architecture Overview

## Core Design Principles

1. **Determinism** – Avoid dynamic allocation in fast paths (sensor polling, Modbus service loop)
2. **Single Source of Truth** – No forked logic between simulator and firmware
3. **Additive Evolution** – Extend contracts with versioning before major refactors
4. **Separation** – Simulator is UI test harness only; never influences firmware code

---

## Layered Architecture

### Layer 1: Hardware Abstraction
**Files**: `include/sys_init.h`

Defines:
- Pin constants and board configuration
- GPIO mapping for DI, DO, ADC
- I2C, SPI, Ethernet pin assignments
- Hardware limits and constraints

**Responsibility**:
- Isolate hardware specifics from business logic
- Provide clean interface for initialization
- Document pin conflicts and constraints

---

### Layer 2: Firmware Core
**Files**: `src/main.cpp`

Main responsibilities:
1. **Setup** (`setup()`) – Initialize hardware, load config, start services
2. **Main Loop** (`loop()`) – Orchestrate polling, Modbus, HTTP, watchdog
3. **IO Refresh** (`updateIOpins()`) – Sample DI/AI, manage latching/inversion
4. **Client Sync** (`updateIOForClient()`) – Push state to Modbus registers

Key timing:
- Loop iteration: <500 ms typical, <5 s max (watchdog)
- I2C operations: <5 ms each, non-blocking preferred
- Modbus response: <100 ms typical

---

### Layer 3: Persistence Layer
**Files**: LittleFS-based JSON (`config.json`, `sensors.json`)

Manages:
- Network configuration (IP, subnet, gateway, Modbus port)
- IO configuration (pullup, inversion, latch settings)
- Sensor configuration (type, address, polling interval, calibration)
- Configuration versioning (via `CONFIG_VERSION`)

**Constraints**:
- JSON document size limited by available SRAM
- Atomic writes required for consistency
- Migration logic needed for version upgrades

---

### Layer 4: Protocol Handlers

#### Modbus TCP Server
**Files**: `src/main.cpp` (Modbus setup + register sync)

Exposes:
- **FC1/FC5** (Coils): Digital outputs + latch reset
- **FC2** (Discrete Inputs): Digital input states
- **FC3/FC16** (Holding): Reserved for future use
- **FC4** (Input Registers): Analog + sensor values

Per-client architecture:
- One `ModbusServer` instance per connected client
- Synchronized state ensures all clients see consistent data
- Automatic client cleanup on disconnect

#### HTTP Server (REST API)
**Files**: `src/main.cpp` (endpoint handlers)

Key endpoints:
- **GET `/config`** – Network + Modbus configuration
- **POST `/config`** – Update configuration (triggers reboot)
- **GET `/iostatus`** – Live IO state snapshot
- **GET/POST `/ioconfig`** – IO feature configuration
- **POST `/setoutput`** – Digital output control
- **GET/POST `/sensors/config`** – Sensor configuration
- **POST `/api/sensor/command`** – Send EZO commands

---

### Layer 5: Web Interface
**Files**: `data/` (HTML, CSS, JavaScript)

Responsibilities:
- User-facing configuration UI
- Real-time IO monitoring via polling (`/iostatus`)
- Sensor data visualization with calibration pipeline
- Terminal-style command interface
- Error handling and user feedback

**Architecture**:
- Static assets served from LittleFS flash
- JavaScript handles polling and UI updates
- No state persistence on client (all state server-side)

---

### Layer 6: Simulator (UI Development Only)
**Files**: `simulator/server.js`

Purpose:
- Express.js server mirroring firmware REST API
- Synthetic data generation for UI testing
- No firmware logic duplication
- Independent from build process

**Key Rule**: Simulator must NEVER gate firmware changes or introduce dev-only code branches

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     External Network                             │
│  ┌──────────────────────────┐         ┌──────────────────────┐  │
│  │  Modbus TCP Clients      │         │  Web Browser / UI    │  │
│  │  (Port 502)              │         │  (Port 80)           │  │
│  └──────────────────────────┘         └──────────────────────┘  │
│              │                                  │                 │
└──────────────┼──────────────────────────────────┼─────────────────┘
               │                                  │
        ┌──────▼──────────────────────────────────▼────────┐
        │          Wiznet W5500 Ethernet                   │
        │        (lwIP TCP/IP Stack)                       │
        └───────────────────────────┬──────────────────────┘
                                    │
        ┌───────────────────────────▼──────────────────────┐
        │            RP2040 Processor                      │
        │                                                   │
        │  ┌─────────────────────────────────────────────┐ │
        │  │  Main Loop                                  │ │
        │  │  • Modbus server accept & poll             │ │
        │  │  • HTTP request dispatch                   │ │
        │  │  • IO sampling & processing                │ │
        │  │  • Sensor polling (I2C)                    │ │
        │  │  • Watchdog reset                          │ │
        │  └─────────────────────────────────────────────┘ │
        │         │              │              │          │
        │         ▼              ▼              ▼          │
        │  ┌───────────┐  ┌────────────┐  ┌──────────┐   │
        │  │ GPIO I/O  │  │  LittleFS  │  │ I2C Bus  │   │
        │  │ (DI/DO)   │  │  (Config)  │  │ (Sensors)│   │
        │  │ (ADC)     │  │            │  │          │   │
        │  └───────────┘  └────────────┘  └──────────┘   │
        │         │              │              │          │
        └─────────┼──────────────┼──────────────┼──────────┘
                  │              │              │
           ┌──────▼────┐  ┌──────▼────┐  ┌─────▼──────┐
           │ External  │  │ Flash FS  │  │  I2C       │
           │ Signals   │  │ Storage   │  │  Devices   │
           │ (Switches,│  │ (Config)  │  │ (Sensors)  │
           │  Relays)  │  │           │  │            │
           └───────────┘  └───────────┘  └────────────┘
```

---

## Configuration Flow

```
┌─────────────────────────────────────────────────────────┐
│ Boot Sequence                                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 1. setup()                                             │
│    • Initialize GPIO pins (DI/DO/ADC)                 │
│    • Initialize LittleFS                              │
│    • Load config.json (network settings)              │
│    • Load sensors.json (sensor configuration)         │
│    • Apply sensor presets (defaults for known types)  │
│    • Initialize Ethernet + DHCP                       │
│    • Initialize Modbus server                         │
│    • Initialize I2C bus                               │
│    • Start HTTP server + register handlers            │
│                                                         │
│ 2. loop() [continuous]                                │
│    • Accept Modbus client connections                 │
│    • Poll connected Modbus clients                    │
│    • Update IO (sample inputs, push to outputs)      │
│    • Process I2C sensor queue                         │
│    • Dispatch HTTP requests                           │
│    • Reset watchdog timer                             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Sensor Integration Pipeline

```
┌──────────────────────────────────────────────────────────────┐
│ Sensor Configuration (Web UI)                                │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ User selects:                                               │
│  • Protocol (I2C, UART, Analog, Digital, OneWire)          │
│  • Sensor Type (EZO_PH, BME280, DS18B20, etc.)             │
│  • Pin/Address (validated against available resources)     │
│  • Polling Interval (e.g., 5000 ms)                        │
│  • Calibration Formula (linear or polynomial)              │
│                                                              │
│ UI POSTs to `/sensors/config` → Firmware saves to JSON    │
│ User clicks "Save & Reboot"                                │
│                                                              │
└────────┬─────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│ Sensor Initialization (Firmware startup)                    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ For each sensor in sensors.json:                            │
│  1. Apply preset defaults (address, interval, command)      │
│  2. Initialize based on protocol:                           │
│     • I2C: Probe address, initialize Wire                  │
│     • Analog: Configure ADC channel                         │
│     • Digital: Set GPIO mode                               │
│     • OneWire: Probe bus for devices                       │
│  3. Store initial state in configuredSensors[] array       │
│                                                              │
└────────┬─────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│ Sensor Polling Loop (Firmware main loop)                    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ Periodic (every loop iteration):                            │
│  1. updateBusQueues() – Check if sensor polling interval met│
│  2. If interval elapsed: enqueueBusOperation() for sensor   │
│  3. processI2CQueue() / processUARTQueue() / etc.           │
│     • Send command to sensor                               │
│     • Wait specified delay                                 │
│     • Read response                                        │
│  4. Parse raw value (e.g., float temperature)             │
│  5. Apply calibration formula                              │
│  6. Store calibrated value                                │
│  7. Convert to Modbus integer (scale x100 typical)        │
│  8. Update Modbus input registers                          │
│                                                              │
└────────┬─────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│ Data Exposure Layer                                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ REST API (/iostatus, /sensors/data):                        │
│  • Return raw and calibrated values as JSON                │
│  • Include units, last update time, status                │
│                                                              │
│ Modbus TCP (FC4):                                           │
│  • Calibrated value (scaled integer) in input register     │
│  • Synchronized across all connected clients               │
│                                                              │
│ Web UI:                                                     │
│  • Polls /iostatus periodically                            │
│  • Displays raw → calibration → final value flow          │
│  • Shows status indicators (active, error, disabled)       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Memory Management Strategy

### SRAM Budget (264 KB total)
- **Modbus servers** (~2 KB per client, max ~32 KB)
- **Config structures** (~2 KB)
- **Sensor array** (~30 bytes per sensor, max 20 sensors = 600 B)
- **IO buffers** (~1 KB)
- **JSON documents** (~8 KB each for request/response)
- **Watchdog/System** (~50 KB)
- **Available headroom** (~180 KB)

### Flash/LittleFS Budget (512 KB filesystem)
- **HTML/CSS/JS** (~50 KB)
- **config.json** (~1 KB)
- **sensors.json** (~5 KB)
- **Available** (~455 KB)

### Key Constraints
1. No unbounded dynamic allocations in fast paths
2. Sensor array size controlled by `MAX_SENSORS` constant
3. JSON documents right-sized to avoid waste
4. Periodic audit of memory usage during development

---

## Error Handling Strategy

### Sensor-Level Errors
- **I2C timeout**: Mark sensor as error, skip polling, try next cycle
- **Invalid response**: Log error, retain last valid value
- **Bus conflict**: Use TCA9548A multiplexer or implement sequencing

### System-Level Errors
- **Modbus client disconnect**: Automatic cleanup, no memory leak
- **Filesystem corruption**: Factory reset available
- **Network outage**: Fallback to static IP, maintain local state
- **Main loop stall**: Watchdog triggers automatic reboot

### Recovery Mechanisms
- Graceful degradation (failed sensors don't crash system)
- Automatic retry with backoff
- Persistent error logging (if available)
- Manual factory reset via web UI or terminal

---

## Modbus Register Mapping Philosophy

**Current Allocation**:
```
FC2 (Discrete Inputs)  – 0-7:   Digital input states (read-only)
FC1/FC5 (Coils)        – 0-7:   Digital outputs (read/write)
FC1/FC5 (Coils)        – 100-107: DI latch reset (write pulse)
FC4 (Input Registers)  – 0-2:   Analog inputs (read-only)
FC4 (Input Registers)  – 3-15:  Reserved for sensors (read-only)
FC4 (Input Registers)  – 16-31: Reserved for future use
FC3/FC16 (Holding)     – 0-15:  Available for parameters (future)
```

**Expansion Strategy**:
- Reserve contiguous blocks per sensor family
- Maintain backward compatibility (never repurpose addresses)
- Document mapping in this architecture file
- Update CONTRIBUTING.md when new registers allocated

---

## Testing & Validation

### Unit Level
- Calibration formula evaluation (linear, polynomial)
- GPIO input/output state transitions
- ADC reading conversion

### Integration Level
- Complete sensor workflow (config → poll → expose)
- Modbus client synchronization
- HTTP REST API contracts
- I2C bus collision handling

### System Level
- 48-hour stability test
- Multiple concurrent Modbus clients
- Simulator vs. firmware behavioral parity
- Performance metrics (loop time, memory, response latency)

---

## References & Documentation

- **CONTRIBUTING.md** – Detailed development workflow and standards
- **ROADMAP.md** – Strategic phases and deliverables
- **docs/hardware/pinout-and-interfaces.md** – Pin assignments and electrical specs
- **docs/guides/terminal-guide.md** – Terminal command reference
- **docs/guides/calibration-guide.md** – Calibration formula examples
- **docs/technical/ezo-sensor-polling.md** – EZO sensor implementation details
