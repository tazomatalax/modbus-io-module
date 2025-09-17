/*
 * Modbus IO Module - Dual Interface Architecture
 * W5500 Ethernet for Modbus TCP + Web Interface
 * USB RNDIS for Web Interface
 */

#include <Arduino.h>
#include <SPI.h>
#include <LittleFS.h>
#include <ArduinoJson.h>
#include <ArduinoModbus.h>
#include <EthernetENC.h>
#include <Ezo_i2c.h>
#include "sys_init.h"

// Network Configuration - Dual Interface
EthernetServer ethServer(502);        // W5500 for Modbus TCP
EthernetServer webEthServer(80);      // W5500 for Web Interface (Ethernet)
// Note: USB RNDIS web server will be implemented via CDC-ECM interface

// Modbus Configuration
ModbusTCPServer modbusServer;

// Pin Configuration (Corrected)
const uint8_t I2C_PIN_PAIRS[][2] = {
    {4, 5}  // Only valid I2C pair: GP4 (SDA), GP5 (SCL)
};

const uint8_t AVAILABLE_FLEXIBLE_PINS[] = {
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 23
    // Excludes 16-22 (W5500 reserved), 26-28 (ADC only)
};

const uint8_t ADC_PINS[] = {26, 27, 28};

// Global Variables
IOStatus ioStatus;
Config config;
SensorConfig configuredSensors[MAX_SENSORS];
ModbusClientInfo modbusClients[MAX_MODBUS_CLIENTS];
int numConfiguredSensors = 0;
int connectedClients = 0;
bool core0setupComplete = false;

// EZO Sensor instances - created dynamically based on configuration
static Ezo_board* ezoSensors[MAX_SENSORS] = {nullptr};
static bool ezoSensorsInitialized = false;

// Function declarations
void setPinModes();
void setupEthernet();
void setupUSBNetwork();
void setupModbus();
void setupWebServer();
void handleSimpleHTTP();
void handleDualHTTP();
void routeRequest(EthernetClient& client, String method, String path, String body);
void sendFile(EthernetClient& client, String filename, String contentType);
void send404(EthernetClient& client);
void sendJSON(EthernetClient& client, String json);
void sendJSONConfig(EthernetClient& client);
void sendJSONIOStatus(EthernetClient& client);
void sendJSONIOConfig(EthernetClient& client);
void sendJSONSensorConfig(EthernetClient& client);
void handlePOSTConfig(EthernetClient& client, String body);
void handlePOSTSetOutput(EthernetClient& client, String body);
void handlePOSTIOConfig(EthernetClient& client, String body);
void handlePOSTResetLatches(EthernetClient& client);
void handlePOSTResetSingleLatch(EthernetClient& client, String body);
void handlePOSTSensorConfig(EthernetClient& client, String body);
void handlePOSTSensorCommand(EthernetClient& client, String body);
void updateIOForClient(int clientIndex);

// I2C Sensor Library Template - Uncomment when adding I2C sensors
// Example using BME280 sensor:
// #include <Adafruit_Sensor.h>
// #include <Adafruit_BME280.h>

// I2C Sensor Instance Template - Uncomment and modify for your sensor
// Example for BME280:
// Adafruit_BME280 bme; // Create sensor object

/*
 * Modbus IO Module
 * 
 * Features:
 * - 8 Digital Inputs (with optional pullup, inversion, and latching)
 * - 8 Digital Outputs (with optional inversion and initial state)
 * - 3 Analog Inputs (12-bit resolution)
 * - Modbus TCP Server
 * - Web configuration interface
 * 
 * Modbus Register Map:
 * - Discrete Inputs (FC2): 0-7 - Digital input states
 * - Coils (FC1/FC5): 0-7 - Digital output states
 * - Coils (FC5): 100-107 - Reset latches for digital inputs 0-7
 *   (Write 1 to reset the latch for the corresponding input)
 * - Input Registers (FC4): 0-2 - Analog input values (in mV)
 * - Input Registers (FC4): 3+ - Available for I2C sensor data
 * 
 * Web Interface:
 * - Network Configuration (IP, Gateway, Subnet, DHCP)
 * - IO Status and Control
 * - IO Configuration (Input pullup, inversion, latching, etc.)
 */

void setup() {
    Serial.begin(115200);
    uint32_t timeStamp = millis();
    while (!Serial) {
        if (millis() - timeStamp > 5000) {
            break;
        }
    }
    
    // Very early debug output to confirm device is running
    Serial.println("===========================================");
    Serial.println("MODBUS IO MODULE - STARTUP");
    Serial.println("===========================================");
    Serial.println("Device: Raspberry Pi Pico RP2040");
    Serial.println("Firmware: Dual Interface (Ethernet + USB)");
    Serial.print("Compile Time: ");
    Serial.print(__DATE__);
    Serial.print(" ");
    Serial.println(__TIME__);
    Serial.println("===========================================");
    Serial.println("Booting...");
    
    pinMode(LED_BUILTIN, OUTPUT);

    analogReadResolution(12);
    
    // Initialize LittleFS
    if (!LittleFS.begin()) {
        Serial.println("Failed to mount LittleFS filesystem");
        // Format if mount failed
        if (LittleFS.format()) {
            Serial.println("LittleFS formatted successfully");
            if (!LittleFS.begin()) {
                Serial.println("Failed to mount LittleFS after formatting");
            }
        } else {
            Serial.println("Failed to format LittleFS");
        }
    }
    
    Serial.println("Loading config...");
    delay(500);
    // Load configuration
    loadConfig();
    
    Serial.println("Loading sensor configuration...");
    delay(500);
    // Load sensor configuration
    loadSensorConfig();

    Serial.println("Setting pin modes...");
    delay(500);
    // Set pin modes
    setPinModes();
    
    Serial.println("Setup network and services...");
    // Setup Ethernet network (W5500)
    setupEthernet();
    
    // Setup USB RNDIS network
    setupUSBNetwork();
    
    // Print both IP addresses for easy connection
    Serial.println("========================================");
    Serial.print("Ethernet IP Address: ");
    Serial.println(Ethernet.localIP());
    Serial.println("USB RNDIS IP Address: 192.168.7.1 (planned)");
    Serial.println("Web Interface: Ethernet interface on port 80");
    Serial.println("Modbus TCP: Ethernet interface only on port 502");
    Serial.println("========================================");
    
    setupModbus();
    setupWebServer();
    
    // Initialize I2C bus
    Wire.setSDA(I2C_SDA_PIN);
    Wire.setSCL(I2C_SCL_PIN);
    Wire.begin();
    Serial.println("I2C Bus Initialized.");
    
    // I2C Sensor Initialization Template - Uncomment when adding I2C sensors
    // Example for BME280 sensor:
    // if (!bme.begin(0x76)) { // Common I2C address for BME280
    //     Serial.println("Could not find a valid BME280 sensor, check wiring!");
    //     // Handle sensor initialization failure as needed
    // } else {
    //     Serial.println("BME280 sensor initialized successfully");
    // }
    
    core0setupComplete = true;

    // Start watchdog
    rp2040.wdt_begin(WDT_TIMEOUT);
}

