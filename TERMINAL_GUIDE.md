# Interactive Terminal Guide

The Modbus IO Module now includes a comprehensive interactive terminal that allows you to query and control all pins, sensors, and system components in real-time.

## Accessing the Terminal

1. Connect to the device's web interface (check Serial Monitor for IP address)
2. Navigate to the "Terminal" section
3. Select protocol, pin/port, and enter commands
4. Use the "Watch" mode for continuous monitoring

## Supported Protocols

### 1. Digital I/O
**Available Pins:**
- Digital Inputs: DI0 - DI7 (GPIO pins 0-7)
- Digital Outputs: DO0 - DO7 (GPIO pins 8-15)

**Commands:**
- `read` - Read current pin state
- `write <value>` - Write to output pin (1/0 or HIGH/LOW)
- `config <option>` - Configure input pin options

**Examples:**
```
Protocol: Digital, Pin: DI0, Command: read
Response: DI0 = LOW (Raw: LOW)

Protocol: Digital, Pin: DO0, Command: write 1
Response: DO0 set to HIGH

Protocol: Digital, Pin: DI0, Command: config pullup
Response: DI0 pullup ENABLED
```

**Config Options for Digital Inputs:**
- `pullup` - Toggle internal pullup resistor
- `invert` - Toggle logic inversion
- `latch` - Toggle latching behavior (stays ON until read)

### 2. Analog Inputs
**Available Pins:**
- AI0 - AI2 (GPIO pins 26-28)

**Commands:**
- `read` - Read analog value in millivolts
- `config` - Show pin configuration

**Examples:**
```
Protocol: Analog, Pin: AI0, Command: read
Response: AI0 = 1650 mV

Protocol: Analog, Pin: AI1, Command: config
Response: AI1 - Pin 27, Range: 0-3300mV, Resolution: 12-bit
```

### 3. I2C Communication
**Commands:**
- `scan` - Scan for all I2C devices on the bus
- `probe` - Check if specific device exists at address
- `read <register>` - Read from device register
- `write <register> <data>` - Write data to device register

**I2C Address Format:**
- Decimal: 72
- Hexadecimal: 0x48

**Examples:**
```
Protocol: I2C, Pin: Any, Command: scan
Response: I2C Device Scan:
Found device at 0x48
Found device at 0x77

Protocol: I2C, Address: 0x48, Command: probe
Response: Device at 0x48 is present

Protocol: I2C, Address: 0x48, Command: read 0
Response: Register 0x0 = 0x25 (37)

Protocol: I2C, Address: 0x48, Command: write 1 128
Response: Wrote 0x80 to register 0x1
```

### 4. UART Communication
**Available Ports:**
- Serial1 (Default pins: TX=0, RX=1)
- Configurable baud rates: 9600, 19200, 38400, 57600, 115200

**Commands:**
- `help` - Show all available UART commands
- `init` - Initialize UART at 9600 baud (default)
- `send <data>` - Send data to connected UART device
- `read` - Read data from UART receive buffer
- `loopback` - Test UART loopback functionality
- `baudrate <rate>` - Set baud rate (9600, 19200, 38400, 57600, 115200)
- `status` - Show UART status and pin configuration
- `at` - Send AT command (useful for modems/GPS modules)
- `echo <on|off>` - Enable/disable echo mode for devices
- `clear` - Clear UART receive buffer

**Examples:**
```
Protocol: UART, Command: help
Response: UART Commands: help, init, send [data], read, loopback, baudrate [rate], status, at, echo [on/off]

Protocol: UART, Command: init
Response: UART initialized on Serial1 at 9600 baud

Protocol: UART, Command: send Hello World
Response: Sent: Hello World

Protocol: UART, Command: read
Response: Received: OK

Protocol: UART, Command: baudrate 115200
Response: Baudrate set to 115200

Protocol: UART, Command: at
Response: AT Response: OK

Protocol: UART, Command: loopback
Response: Sent: TEST123, Received: TEST123
```

**Common UART Troubleshooting:**
- Use `status` to verify pin configuration
- Use `clear` to flush old data before testing
- Use `loopback` to test if TX/RX are properly connected
- Use `baudrate` to match device communication speed
- Use `at` for testing AT-command compatible devices (GPS, GSM modules)

### 5. Network Information
**Available Ports:**
- Ethernet Interface - W5500
- Ethernet PHY Status  
- Ethernet Pins (MISO:16, CS:17, SCK:18, MOSI:19, RST:20, IRQ:21)
- Modbus TCP Server
- Connected Modbus Clients

**Commands:**
- `status` - Show network/ethernet configuration and status
- `clients` - Show connected Modbus clients
- `link` - Show ethernet link status (UP/DOWN)
- `stats` - Show network statistics

