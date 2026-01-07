I2C Polling and Bus Management Modification Plan
The core modification focuses on ensuring that the Wire instance is correctly re-initialized/reconfigured for a specific pin pair (SDA/SCL) before every single I2C transaction, even if the new sensor is on the same physical bus but a different pin pair.

1. Enhanced Sensor Configuration Structure; 
Update the sensor configuration to explicitly define the I2C Bus ID (I2C0 or I2C1) along with the SDA/SCL pins. This provides a clear path for hardware initialization.File: Likely where SensorConfig struct is defined (e.g., in a main header or main.cpp).Action: Add a field to the SensorConfig struct and the sensors.json schema:C++struct SensorConfig {
    // ... existing fields ...
    char protocol[16];        // e.g., "I2C"
    int sda_pin;              // NEW: Explicit SDA pin (e.g., 4)
    int scl_pin;              // NEW: Explicit SCL pin (e.g., 5)
    int i2c_bus_id;           // NEW: 0 for I2C0, 1 for I2C1
    int i2cAddress;           // Existing I2C address
    // ... other fields ...
};
Note: The current use of setI2CPins(int sda, int scl) (as per CHANGELOG.md) suggests a reliance on the Arduino Wire library's dynamic pin configuration, which is good. The i2c_bus_id will primarily serve for validation against the RP2040's pin functions and better debugging/UI feedback, but the core logic relies on the pin numbers.

2. Atomic I2C Transaction Wrapper;
The most critical change is to wrap all I2C communications (initialization, write, read) in a single atomic function that manages the pin switch only if necessary. This resolves conflicts by ensuring only one active I2C context exists per transaction.File: src/main.cpp.
Action A: Update setI2CPins() LogicThe setI2CPins(int sda, int scl) function needs to be robust:C++// Global tracking variables (already mentioned in CHANGELOG.md)
static int currentI2C_SDA = -1;
static int currentI2C_SCL = -1;

void setI2CPins(int sda, int scl) {
    if (sda == currentI2C_SDA && scl == currentI2C_SCL) {
        // Pins are already configured, avoid re-initialization overhead.
        return; 
    }

    // 1. END the existing bus if it was active to free the pins (optional but recommended)
    Wire.end(); 

    // 2. Configure new pins and start the bus
    // Use the proper RP2040 functions (Wire.setSDA/SCL before Wire.begin)
    Wire.setSDA(sda);
    Wire.setSCL(scl);
    Wire.begin(); 

    // 3. Update tracking variables
    currentI2C_SDA = sda;
    currentI2C_SCL = scl;

    // Logging for debugging (as mentioned in CHANGELOG.md)
    Serial.printf("I2C Pin Switch: New SDA/SCL: GP%d/GP%d\n", sda, scl);
}
Action B: Implement an I2C Transaction HelperCreate a function that encapsulates the full transaction:C++bool performI2CTransaction(const SensorConfig& sensor, 
                           std::function<bool()> transactionCallback) {
    // 1. Switch pins
    setI2CPins(sensor.sda_pin, sensor.scl_pin);

    // 2. Perform the actual read/write/poll operation (e.g., EZO command, LIS3DH read)
    return transactionCallback();
}
3. Sequential Polling Queue LogicThe processI2CQueue() function is where the sequential, conflict-free polling will be enforced using the new helper.File: src/main.cppAction: Modify processI2CQueue() to:Dequeue the next sensor/operation.Get the required sda_pin and scl_pin from the sensor configuration in sensors.json.Call performI2CTransaction() with a lambda or function pointer specific to that sensor's polling logic (e.g., LIS3DH reading, EZO sensor command).If the polling is successful, update the Modbus register and lastReadTime.Example processI2CQueue Flow:C++void processI2CQueue() {
    if (i2cQueue.isEmpty()) return;

    // Get next sensor to process
    int sensorIndex = i2cQueue.dequeue();
    SensorConfig& sensor = configuredSensors[sensorIndex];

    // Define the specific polling logic for this sensor type
    auto pollingLogic = [&]() {
        if (strcmp(sensor.type, "LIS3DH") == 0) {
            // LIS3DH specific read implementation using Wire
            // Wire.beginTransmission(sensor.i2cAddress);
            // ...
            return true; // or false on failure
        } else if (strcmp(sensor.type, "EZO_PH") == 0) {
            // EZO specific command/read
            // ...
            return true;
        }
        return false; 
    };

    // Execute transaction, handling pin switching automatically
    if (performI2CTransaction(sensor, pollingLogic)) {
        // Success: Apply calibration and update modbus/timestamp
        // ...
    } else {
        // Failure: Log error, possibly mark sensor as failed
    }
}
4. Custom/Preset Sensor Abstraction; ensure this system for I2C polling is compatible with the two-pronged sensor polling and data abstraction strategy ie :A. Preset Sensors (Known Types)Action: Create dedicated, optimized functions for known sensor types (like LIS3DH, EZO_PH). These functions will be the transactionCallback and will contain the hardcoded I2C register addresses and data parsing logic.Benefit: Fastest polling, pre-validated logic.B. Generic Sensors (Custom Protocol/UI Configured)Action: Implement a Generic I2C Handler that reads the command field from sensors.json (e.g., "command": "0xAA 0xBB"), executes the raw I2C write/read sequence based on the configuration, and then applies the mathematical formula expression from the formula field for parsing and scaling.File: A new helper file (e.g., generic_sensor_i2c.cpp).Benefit: Maximizes flexibility without requiring firmware recompilation for new, simple I2C devices.Summary of Key Files to ModifyFilePurpose of ModificationHeader (e.g., sys_init.h)Update SensorConfig struct with sda_pin, scl_pin, and i2c_bus_id.src/main.cppRefine setI2CPins() to check for existing pin configuration before Wire.end() and Wire.begin().src/main.cppImplement performI2CTransaction() as a wrapper for all I2C communication.src/main.cppUpdate processI2CQueue() to use performI2CTransaction() and dynamically call the correct sensor-specific logic.data/sensors.jsonUpdate schema/example to include the new sda_pin and scl_pin fields. Make sure it does not interefer with other sensor protocols and polling if the gp pins on the I2C buses are set for other uses.