void loop() {
    // Check for new client connections on the Ethernet server
    EthernetClient newClient = ethServer.available();
    
    if (newClient) {
        // Find an available slot for the new client
        bool clientAdded = false;
        for (int i = 0; i < MAX_MODBUS_CLIENTS; i++) {
            if (!modbusClients[i].connected) {
                Serial.print("New client connected to slot ");
                Serial.println(i);
                
                // Store the client and mark as connected
                modbusClients[i].client = newClient;
                modbusClients[i].connected = true;
                modbusClients[i].clientIP = newClient.remoteIP();
                modbusClients[i].connectionTime = millis();
                
                // Accept the connection on this server instance
                modbusClients[i].server.accept(modbusClients[i].client);
                Serial.println("Modbus server accepted client connection");
                
                // Initialize coil states for this client to match current output states
                for (int j = 0; j < 8; j++) {
                    modbusClients[i].server.coilWrite(j, ioStatus.dOut[j]);
                }
                
                connectedClients++;
                clientAdded = true;
                digitalWrite(LED_BUILTIN, HIGH);  // Turn on LED when at least one client is connected
                break;
            }
        }
        
        if (!clientAdded) {
            Serial.println("No available slots for new client");
            newClient.stop();
        }
    }
    
    // Poll all connected clients
    for (int i = 0; i < MAX_MODBUS_CLIENTS; i++) {
        if (modbusClients[i].connected) {
            if (modbusClients[i].client.connected()) {
                // Poll this client's Modbus server
                if (modbusClients[i].server.poll()) {
                    Serial.println("Modbus server recieved new request");
                }
                // Update IO for this specific client
                updateIOForClient(i);
            } else {
                // Client disconnected
                Serial.print("Client disconnected from slot ");
                Serial.println(i);
                modbusClients[i].connected = false;
                modbusClients[i].client.stop();
                connectedClients--;
                
                if (connectedClients == 0) {
                    digitalWrite(LED_BUILTIN, LOW);  // Turn off LED when no clients are connected
                }
            }
        }
    }
    updateIOpins();
    handleEzoSensors();
    handleDualHTTP();  // Handle both Ethernet and USB web interfaces

    // Watchdog timer reset
    rp2040.wdt_reset();
}

void initializeEzoSensors() {
    if (ezoSensorsInitialized) return;
    
    for (int i = 0; i < numConfiguredSensors; i++) {
        if (configuredSensors[i].enabled && strncmp(configuredSensors[i].type, "EZO_", 4) == 0) {
            ezoSensors[i] = new Ezo_board(configuredSensors[i].i2cAddress, configuredSensors[i].name);
            configuredSensors[i].cmdPending = false;
            configuredSensors[i].lastCmdSent = 0;
            memset(configuredSensors[i].response, 0, sizeof(configuredSensors[i].response));
            Serial.printf("Initialized EZO sensor %s at I2C address 0x%02X\n", 
                configuredSensors[i].name, configuredSensors[i].i2cAddress);
        }
    }
    ezoSensorsInitialized = true;
}

void handleEzoSensors() {
    static bool initialized = false;
    
    if (!initialized) {
        initializeEzoSensors();
        initialized = true;
    }
    
    for (int i = 0; i < numConfiguredSensors; i++) {
        if (!configuredSensors[i].enabled || strncmp(configuredSensors[i].type, "EZO_", 4) != 0) {
            continue;
        }
        
        if (ezoSensors[i] == nullptr) {
            continue;
        }
        
        unsigned long currentTime = millis();
        
        if (configuredSensors[i].cmdPending && (currentTime - configuredSensors[i].lastCmdSent > 1000)) {
            ezoSensors[i]->receive_read_cmd();
            
            if (ezoSensors[i]->get_error() == Ezo_board::SUCCESS) {
                float reading = ezoSensors[i]->get_last_received_reading();
                snprintf(configuredSensors[i].response, sizeof(configuredSensors[i].response), "%.2f", reading);
                Serial.printf("EZO sensor %s reading: %s\n", configuredSensors[i].name, configuredSensors[i].response);
            } else {
                snprintf(configuredSensors[i].response, sizeof(configuredSensors[i].response), "ERROR");
                Serial.printf("EZO sensor %s error: %d\n", configuredSensors[i].name, ezoSensors[i]->get_error());
            }
            
            configuredSensors[i].cmdPending = false;
        } 
        else if (!configuredSensors[i].cmdPending && (currentTime - configuredSensors[i].lastCmdSent > 5000)) {
            ezoSensors[i]->send_read_cmd();
            configuredSensors[i].lastCmdSent = currentTime;
            configuredSensors[i].cmdPending = true;
            Serial.printf("Sent read command to EZO sensor %s\n", configuredSensors[i].name);
        }
    }
}

