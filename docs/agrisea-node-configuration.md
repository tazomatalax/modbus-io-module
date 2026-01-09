# AgriSea Hydrogel Plant - Modbus Node Configuration Reference

Complete reference for Telegraf Modbus → InfluxDB ingestion configuration.

---

## Device Connection Details

| Node | Hostname | IP Address | Port | Unit ID | Location |
|------|----------|------------|------|---------|----------|
| Pico1 | modbus-io-pico1 | 192.168.100.10 | 502 | 1 | Cold Buffer Pump |
| Pico2 | modbus-io-pico2 | 192.168.100.20 | 502 | 1 | Cold Process Tank Motor |
| Pico3 | modbus-io-pico3 | 192.168.100.30 | 502 | 1 | Cold Buffer Tank |
| Pico4 | modbus-io-pico4 | 192.168.100.40 | 502 | 1 | Hot Process Tank |
| Pico5 | modbus-io-pico5 | 192.168.100.50 | 502 | 1 | Dewatering Centrifuge |
| Pico6 | modbus-io-pico6 | 192.168.100.60 | 502 | 1 | Hot Buffer Tank |

---

## Register Allocation Scheme

| Register Range | Sensor Type | Data Type | Scale Factor |
|----------------|-------------|-----------|--------------|
| 1-10 | Temperature | INT16 | ×0.01 °C |
| 11-30 | Vibration (IMU) | INT16 | mg |
| 51-60 | pH / Conductivity | INT16 | pH×0.01, EC=µS/cm |
| 61-70 | Weight / Load | INT16 | g or kg |
| 71-80 | Flow Rate | INT16 | L/min |

---

## Node-by-Node Configuration

### Pico1 - Cold Buffer Pump (192.168.100.10)

#### Pin Allocations

| Sensor | Protocol | Pin(s) | Address/Config |
|--------|----------|--------|----------------|
| IMU - Pump Vibration | I2C | SDA=4, SCL=5 | 0x19 (25) |
| Pump Temperature | One-Wire | GPIO 28 | - |
| Flow Meter | RS485/UART | TX=0, RX=1, RTS=2 | Slave 1, 9600 baud |

#### Modbus Registers (Input Registers - FC4)

| Register | Field Name | Description | Enabled |
|----------|------------|-------------|---------|
| 1 | temperature | Pump Temperature | ✅ |
| 11 | accel_x | IMU X-axis | ✅ |
| 12 | accel_y | IMU Y-axis | ✅ |
| 13 | accel_z | IMU Z-axis | ✅ |
| 71 | flow_rate | Flow Meter | ❌ |

---

### Pico2 - Cold Process Tank Motor (192.168.100.20)

#### Pin Allocations

| Sensor | Protocol | Pin(s) | Address/Config |
|--------|----------|--------|----------------|
| Motor Vibration | I2C | SDA=4, SCL=5 | 0x18 (24) |

#### Modbus Registers (Input Registers - FC4)

| Register | Field Name | Description | Enabled |
|----------|------------|-------------|---------|
| 11 | accel_x | IMU X-axis | ✅ |
| 12 | accel_y | IMU Y-axis | ✅ |
| 13 | accel_z | IMU Z-axis | ✅ |

---

### Pico3 - Cold Buffer Tank (192.168.100.30)

#### Pin Allocations

| Sensor | Protocol | Pin(s) | Address/Config |
|--------|----------|--------|----------------|
| IMU1 - Buffer Tank Vibration | I2C | SDA=4, SCL=5 | 0x18 (24) |
| IMU2 - Tank Base Vibration | I2C | SDA=4, SCL=5 | 0x19 (25) |
| Tank Weight | Digital (HX711) | DATA=0, CLK=1 | - |

#### Modbus Registers (Input Registers - FC4)

| Register | Field Name | Description | Enabled |
|----------|------------|-------------|---------|
| 11 | accel1_x | IMU1 X-axis | ✅ |
| 12 | accel1_y | IMU1 Y-axis | ✅ |
| 13 | accel1_z | IMU1 Z-axis | ✅ |
| 14 | accel2_x | IMU2 X-axis | ✅ |
| 15 | accel2_y | IMU2 Y-axis | ✅ |
| 16 | accel2_z | IMU2 Z-axis | ✅ |
| 61 | weight | Tank Weight | ❌ |

---

### Pico4 - Hot Process Tank (192.168.100.40)

#### Pin Allocations

| Sensor | Protocol | Pin(s) | Address/Config |
|--------|----------|--------|----------------|
| IMU1 - Hot Tank Vibration | I2C | SDA=4, SCL=5 | 0x18 (24) |
| IMU2 - Tank Outlet Vibration | I2C | SDA=4, SCL=5 | 0x19 (25) |
| Temperature - Hot Tank | One-Wire | GPIO 28 | - |

#### Modbus Registers (Input Registers - FC4)

| Register | Field Name | Description | Enabled |
|----------|------------|-------------|---------|
| 1 | temperature | Tank Temperature | ✅ |
| 11 | accel1_x | IMU1 X-axis | ✅ |
| 12 | accel1_y | IMU1 Y-axis | ✅ |
| 13 | accel1_z | IMU1 Z-axis | ✅ |
| 14 | accel2_x | IMU2 X-axis | ✅ |
| 15 | accel2_y | IMU2 Y-axis | ✅ |
| 16 | accel2_z | IMU2 Z-axis | ✅ |

---

### Pico5 - Dewatering Centrifuge (192.168.100.50)

#### Pin Allocations