**Examples:**
```
Protocol: Network, Port: Ethernet Interface, Command: status
Response: Ethernet Interface Status:
IP: 192.168.1.100
Gateway: 192.168.1.1
Subnet: 255.255.255.0
MAC: 02:00:00:12:34:56
Link Status: Connected
DHCP: Enabled

Protocol: Network, Port: Ethernet Pins, Command: status
Response: Ethernet Pin Configuration:
MISO: Pin 16
CS: Pin 17
SCK: Pin 18
MOSI: Pin 19
RST: Pin 20
IRQ: Pin 21

Protocol: Network, Port: Modbus TCP Server, Command: status
Response: Modbus TCP Server:
Port: 502
Status: Active
Connected Clients: 2

Protocol: Network, Port: Any, Command: link
Response: Ethernet Link: UP

Protocol: Network, Port: Any, Command: stats
Response: Network Statistics:
Bytes Sent: 1234567
Bytes Received: 987654
Connection Uptime: 3456 seconds

Protocol: Network, Port: Connected Modbus Clients, Command: clients
Response: Modbus Clients:
Connected: 2
Slot 0: 192.168.1.50
Slot 1: 192.168.1.75
```

### 6. System Information
**Commands:**
- `status` - Show system status and uptime
- `sensors` - List configured sensors
- `info` - Show hardware information

**Examples:**
```
Protocol: System, Pin: Any, Command: status
Response: System Status:
CPU: RP2040 @ 133MHz
RAM: 256KB
Flash: 2MB
Uptime: 3456 seconds
Free Heap: 185344 bytes

Protocol: System, Pin: Any, Command: sensors
Response: Configured Sensors:
0: pH_Sensor (EZO_PH) - Enabled
1: Temperature (BME280) - Enabled

Protocol: System, Pin: Any, Command: info
Response: Hardware Information:
Board: Raspberry Pi Pico
Digital Inputs: 8 (Pins 0-7)
Digital Outputs: 8 (Pins 8-15)
Analog Inputs: 3 (Pins 26-28)
I2C: SDA Pin 24, SCL Pin 25
Ethernet: W5500 (Pins 16-21)
```

## Watch Mode

The Watch feature allows continuous monitoring of selected pins/protocols:

1. Select the protocol and pin you want to monitor
2. Click the "Watch" button to start monitoring
3. The terminal will update automatically every 1-2 seconds
4. Click "Stop Watch" to stop monitoring

**Supported in Watch Mode:**
- Digital pin states (inputs and outputs)
- Analog readings
- I2C device probing
- Network status
- System status

## Common Use Cases

### Debugging Digital I/O
```
1. Check input state: Digital → DI0 → read
2. Test output: Digital → DO0 → write 1
3. Configure pullup: Digital → DI0 → config pullup
```

### Monitoring Analog Sensors
```
1. Read voltage: Analog → AI0 → read
2. Use Watch mode for continuous monitoring
```

### I2C Device Discovery
```
1. Scan bus: I2C → Any → scan
2. Probe specific device: I2C → 0x48 → probe
3. Read sensor data: I2C → 0x48 → read 0
```

### System Monitoring
```
1. Check uptime: System → Any → status
2. Monitor clients: Network → Any → clients
3. List sensors: System → Any → sensors
```

## Error Messages

Common error responses and their meanings:

- `Error: Invalid pin number` - Pin number out of range
- `Error: Invalid I2C address` - Address must be 1-127 (0x01-0x7F)
- `Error: Unknown protocol` - Protocol not recognized
- `Error: Unknown command` - Command not supported for selected protocol
- `Error: No device found at 0x48` - I2C device not responding
- `Error: Invalid value. Use 1/0 or HIGH/LOW` - Invalid output value

## Tips

1. **Case Insensitive**: Commands are not case-sensitive
2. **Help Available**: Most protocols support a "help" command for usage info
3. **Watch Mode**: Perfect for real-time debugging and monitoring
4. **I2C Addresses**: Can be entered in decimal (72) or hex (0x48) format
5. **Persistent Settings**: Digital I/O configurations (pullup, invert, latch) persist until device reset

## Troubleshooting

### Terminal Not Responding
- Check network connection to device
- Refresh the web page
- Verify device is powered and running

### I2C Commands Failing
- Check I2C wiring (SDA pin 24, SCL pin 25)
- Verify device addresses with scan command
- Ensure devices are powered correctly

### Digital I/O Not Working
- Check pin assignments in hardware documentation
- Verify external connections
- Use read command to check current states

### UART Communication Issues
- Verify baud rate matches connected device (`baudrate` command)
- Check TX/RX pin connections (default TX=0, RX=1)
- Use `loopback` command to test if TX/RX are properly wired
- Use `clear` command to flush old data before testing
- For AT-compatible devices, use `at` command to test basic communication
- Ensure proper ground connection between devices

This terminal provides a powerful debugging and monitoring interface for all aspects of the Modbus IO Module, making development and troubleshooting much easier.