void loadConfig() {
    // Read config from LittleFS
    if (LittleFS.exists(CONFIG_FILE)) {
        File configFile = LittleFS.open(CONFIG_FILE, "r");
        if (configFile) {
            // Create a JSON document to store the configuration
            StaticJsonDocument<2048> doc;
            
            // Deserialize the JSON document
            DeserializationError error = deserializeJson(doc, configFile);
            configFile.close();
            
            if (!error) {
                // Extract configuration values
                config.version = doc["version"] | CONFIG_VERSION;
                config.dhcpEnabled = doc["dhcpEnabled"] | DEFAULT_CONFIG.dhcpEnabled;
                
                // Check if the modbusPort value exists in the config and extract it
                if (doc.containsKey("modbusPort")) {
                    config.modbusPort = doc["modbusPort"].as<uint16_t>();
                    Serial.print("Found modbusPort in config file: ");
                    Serial.println(config.modbusPort);
                } else {
                    config.modbusPort = DEFAULT_CONFIG.modbusPort;
                    Serial.print("modbusPort not found in config, using default: ");
                    Serial.println(config.modbusPort);
                }
                
                Serial.print("Loaded Modbus port from config: ");
                Serial.println(config.modbusPort);
                
                // Get IP addresses
                JsonArray ipArray = doc["ip"].as<JsonArray>();
                if (ipArray) {
                    for (int i = 0; i < 4; i++) {
                        config.ip[i] = ipArray[i] | DEFAULT_CONFIG.ip[i];
                    }
                } else {
                    memcpy(config.ip, DEFAULT_CONFIG.ip, 4);
                }
                
                JsonArray gatewayArray = doc["gateway"].as<JsonArray>();
                if (gatewayArray) {
                    for (int i = 0; i < 4; i++) {
                        config.gateway[i] = gatewayArray[i] | DEFAULT_CONFIG.gateway[i];
                    }
                } else {
                    memcpy(config.gateway, DEFAULT_CONFIG.gateway, 4);
                }
                
                JsonArray subnetArray = doc["subnet"].as<JsonArray>();
                if (subnetArray) {
                    for (int i = 0; i < 4; i++) {
                        config.subnet[i] = subnetArray[i] | DEFAULT_CONFIG.subnet[i];
                    }
                } else {
                    memcpy(config.subnet, DEFAULT_CONFIG.subnet, 4);
                }
                
                // Get hostname
                const char* hostname = doc["hostname"] | DEFAULT_CONFIG.hostname;
                strncpy(config.hostname, hostname, HOSTNAME_MAX_LENGTH - 1);
                config.hostname[HOSTNAME_MAX_LENGTH - 1] = '\0';  // Ensure null termination
                
                // Get digital input configurations
                JsonArray diPullupArray = doc["diPullup"].as<JsonArray>();
                if (diPullupArray) {
                    for (int i = 0; i < 8; i++) {
                        config.diPullup[i] = diPullupArray[i] | DEFAULT_CONFIG.diPullup[i];
                    }
                } else {
                    memcpy(config.diPullup, DEFAULT_CONFIG.diPullup, 8);
                }
                
                JsonArray diInvertArray = doc["diInvert"].as<JsonArray>();
                if (diInvertArray) {
                    for (int i = 0; i < 8; i++) {
                        config.diInvert[i] = diInvertArray[i] | DEFAULT_CONFIG.diInvert[i];
                    }
                } else {
                    memcpy(config.diInvert, DEFAULT_CONFIG.diInvert, 8);
                }
                
                JsonArray diLatchArray = doc["diLatch"].as<JsonArray>();
                if (diLatchArray) {
                    for (int i = 0; i < 8; i++) {
                        config.diLatch[i] = diLatchArray[i] | DEFAULT_CONFIG.diLatch[i];
                    }
                } else {
                    memcpy(config.diLatch, DEFAULT_CONFIG.diLatch, 8);
                }
                
                // Get digital output configurations
                JsonArray doInvertArray = doc["doInvert"].as<JsonArray>();
                if (doInvertArray) {
                    for (int i = 0; i < 8; i++) {
                        config.doInvert[i] = doInvertArray[i] | DEFAULT_CONFIG.doInvert[i];
                    }
                } else {
                    memcpy(config.doInvert, DEFAULT_CONFIG.doInvert, 8);
                }
                
                JsonArray doInitialStateArray = doc["doInitialState"].as<JsonArray>();
                if (doInitialStateArray) {
                    for (int i = 0; i < 8; i++) {
                        config.doInitialState[i] = doInitialStateArray[i] | DEFAULT_CONFIG.doInitialState[i];
                    }
                } else {
                    memcpy(config.doInitialState, DEFAULT_CONFIG.doInitialState, 8);
                }
                
                Serial.println("Configuration loaded from file");
                return;
            } else {
                Serial.print("Failed to parse config file: ");
                Serial.println(error.c_str());
            }
        } else {
            Serial.println("Failed to open config file for reading");
        }
    } else {
        Serial.println("Config file does not exist, using defaults");
    }
    
    // If we get here, use default config
    config = DEFAULT_CONFIG;
    saveConfig();
}

void saveConfig() {
    Serial.println("Saving configuration to LittleFS...");
    
    // Create a JSON document to store the configuration
    StaticJsonDocument<2048> doc;
    
    // Store configuration values
    doc["version"] = config.version;
    doc["dhcpEnabled"] = config.dhcpEnabled;
    doc["modbusPort"] = config.modbusPort;
    
    // Store IP addresses as arrays
    JsonArray ipArray = doc.createNestedArray("ip");
    JsonArray gatewayArray = doc.createNestedArray("gateway");
    JsonArray subnetArray = doc.createNestedArray("subnet");
    
    for (int i = 0; i < 4; i++) {
        ipArray.add(config.ip[i]);
        gatewayArray.add(config.gateway[i]);
        subnetArray.add(config.subnet[i]);
    }
    
    // Store hostname
    doc["hostname"] = config.hostname;
    
    // Store digital input configurations
    JsonArray diPullupArray = doc.createNestedArray("diPullup");
    JsonArray diInvertArray = doc.createNestedArray("diInvert");
    JsonArray diLatchArray = doc.createNestedArray("diLatch");
    
    for (int i = 0; i < 8; i++) {
        diPullupArray.add(config.diPullup[i]);
        diInvertArray.add(config.diInvert[i]);
        diLatchArray.add(config.diLatch[i]);
    }
    
    // Store digital output configurations
    JsonArray doInvertArray = doc.createNestedArray("doInvert");
    JsonArray doInitialStateArray = doc.createNestedArray("doInitialState");
    
    for (int i = 0; i < 8; i++) {
        doInvertArray.add(config.doInvert[i]);
        doInitialStateArray.add(config.doInitialState[i]);
    }
    
    // Open file for writing
    File configFile = LittleFS.open(CONFIG_FILE, "w");
    if (!configFile) {
        Serial.println("Failed to open config file for writing");
        return;
    }
    
    // Serialize JSON to file
    if (serializeJson(doc, configFile) == 0) {
        Serial.println("Failed to write config to file");
    } else {
        Serial.println("Configuration saved successfully");
    }
    
    // Close the file
    configFile.close();
}

void loadSensorConfig() {
    Serial.println("Loading sensor configuration...");
    
    // Initialize sensors array
    numConfiguredSensors = 0;
    memset(configuredSensors, 0, sizeof(configuredSensors));
    
    // Check if sensors.json exists
    if (!LittleFS.exists(SENSORS_FILE)) {
        Serial.println("Sensors config file does not exist, using empty configuration");
        return;
    }
    
    // Open sensors.json for reading
    File sensorsFile = LittleFS.open(SENSORS_FILE, "r");
    if (!sensorsFile) {
        Serial.println("Failed to open sensors config file for reading");
        return;
    }
    
    // Create JSON document to parse the file
    StaticJsonDocument<1024> doc;
    DeserializationError error = deserializeJson(doc, sensorsFile);
    sensorsFile.close();
    
    if (error) {
        Serial.print("Failed to parse sensors config file: ");
        Serial.println(error.c_str());
        return;
    }
    
    // Parse sensors array
    if (doc.containsKey("sensors") && doc["sensors"].is<JsonArray>()) {
        JsonArray sensorsArray = doc["sensors"].as<JsonArray>();
        int index = 0;
        
        for (JsonObject sensor : sensorsArray) {
            if (index >= MAX_SENSORS) {
                Serial.println("Warning: Maximum number of sensors exceeded, ignoring remaining sensors");
                break;
            }
            
            // Parse sensor configuration
            configuredSensors[index].enabled = sensor["enabled"] | false;
            
            const char* name = sensor["name"] | "";
            strncpy(configuredSensors[index].name, name, sizeof(configuredSensors[index].name) - 1);
            configuredSensors[index].name[sizeof(configuredSensors[index].name) - 1] = '\0';
            
            const char* type = sensor["type"] | "";
            strncpy(configuredSensors[index].type, type, sizeof(configuredSensors[index].type) - 1);
            configuredSensors[index].type[sizeof(configuredSensors[index].type) - 1] = '\0';
            
            configuredSensors[index].i2cAddress = sensor["i2cAddress"] | 0;
            configuredSensors[index].modbusRegister = sensor["modbusRegister"] | 0;
            
            // Debug output
            Serial.printf("Loaded sensor %d: %s (%s) at I2C 0x%02X, Modbus register %d, enabled: %s\n",
                index,
                configuredSensors[index].name,
                configuredSensors[index].type,
                configuredSensors[index].i2cAddress,
                configuredSensors[index].modbusRegister,
                configuredSensors[index].enabled ? "true" : "false"
            );
            
            index++;
        }
        
        numConfiguredSensors = index;
        Serial.printf("Loaded %d sensor configurations\n", numConfiguredSensors);
    } else {
        Serial.println("No sensors array found in configuration file");
    }
}