| Sensor | Protocol | Pin(s) | Address/Config |
|--------|----------|--------|----------------|
| IMU - Centrifuge Vibration | I2C | SDA=4, SCL=5 | 0x18 (24) |
| pH Sensor (EZO-PH) | I2C | SDA=4, SCL=5 | 0x48 (72) |
| Conductivity Sensor (EZO-EC) | I2C | SDA=4, SCL=5 | 0x64 (100) |
| Flow Meter | RS485 | (TBD) | Slave 1, 9600 baud |

#### Modbus Registers (Input Registers - FC4)

| Register | Field Name | Description | Enabled |
|----------|------------|-------------|---------|
| 11 | accel_x | IMU X-axis | ✅ |
| 12 | accel_y | IMU Y-axis | ✅ |
| 13 | accel_z | IMU Z-axis | ✅ |
| 51 | ph | pH Value | ✅ |
| 52 | conductivity | EC Value | ✅ |
| 71 | flow_rate | Flow Meter | ❌ |

---

### Pico6 - Hot Buffer Tank (192.168.100.60)

#### Pin Allocations

| Sensor | Protocol | Pin(s) | Address/Config |
|--------|----------|--------|----------------|
| IMU1 - Tank Vibration | I2C | SDA=4, SCL=5 | 0x18 (24) |
| IMU2 - Pump Vibration | I2C | SDA=4, SCL=5 | 0x19 (25) |
| Temp1 - Tank Top | One-Wire | GPIO 22 | - |
| Temp2 - Tank Middle | One-Wire | GPIO 26 | - |
| Temp3 - Tank Bottom | One-Wire | GPIO 28 | - |
| Tank Weight | Digital (HX711) | DATA=2, CLK=3 | - |

#### Modbus Registers (Input Registers - FC4)

| Register | Field Name | Description | Enabled |
|----------|------------|-------------|---------|
| 1 | temperature1 | Temp Top | ✅ |
| 2 | temperature2 | Temp Middle | ✅ |
| 3 | temperature3 | Temp Bottom | ✅ |
| 11 | accel1_x | IMU1 X-axis | ✅ |
| 12 | accel1_y | IMU1 Y-axis | ✅ |
| 13 | accel1_z | IMU1 Z-axis | ✅ |
| 14 | accel2_x | IMU2 X-axis | ✅ |
| 15 | accel2_y | IMU2 Y-axis | ✅ |
| 16 | accel2_z | IMU2 Z-axis | ✅ |
| 61 | weight | Tank Weight | ❌ |

---

## Pin Summary by Protocol

### I2C Bus (All Nodes)
- **SDA**: GPIO 4
- **SCL**: GPIO 5

| I2C Address | Device | Nodes |
|-------------|--------|-------|
| 0x18 (24) | LIS3DH IMU (Primary) | All |
| 0x19 (25) | LIS3DH IMU (Secondary) | Pico1, Pico3, Pico4, Pico6 |
| 0x48 (72) | Atlas EZO-PH | Pico5 |
| 0x64 (100) | Atlas EZO-EC | Pico5 |

### One-Wire (DS18B20 Temperature)

| Node | GPIO Pin(s) |
|------|-------------|
| Pico1 | 28 |
| Pico4 | 28 |
| Pico6 | 22, 26, 28 |

### Digital (HX711 Weight Sensors)

| Node | DATA Pin | CLOCK Pin | Status |
|------|----------|-----------|--------|
| Pico3 | 0 | 1 | Planned |
| Pico6 | 2 | 3 | Planned |

### RS485/UART (Flow Meters)

| Node | TX | RX | RTS | Baud | Status |
|------|----|----|-----|------|--------|
| Pico1 | 0 | 1 | 2 | 9600 | Planned |
| Pico5 | TBD | TBD | TBD | 9600 | Planned |

---

## InfluxDB Tags (Recommended)

```toml
[inputs.modbus.tags]
  location = "cold_buffer_pump"  # per device
  node = "pico1"                 # per device
  plant = "agrisea_hydrogel"
```

| Tag | Possible Values |
|-----|-----------------|
| `location` | cold_buffer_pump, cold_process_tank, cold_buffer_tank, hot_process_tank, dewatering_centrifuge, hot_buffer_tank |
| `node` | pico1, pico2, pico3, pico4, pico5, pico6 |
| `sensor_type` | temperature, accelerometer, ph, conductivity, weight, flow |

---

## Consolidated Active Register Map

| Node | IP | Reg 1 | Reg 2 | Reg 3 | Reg 11-13 | Reg 14-16 | Reg 51 | Reg 52 | Reg 61 | Reg 71 |
|------|----|-------|-------|-------|-----------|-----------|--------|--------|--------|--------|
| Pico1 | .10 | Temp | - | - | IMU | - | - | - | - | Flow* |
| Pico2 | .20 | - | - | - | IMU | - | - | - | - | - |
| Pico3 | .30 | - | - | - | IMU1 | IMU2 | - | - | Weight* | - |
| Pico4 | .40 | Temp | - | - | IMU1 | IMU2 | - | - | - | - |
| Pico5 | .50 | - | - | - | IMU | - | pH | EC | - | Flow* |
| Pico6 | .60 | Temp1 | Temp2 | Temp3 | IMU1 | IMU2 | - | - | Weight* | - |

*Disabled/Planned sensors

---

## Git Branch Reference

| Node | Branch Name |
|------|-------------|
| Pico1 | `pico1-cold-buffer-pump` |
| Pico2 | `pico2-cold-process-tank` |
| Pico3 | `pico3-cold-buffer-tank` |
| Pico4 | `pico4-hot-process-tank` |
| Pico5 | `pico5-dewatering-centrifuge` |
| Pico6 | `pico6-hot-buffer-tank` |

---

*Document generated: January 2026*
*Register scheme: AgriSea IP-based Modbus TCP (Unit ID = 1 for all)*