void saveSensorConfig() {
    Serial.println("Saving sensor configuration...");
    
    // Create JSON document
    StaticJsonDocument<1024> doc;
    JsonArray sensorsArray = doc.createNestedArray("sensors");
    
    // Add each configured sensor to the array
    for (int i = 0; i < numConfiguredSensors; i++) {
        JsonObject sensor = sensorsArray.createNestedObject();
        sensor["enabled"] = configuredSensors[i].enabled;
        sensor["name"] = configuredSensors[i].name;
        sensor["type"] = configuredSensors[i].type;
        sensor["i2cAddress"] = configuredSensors[i].i2cAddress;
        sensor["modbusRegister"] = configuredSensors[i].modbusRegister;
    }
    
    // Open file for writing
    File sensorsFile = LittleFS.open(SENSORS_FILE, "w");
    if (!sensorsFile) {
        Serial.println("Failed to open sensors config file for writing");
        return;
    }
    
    // Serialize JSON to file
    if (serializeJson(doc, sensorsFile) == 0) {
        Serial.println("Failed to write sensors config to file");
    } else {
        Serial.println("Sensor configuration saved successfully");
    }
    
    // Close the file
    sensorsFile.close();
}

// Reset all latched inputs
void resetLatches() {
    Serial.println("Resetting all latched inputs");
    for (int i = 0; i < 8; i++) {
        ioStatus.dInLatched[i] = false;
    }
}

void setPinModes() {
    for (int i = 0; i < sizeof(DIGITAL_INPUTS)/sizeof(DIGITAL_INPUTS[0]); i++) {
        pinMode(DIGITAL_INPUTS[i], config.diPullup[i] ? INPUT_PULLUP : INPUT);
    }
    for (int i = 0; i < sizeof(DIGITAL_OUTPUTS)/sizeof(DIGITAL_OUTPUTS[0]); i++) {
        pinMode(DIGITAL_OUTPUTS[i], OUTPUT);
        
        // Set the digital output to its initial state from config
        ioStatus.dOut[i] = config.doInitialState[i];
        
        // Apply any inversion logic
        bool physicalState = config.doInvert[i] ? !ioStatus.dOut[i] : ioStatus.dOut[i];
        digitalWrite(DIGITAL_OUTPUTS[i], physicalState);
    }
}

void setupEthernet() {
    Serial.println("Initializing W5500 Ethernet...");
    Serial.print("  Configuring SPI pins - CS:");
    Serial.print(PIN_ETH_CS);
    Serial.print(", MISO:");
    Serial.print(PIN_ETH_MISO);
    Serial.print(", SCK:");
    Serial.print(PIN_ETH_SCK);
    Serial.print(", MOSI:");
    Serial.println(PIN_ETH_MOSI);
    
    // Initialize SPI for W5500
    SPI.setCS(PIN_ETH_CS);
    SPI.setRX(PIN_ETH_MISO);
    SPI.setSCK(PIN_ETH_SCK);
    SPI.setTX(PIN_ETH_MOSI);
    SPI.begin();
    Serial.println("  SPI initialized successfully");
    
    // MAC address for W5500
    uint8_t mac[] = {0xDE, 0xAD, 0xBE, 0xEF, 0xFE, 0xED};
    Serial.print("  MAC Address: ");
    for (int i = 0; i < 6; i++) {
        if (i > 0) Serial.print(":");
        if (mac[i] < 16) Serial.print("0");
        Serial.print(mac[i], HEX);
    }
    Serial.println();
    
    bool connected = false;
    
    if (config.dhcpEnabled) {
        // Try DHCP first
        Serial.println("Attempting to use DHCP...");
        if (Ethernet.begin(mac) == 1) {
            connected = true;
            Serial.println("DHCP configuration successful");
            Serial.print("IP address: ");
            Serial.println(Ethernet.localIP());
        } else {
            Serial.println("DHCP failed, falling back to static IP");
        }
    }
    
    // If DHCP failed or not enabled, use static IP
    if (!connected) {
        Serial.println("Using static IP configuration");
        IPAddress ip(config.ip[0], config.ip[1], config.ip[2], config.ip[3]);
        IPAddress gateway(config.gateway[0], config.gateway[1], config.gateway[2], config.gateway[3]);
        IPAddress subnet(config.subnet[0], config.subnet[1], config.subnet[2], config.subnet[3]);
        
        // Configure with static IP
        Ethernet.begin(mac, ip, gateway, subnet);
        delay(1000);  // Give it time to initialize
        
        IPAddress currentIP = Ethernet.localIP();
        if (currentIP[0] != 0 || currentIP[1] != 0 || currentIP[2] != 0 || currentIP[3] != 0) {
            connected = true;
            Serial.println("Static IP configuration successful");
        } else {
            Serial.println("Static IP configuration failed - IP not assigned");
        }
    }
    
    Serial.print("Hostname: ");
    Serial.println(config.hostname);
    Serial.print("IP Address: ");
    Serial.println(Ethernet.localIP());
    
    if (!connected) {
        Serial.println("WARNING: Network connection not established");
    }
}

void setupUSBNetwork() {
    Serial.println("USB RNDIS Network Configuration:");
    Serial.println("  USB RNDIS interface configured in platformio.ini");
    Serial.println("  USB IP will be: 192.168.7.1");
    Serial.println("  Note: USB web interface implementation pending");
    Serial.println("  Current: Web interface available on Ethernet only");
}

void setupModbus() {
    // Begin the modbus server with the configured port
    modbusServer.begin(config.modbusPort);
    
    Serial.print("Starting Modbus server on port: ");
    Serial.println(config.modbusPort);
    
    // Initialize all ModbusTCPServer instances
    for (int i = 0; i < MAX_MODBUS_CLIENTS; i++) {
        modbusClients[i].connected = false;
        
        // Initialize each ModbusTCPServer with the same unit ID (1)
        if (!modbusClients[i].server.begin(1)) {
            Serial.print("Failed to start Modbus TCP Server for client ");
            Serial.println(i);
            continue;
        }
        
        // Configure Modbus registers for each client server
        modbusClients[i].server.configureHoldingRegisters(0x00, 16);  // 16 holding registers
        modbusClients[i].server.configureInputRegisters(0x00, 32);    // 32 input registers
        modbusClients[i].server.configureCoils(0x00, 128);           // 128 coils (0-127)
        modbusClients[i].server.configureDiscreteInputs(0x00, 16);   // 16 discrete inputs
    }
    
    Serial.println("Modbus TCP Servers started");
}

void setupWebServer() {
    // Start HTTP server on Ethernet interface
    webEthServer.begin();
    Serial.println("Web server started:");
    Serial.println("  - Ethernet interface on port 80");
    Serial.println("  - USB interface: Implementation planned");
}

void handleSimpleHTTP() {
    EthernetClient client = webEthServer.available();
    if (client) {
        String request = "";
        String method = "";
        String path = "";
        String body = "";
        bool inBody = false;
        int contentLength = 0;
        
        // Read the HTTP request
        while (client.connected() && client.available()) {
            String line = client.readStringUntil('\n');
            line.trim();
            
            if (line.length() == 0) {
                inBody = true;
                break; // End of headers
            }
            
            if (request.length() == 0) {
                // First line: method and path
                int firstSpace = line.indexOf(' ');
                int secondSpace = line.indexOf(' ', firstSpace + 1);
                if (firstSpace > 0 && secondSpace > firstSpace) {
                    method = line.substring(0, firstSpace);
                    path = line.substring(firstSpace + 1, secondSpace);
                }
                request = line;
            }
            
            // Check for Content-Length header
            if (line.startsWith("Content-Length:")) {
                contentLength = line.substring(15).toInt();
            }
        }
        
        // Read body if present
        if (inBody && contentLength > 0) {
            char bodyBuffer[contentLength + 1];
            int bytesRead = client.readBytes(bodyBuffer, contentLength);
            bodyBuffer[bytesRead] = '\0';
            body = String(bodyBuffer);
        }
        
        // Route the request to existing handlers
        routeRequest(client, method, path, body);
        
        client.stop();
    }
}

void routeRequest(EthernetClient& client, String method, String path, String body) {
    // Simple routing to existing handler functions
    if (method == "GET") {
        if (path == "/" || path == "/index.html") {
            sendFile(client, "/index.html", "text/html");
        } else if (path == "/styles.css") {
            sendFile(client, "/styles.css", "text/css");
        } else if (path == "/script.js") {
            sendFile(client, "/script.js", "application/javascript");
        } else if (path == "/favicon.ico") {
            sendFile(client, "/favicon.ico", "image/x-icon");
        } else if (path == "/logo.png") {
            sendFile(client, "/logo.png", "image/png");
        } else if (path == "/config") {
            sendJSONConfig(client);
        } else if (path == "/iostatus") {
            sendJSONIOStatus(client);
        } else if (path == "/ioconfig") {
            sendJSONIOConfig(client);
        } else if (path == "/sensors/config") {
            sendJSONSensorConfig(client);
        } else {
            send404(client);
        }
    } else if (method == "POST") {
        if (path == "/config") {
            handlePOSTConfig(client, body);
        } else if (path == "/setoutput") {
            handlePOSTSetOutput(client, body);
        } else if (path == "/ioconfig") {
            handlePOSTIOConfig(client, body);
        } else if (path == "/reset-latches") {
            handlePOSTResetLatches(client);
        } else if (path == "/reset-latch") {
            handlePOSTResetSingleLatch(client, body);
        } else if (path == "/sensors/config") {
            handlePOSTSensorConfig(client, body);
        } else if (path == "/api/sensor/command") {
            handlePOSTSensorCommand(client, body);
        } else {
            send404(client);
        }
    } else {
        send404(client);
    }
}

void sendFile(EthernetClient& client, String filename, String contentType) {
    if (LittleFS.exists(filename)) {
        File file = LittleFS.open(filename, "r");
        if (file) {
            client.println("HTTP/1.1 200 OK");
            client.print("Content-Type: ");
            client.println(contentType);
            client.println("Connection: close");
            client.print("Content-Length: ");
            client.println(file.size());
            client.println();
            
            while (file.available()) {
                client.write(file.read());
            }
            file.close();
            return;
        }
    }
    send404(client);
}

void send404(EthernetClient& client) {
    client.println("HTTP/1.1 404 Not Found");
    client.println("Content-Type: text/plain");
    client.println("Connection: close");
    client.println();
    client.println("404 Not Found");
}

void sendJSON(EthernetClient& client, String json) {
    client.println("HTTP/1.1 200 OK");
    client.println("Content-Type: application/json");
    client.println("Connection: close");
    client.print("Content-Length: ");
    client.println(json.length());
    client.println();
    client.print(json);
}

// These functions extract the JSON creation logic from the original handlers
void sendJSONConfig(EthernetClient& client) {
    StaticJsonDocument<2048> doc;
    doc["version"] = config.version;
    doc["dhcpEnabled"] = config.dhcpEnabled;
    doc["modbusPort"] = config.modbusPort;
    
    JsonArray ipArray = doc.createNestedArray("ip");
    for (int i = 0; i < 4; i++) {
        ipArray.add(config.ip[i]);
    }
    
    JsonArray gatewayArray = doc.createNestedArray("gateway");
    for (int i = 0; i < 4; i++) {
        gatewayArray.add(config.gateway[i]);
    }
    
    JsonArray subnetArray = doc.createNestedArray("subnet");
    for (int i = 0; i < 4; i++) {
        subnetArray.add(config.subnet[i]);
    }
    
    doc["hostname"] = config.hostname;
    
    JsonArray diPullupArray = doc.createNestedArray("diPullup");
    for (int i = 0; i < 8; i++) {
        diPullupArray.add(config.diPullup[i]);
    }
    
    JsonArray diInvertArray = doc.createNestedArray("diInvert");
    for (int i = 0; i < 8; i++) {
        diInvertArray.add(config.diInvert[i]);
    }
    
    JsonArray diLatchArray = doc.createNestedArray("diLatch");
    for (int i = 0; i < 8; i++) {
        diLatchArray.add(config.diLatch[i]);
    }
    
    JsonArray doInvertArray = doc.createNestedArray("doInvert");
    for (int i = 0; i < 8; i++) {
        doInvertArray.add(config.doInvert[i]);
    }
    
    JsonArray doInitialStateArray = doc.createNestedArray("doInitialState");
    for (int i = 0; i < 8; i++) {
        doInitialStateArray.add(config.doInitialState[i]);
    }
    
    String jsonBuffer;
    serializeJson(doc, jsonBuffer);
    sendJSON(client, jsonBuffer);
}

void sendJSONIOStatus(EthernetClient& client) {
    StaticJsonDocument<1024> doc;
    
    JsonArray dInArray = doc.createNestedArray("dIn");
    for (int i = 0; i < 8; i++) {
        dInArray.add(ioStatus.dIn[i]);
    }
    
    JsonArray dOutArray = doc.createNestedArray("dOut");
    for (int i = 0; i < 8; i++) {
        dOutArray.add(ioStatus.dOut[i]);
    }
    
    JsonArray aInArray = doc.createNestedArray("aIn");
    for (int i = 0; i < 3; i++) {
        aInArray.add(ioStatus.aIn[i]);
    }
    
    JsonArray dInLatchedArray = doc.createNestedArray("dInLatched");
    for (int i = 0; i < 8; i++) {
        dInLatchedArray.add(ioStatus.dInLatched[i]);
    }
    
    String jsonBuffer;
    serializeJson(doc, jsonBuffer);
    sendJSON(client, jsonBuffer);
}

void sendJSONIOConfig(EthernetClient& client) {
    StaticJsonDocument<1024> doc;
    
    JsonArray diPullupArray = doc.createNestedArray("diPullup");
    for (int i = 0; i < 8; i++) {
        diPullupArray.add(config.diPullup[i]);
    }
    
    JsonArray diInvertArray = doc.createNestedArray("diInvert");
    for (int i = 0; i < 8; i++) {
        diInvertArray.add(config.diInvert[i]);
    }
    
    JsonArray diLatchArray = doc.createNestedArray("diLatch");
    for (int i = 0; i < 8; i++) {
        diLatchArray.add(config.diLatch[i]);
    }
    
    JsonArray doInvertArray = doc.createNestedArray("doInvert");
    for (int i = 0; i < 8; i++) {
        doInvertArray.add(config.doInvert[i]);
    }
    
    JsonArray doInitialStateArray = doc.createNestedArray("doInitialState");
    for (int i = 0; i < 8; i++) {
        doInitialStateArray.add(config.doInitialState[i]);
    }
    
    String response;
    serializeJson(doc, response);
    sendJSON(client, response);
}

void sendJSONSensorConfig(EthernetClient& client) {
    StaticJsonDocument<2048> doc;
    JsonArray sensorsArray = doc.createNestedArray("sensors");
    
    for (int i = 0; i < numConfiguredSensors; i++) {
        JsonObject sensor = sensorsArray.createNestedObject();
        sensor["enabled"] = configuredSensors[i].enabled;
        sensor["name"] = configuredSensors[i].name;
        sensor["type"] = configuredSensors[i].type;
        sensor["i2cAddress"] = configuredSensors[i].i2cAddress;
        sensor["response"] = configuredSensors[i].response;
    }
    
    String response;
    serializeJson(doc, response);
    sendJSON(client, response);
}

// POST handler functions
void handlePOSTConfig(EthernetClient& client, String body) {
    StaticJsonDocument<2048> doc;
    DeserializationError error = deserializeJson(doc, body);
    
    if (error) {
        client.println("HTTP/1.1 400 Bad Request");
        client.println("Connection: close");
        client.println();
        return;
    }
    
    // Update configuration (same logic as original handleSetConfig)
    config.dhcpEnabled = doc["dhcpEnabled"] | config.dhcpEnabled;
    config.modbusPort = doc["modbusPort"] | config.modbusPort;
    
    if (doc.containsKey("ip")) {
        JsonArray ipArray = doc["ip"];
        for (int i = 0; i < 4 && i < ipArray.size(); i++) {
            config.ip[i] = ipArray[i];
        }
    }
    
    saveConfig();
    
    client.println("HTTP/1.1 200 OK");
    client.println("Content-Type: application/json");
    client.println("Connection: close");
    client.println();
    client.println("{\"success\":true}");
}

void handlePOSTSetOutput(EthernetClient& client, String body) {
    // Simple query parameter parsing for output=X&state=Y
    int outputIndex = -1;
    int state = -1;
    
    int outputPos = body.indexOf("output=");
    int statePos = body.indexOf("state=");
    
    if (outputPos >= 0) {
        outputIndex = body.substring(outputPos + 7, body.indexOf('&', outputPos)).toInt();
    }
    if (statePos >= 0) {
        state = body.substring(statePos + 6).toInt();
    }
    
    if (outputIndex >= 0 && outputIndex < 8 && (state == 0 || state == 1)) {
        ioStatus.dOut[outputIndex] = state;
        digitalWrite(DIGITAL_OUTPUTS[outputIndex], config.doInvert[outputIndex] ? !state : state);
        
        client.println("HTTP/1.1 200 OK");
        client.println("Content-Type: application/json");
        client.println("Connection: close");
        client.println();
        client.println("{\"success\":true}");
    } else {
        client.println("HTTP/1.1 400 Bad Request");
        client.println("Connection: close");
        client.println();
    }
}

void handlePOSTIOConfig(EthernetClient& client, String body) {
    StaticJsonDocument<1024> doc;
    DeserializationError error = deserializeJson(doc, body);
    
    if (!error) {
        // Update IO configuration
        if (doc.containsKey("diPullup")) {
            JsonArray array = doc["diPullup"];
            for (int i = 0; i < 8 && i < array.size(); i++) {
                config.diPullup[i] = array[i];
            }
        }
        saveConfig();
    }
    
    client.println("HTTP/1.1 200 OK");
    client.println("Content-Type: application/json");
    client.println("Connection: close");
    client.println();
    client.println("{\"success\":true}");
}

void handlePOSTResetLatches(EthernetClient& client) {
    for (int i = 0; i < 8; i++) {
        if (config.diLatch[i]) {
            ioStatus.dInLatched[i] = false;
        }
    }
    
    client.println("HTTP/1.1 200 OK");
    client.println("Content-Type: application/json");
    client.println("Connection: close");
    client.println();
    client.println("{\"success\":true}");
}

void handlePOSTResetSingleLatch(EthernetClient& client, String body) {
    StaticJsonDocument<256> doc;
    if (!deserializeJson(doc, body) && doc.containsKey("input")) {
        int input = doc["input"];
        if (input >= 0 && input < 8 && config.diLatch[input]) {
            ioStatus.dInLatched[input] = false;
        }
    }
    
    client.println("HTTP/1.1 200 OK");
    client.println("Content-Type: application/json");
    client.println("Connection: close");
    client.println();
    client.println("{\"success\":true}");
}

void handlePOSTSensorConfig(EthernetClient& client, String body) {
    StaticJsonDocument<2048> doc;
    if (!deserializeJson(doc, body)) {
        // Save sensor configuration logic here
        saveSensorConfig();
    }
    
    client.println("HTTP/1.1 200 OK");
    client.println("Content-Type: application/json");
    client.println("Connection: close");
    client.println();
    client.println("{\"success\":true}");
}

void handlePOSTSensorCommand(EthernetClient& client, String body) {
    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, body);
    
    if (error) {
        client.println("HTTP/1.1 400 Bad Request");
        client.println("Content-Type: application/json");
        client.println("Connection: close");
        client.println();
        client.println("{\"success\":false,\"message\":\"Invalid JSON\"}");
        return;
    }
    
    String protocol = doc["protocol"] | "";
    String pin = doc["pin"] | "";
    String command = doc["command"] | "";
    String i2cAddress = doc["i2cAddress"] | "";
    
    String response = "Command executed";
    bool success = true;
    
    // Route command based on protocol
    if (protocol == "digital") {
        // Handle digital I/O commands
        if (command == "read") {
            if (pin.startsWith("DI")) {
                int pinNum = pin.substring(2).toInt();
                if (pinNum >= 0 && pinNum < 8) {
                    bool state = digitalRead(DIGITAL_INPUTS[pinNum]);
                    response = pin + " = " + (state ? "HIGH" : "LOW");
                } else {
                    success = false;
                    response = "Error: Invalid pin number";
                }
            } else if (pin.startsWith("DO")) {
                int pinNum = pin.substring(2).toInt();
                if (pinNum >= 0 && pinNum < 8) {
                    bool state = ioStatus.dOut[pinNum];
                    response = pin + " = " + (state ? "HIGH" : "LOW");
                } else {
                    success = false;
                    response = "Error: Invalid pin number";
                }
            }
        } else if (command.startsWith("write ")) {
            String value = command.substring(6);
            if (pin.startsWith("DO")) {
                int pinNum = pin.substring(2).toInt();
                if (pinNum >= 0 && pinNum < 8) {
                    bool state = (value == "1" || value.equalsIgnoreCase("HIGH"));
                    ioStatus.dOut[pinNum] = state;
                    digitalWrite(DIGITAL_OUTPUTS[pinNum], config.doInvert[pinNum] ? !state : state);
                    response = pin + " set to " + (state ? "HIGH" : "LOW");
                } else {
                    success = false;
                    response = "Error: Invalid pin number";
                }
            } else {
                success = false;
                response = "Error: Cannot write to input pin";
            }
        } else {
            success = false;
            response = "Error: Unknown digital command";
        }
    } else if (protocol == "analog") {
        // Handle analog commands
        if (command == "read") {
            if (pin.startsWith("AI")) {
                int pinNum = pin.substring(2).toInt();
                if (pinNum >= 0 && pinNum < 3) {
                    uint32_t rawValue = analogRead(ANALOG_INPUTS[pinNum]);
                    uint16_t millivolts = (rawValue * 3300UL) / 4095UL;
                    response = pin + " = " + String(millivolts) + " mV";
                } else {
                    success = false;
                    response = "Error: Invalid analog pin number";
                }
            }
        } else {
            success = false;
            response = "Error: Unknown analog command";
        }
    } else if (protocol == "i2c") {
        // Handle I2C commands
        if (command == "scan") {
            response = "I2C Device Scan:\\n";
            bool foundDevices = false;
            for (int addr = 1; addr < 127; addr++) {
                Wire.beginTransmission(addr);
                if (Wire.endTransmission() == 0) {
                    response += "Found device at 0x" + String(addr, HEX) + "\\n";
                    foundDevices = true;
                }
            }
            if (!foundDevices) {
                response += "No I2C devices found";
            }
        } else if (command == "probe") {
            int addr = i2cAddress.startsWith("0x") ? strtol(i2cAddress.c_str(), NULL, 16) : i2cAddress.toInt();
            Wire.beginTransmission(addr);
            if (Wire.endTransmission() == 0) {
                response = "Device at " + i2cAddress + " is present";
            } else {
                response = "No device found at " + i2cAddress;
            }
        } else {
            success = false;
            response = "Error: I2C command not implemented";
        }
    } else if (protocol == "system") {
        // Handle system commands
        if (command == "status") {
            response = "System Status:\\n";
            response += "CPU: RP2040 @ 133MHz\\n";
            response += "RAM: 256KB\\n";
            response += "Flash: 2MB\\n";
            response += "Uptime: " + String(millis() / 1000) + " seconds\\n";
            response += "Free Heap: " + String(rp2040.getFreeHeap()) + " bytes";
        } else if (command == "sensors") {
            response = "Configured Sensors:\\n";
            for (int i = 0; i < numConfiguredSensors; i++) {
                response += String(i) + ": " + String(configuredSensors[i].name) + 
                           " (" + String(configuredSensors[i].type) + ") - " + 
                           (configuredSensors[i].enabled ? "Enabled" : "Disabled") + "\\n";
            }
            if (numConfiguredSensors == 0) {
                response += "No sensors configured";
            }
        } else {
            success = false;
            response = "Error: Unknown system command";
        }
    } else if (protocol == "network") {
        // Handle network commands
        if (command == "status") {
            response = "Network Status:\\n";
            IPAddress ip = Ethernet.localIP();
            response += "IP: " + ip.toString() + "\\n";
            response += "DHCP: " + String(config.dhcpEnabled ? "Enabled" : "Disabled") + "\\n";
            response += "Modbus Port: " + String(config.modbusPort) + "\\n";
            response += "Connected Clients: " + String(connectedClients);
        } else if (command == "clients") {
            response = "Modbus Clients:\\n";
            response += "Connected: " + String(connectedClients) + "\\n";
            for (int i = 0; i < MAX_MODBUS_CLIENTS; i++) {
                if (modbusClients[i].connected) {
                    response += "Slot " + String(i) + ": " + modbusClients[i].clientIP.toString() + "\\n";
                }
            }
        } else {
            success = false;
            response = "Error: Unknown network command";
        }
    } else {
        success = false;
        response = "Error: Unknown protocol";
    }
    
    // Send JSON response
    StaticJsonDocument<1024> responseDoc;
    responseDoc["success"] = success;
    responseDoc["message"] = response;
    
    String jsonResponse;
    serializeJson(responseDoc, jsonResponse);
    
    client.println("HTTP/1.1 200 OK");
    client.println("Content-Type: application/json");
    client.println("Connection: close");
    client.print("Content-Length: ");
    client.println(jsonResponse.length());
    client.println();
    client.print(jsonResponse);
}

void updateIOpins() {
    // Update Modbus registers with current IO state
    
    // Update digital inputs - account for invert configuration and latching behavior
    for (int i = 0; i < 8; i++) {
        uint16_t rawValue = digitalRead(DIGITAL_INPUTS[i]);
        
        // Apply inversion if configured
        if (config.diInvert[i]) {
            rawValue = !rawValue;
        }
        
        // Store the raw input state
        ioStatus.dInRaw[i] = rawValue;
        
        // Check if latching is enabled for this input
        if (config.diLatch[i]) {
            // If input is active (HIGH) and not already latched, set the latch
            if (rawValue && !ioStatus.dInLatched[i]) {
                ioStatus.dInLatched[i] = true;
                ioStatus.dIn[i] = true; // Set the input state to ON
            }
            // If input is latched, keep it ON regardless of the current physical state
            else if (ioStatus.dInLatched[i]) {
                ioStatus.dIn[i] = true;
            }
            // Otherwise, use the raw value
            else {
                ioStatus.dIn[i] = rawValue;
            }
        } 
        // If latching is not enabled, just use the raw value
        else {
            ioStatus.dIn[i] = rawValue;
            ioStatus.dInLatched[i] = false; // Ensure latch flag is cleared
        }
    }
    
    // Update digital outputs - account for inversion
    for (int i = 0; i < 8; i++) {
        // Check the coil state for each client and update if any client changed an output
        bool logicalState = ioStatus.dOut[i];
        bool stateChanged = false;
        
        // First detect if any client has changed the state
        for (int j = 0; j < MAX_MODBUS_CLIENTS; j++) {
            if (modbusClients[j].connected) {
                bool clientCoilState = modbusClients[j].server.coilRead(i);
                if (clientCoilState != logicalState) {
                    // A client has changed this output's state, update our logical state
                    logicalState = clientCoilState;
                    ioStatus.dOut[i] = logicalState;
                    stateChanged = true;
                    break;  // We found a change, no need to check other clients
                }
            }
        }
        
        // If state changed, synchronize all clients to the new state
        if (stateChanged) {
            Serial.printf("Output %d state changed to %d, synchronizing all clients\n", i, logicalState);
            for (int j = 0; j < MAX_MODBUS_CLIENTS; j++) {
                if (modbusClients[j].connected) {
                    modbusClients[j].server.coilWrite(i, logicalState);
                }
            }
        }
        
        // Apply inversion only to the physical pin, not to the logical state
        bool physicalState = logicalState;
        if (config.doInvert[i]) {
            physicalState = !logicalState;
        }
        
        // Set the physical pin state
        digitalWrite(DIGITAL_OUTPUTS[i], physicalState);
    }
    
    // Update analog inputs, using millivolts format
    for (int i = 0; i < 3; i++) {
        uint32_t rawValue = analogRead(ANALOG_INPUTS[i]);
        uint16_t valueToWrite = (rawValue * 3300UL) / 4095UL;
        ioStatus.aIn[i] = valueToWrite;
    }
    
    // I2C Sensor Reading - Dynamic sensor configuration
    static uint32_t sensorReadTime = 0;
    if (millis() - sensorReadTime > 1000) { // Update every 1 second
        // Initialize sensor values - only temperature is used by EZO_RTD if configured
        ioStatus.temperature = 0.0;  // Only used by EZO_RTD sensors for pH compensation
        
        // Read from configured sensors
        for (int i = 0; i < numConfiguredSensors; i++) {
            if (configuredSensors[i].enabled) {
                Serial.printf("Reading sensor %s (%s) at I2C address 0x%02X\n", 
                    configuredSensors[i].name,
                    configuredSensors[i].type,
                    configuredSensors[i].i2cAddress
                );
                
                // Add actual sensor reading logic here based on sensor type
                if (strncmp(configuredSensors[i].type, "EZO_", 4) == 0) {
                    // Parse EZO sensor response from the response field
                    if (strlen(configuredSensors[i].response) > 0 && strcmp(configuredSensors[i].response, "ERROR") != 0) {
                        float value = atof(configuredSensors[i].response);
                        
                        // Map EZO sensor types to appropriate ioStatus fields
                        if (strcmp(configuredSensors[i].type, "EZO_PH") == 0) {
                            // For pH sensors, we can store in temperature field temporarily or add a pH field later
                            Serial.printf("EZO_PH reading: pH=%.2f\n", value);
                        } else if (strcmp(configuredSensors[i].type, "EZO_DO") == 0) {
                            Serial.printf("EZO_DO reading: DO=%.2f mg/L\n", value);
                        } else if (strcmp(configuredSensors[i].type, "EZO_EC") == 0) {
                            Serial.printf("EZO_EC reading: EC=%.2f μS/cm\n", value);
                        } else if (strcmp(configuredSensors[i].type, "EZO_RTD") == 0) {
                            ioStatus.temperature = value;
                            Serial.printf("EZO_RTD reading: Temperature=%.2f°C\n", value);
                        } else {
                            Serial.printf("EZO sensor %s reading: %.2f\n", configuredSensors[i].type, value);
                        }
                    } else if (strcmp(configuredSensors[i].response, "ERROR") == 0) {
                        Serial.printf("EZO sensor %s has error response\n", configuredSensors[i].type);
                    }
                }
                // TODO: Add support for other sensor types here
                // Example for BME280:
                // else if (strcmp(configuredSensors[i].type, "BME280") == 0) {
                //     // Add BME280 library initialization and reading code
                // }
            }
        }
        
        // No built-in sensors - all sensor data comes from configured I2C sensors
        if (numConfiguredSensors == 0) {
            Serial.println("No I2C sensors configured");
        }
        
        // Print IP address every 30 seconds for easy reference
        static uint32_t ipPrintTime = 0;
        if (millis() - ipPrintTime > 30000) {
            Serial.println("========================================");
            Serial.print("Device IP Address: ");
            Serial.println(Ethernet.localIP());
            Serial.println("========================================");
            ipPrintTime = millis();
        }
        
        sensorReadTime = millis();
    }
}

void updateIOForClient(int clientIndex) {
    // Update Modbus registers with current IO state, actual pin states measured in updateIOpins()
    
    // Update digital inputs
    for (int i = 0; i < 8; i++) {
        modbusClients[clientIndex].server.discreteInputWrite(i, ioStatus.dIn[i]);
    }
        
    // Update analog inputs
    for (int i = 0; i < 3; i++) {
        modbusClients[clientIndex].server.inputRegisterWrite(i, ioStatus.aIn[i]);
    }
    
    // I2C Sensor Data Modbus Mapping - Convert float values to 16-bit integers
    // PLACEHOLDER SENSORS - COMMENTED OUT (only enable when simulation is on or real sensors added)
    // uint16_t temp_x_100 = (uint16_t)(ioStatus.temperature * 100);
    // uint16_t hum_x_100 = (uint16_t)(ioStatus.humidity * 100);

    // modbusClients[clientIndex].server.inputRegisterWrite(3, temp_x_100); // Temperature
    // modbusClients[clientIndex].server.inputRegisterWrite(4, hum_x_100); // Humidity
    
    // Check coils 100-107 for latch reset commands
    for (int i = 0; i < 8; i++) {
        if (modbusClients[clientIndex].server.coilRead(100 + i)) {
            // If coil is set to 1, reset the corresponding latch
            if (config.diLatch[i] && ioStatus.dInLatched[i]) {
                ioStatus.dInLatched[i] = false;
                // Update the input state based on the raw input state
                ioStatus.dIn[i] = ioStatus.dInRaw[i];
                Serial.printf("Reset latch for digital input %d via Modbus coil %d\n", i, 100 + i);
            }
            // Reset the coil back to 0 after processing
            modbusClients[clientIndex].server.coilWrite(100 + i, false);
        }
    }
}

// HTTP Handler - Currently Ethernet only, USB interface planned
void handleDualHTTP() {
    // Handle Ethernet HTTP requests
    handleSimpleHTTP();
    
    // USB RNDIS HTTP implementation: To be added
    // This will handle USB client connections when implemented
}