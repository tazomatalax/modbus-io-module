#include "sys_init.h"
#include <Wire.h>

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
 * - Input Registers (FC4): 0-2 - Analog input values
 * - Input Registers (FC4): 3 - Temperature (scaled x100, e.g., 2550 = 25.50°C)
 * - Input Registers (FC4): 4 - Humidity (scaled x100, e.g., 6050 = 60.50%)
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

    Serial.println("Setting pin modes...");
    delay(500);
    // Set pin modes
    setPinModes();
    
    Serial.println("Setup network and services...");
    // Setup network and services
    setupEthernet();
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
    // Check for new client connections
    WiFiClient newClient = modbusServer.accept();
    
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
    webServer.handleClient();

    // Watchdog timer reset
    rp2040.wdt_reset();
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
    // Initialize SPI for Ethernet
    SPI.setRX(PIN_ETH_MISO);
    SPI.setCS(PIN_ETH_CS);
    SPI.setSCK(PIN_ETH_SCK);
    SPI.setTX(PIN_ETH_MOSI);
    SPI.begin();
    
    // Set hostname first
    eth.hostname(config.hostname);
    eth.setSPISpeed(30000000);
    lwipPollingPeriod(3);
    
    bool connected = false;
    
    if (config.dhcpEnabled) {
        // Try DHCP first
        Serial.println("Attempting to use DHCP...");
        if (eth.begin()) {
            // Wait for DHCP to complete
            Serial.println("DHCP process started, waiting for IP assignment...");
            int dhcpTimeout = 0;
            while (dhcpTimeout < 15) {  // Wait up to 15 seconds for DHCP
                IPAddress ip = eth.localIP();
                if (ip[0] != 0 || ip[1] != 0 || ip[2] != 0 || ip[3] != 0) {
                    connected = true;
                    Serial.println("DHCP configuration successful");
                    break;
                }
                delay(1000);
                Serial.print(".");
                dhcpTimeout++;
            }
            
            if (!connected) {
                Serial.println("\nDHCP timeout, falling back to static IP");
            }
        } else {
            Serial.println("Failed to start DHCP process, falling back to static IP");
        }
    }
    
    // If DHCP failed or not enabled, use static IP
    if (!connected) {
        Serial.println("Using static IP configuration");
        IPAddress ip(config.ip[0], config.ip[1], config.ip[2], config.ip[3]);
        IPAddress gateway(config.gateway[0], config.gateway[1], config.gateway[2], config.gateway[3]);
        IPAddress subnet(config.subnet[0], config.subnet[1], config.subnet[2], config.subnet[3]);
        
        // Stop current connection attempt if any
        eth.end();
        delay(500);  // Short delay to ensure clean restart
        
        eth.config(ip, gateway, subnet);
        if (eth.begin()) {
            delay(1000);  // Give it time to initialize with static IP
            IPAddress currentIP = eth.localIP();
            if (currentIP[0] != 0 || currentIP[1] != 0 || currentIP[2] != 0 || currentIP[3] != 0) {
                connected = true;
                Serial.println("Static IP configuration successful");
            } else {
                Serial.println("Static IP configuration failed - IP not assigned");
            }
        } else {
            Serial.println("Failed to start Ethernet with static IP");
        }
    }
    
    Serial.print("Hostname: ");
    Serial.println(config.hostname);
    Serial.print("IP Address: ");
    Serial.println(eth.localIP());
    
    if (!connected || eth.status() != WL_CONNECTED) {
        Serial.println("WARNING: Network connection not established");
    }
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
    // Add a small delay before starting the web server
    // This helps ensure the network stack is fully initialized
    delay(50);
    
    webServer.on("/", HTTP_GET, handleRoot);
    webServer.on("/index.html", HTTP_GET, handleRoot);
    webServer.on("/styles.css", HTTP_GET, handleCSS);
    webServer.on("/script.js", HTTP_GET, handleJS);
    webServer.on("/favicon.ico", HTTP_GET, handleFavicon);
    webServer.on("/logo.png", HTTP_GET, handleLogo);
    webServer.on("/config", HTTP_GET, handleGetConfig);
    webServer.on("/config", HTTP_POST, handleSetConfig);
    webServer.on("/iostatus", HTTP_GET, handleGetIOStatus);
    webServer.on("/setoutput", HTTP_POST, handleSetOutput);
    webServer.on("/ioconfig", HTTP_GET, handleGetIOConfig);
    webServer.on("/ioconfig", HTTP_POST, handleSetIOConfig);
    webServer.on("/reset-latches", HTTP_POST, handleResetLatches);
    webServer.on("/reset-latch", HTTP_POST, handleResetSingleLatch);
    webServer.begin();
    
    Serial.println("Web server started");
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
    
    // I2C Sensor Reading - Placeholder values for testing and integration
    // Replace with actual sensor readings when integrating I2C sensors
    static uint32_t sensorReadTime = 0;
    if (millis() - sensorReadTime > 1000) { // Update every 1 second
        // Placeholder sensor values - simulate realistic sensor readings
        ioStatus.temperature = 23.45 + sin(millis() / 10000.0) * 2.0; // 21.45-25.45°C range
        ioStatus.humidity = 55.20 + cos(millis() / 8000.0) * 5.0;     // 50.20-60.20% range
        ioStatus.pressure = 1013.25 + sin(millis() / 15000.0) * 10.0; // 1003.25-1023.25 hPa range
        sensorReadTime = millis();
    }
    
    // Example for BME280 sensor integration (uncomment when adding real sensor):
    // ioStatus.temperature = bme.readTemperature();    // Temperature in Celsius
    // ioStatus.humidity = bme.readHumidity();          // Humidity in %
    // ioStatus.pressure = bme.readPressure() / 100.0F; // Pressure in hPa
    // 
    // Add error checking as needed:
    // if (isnan(ioStatus.temperature) || isnan(ioStatus.humidity)) {
    //     Serial.println("Failed to read from BME280 sensor!");
    // }
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
    uint16_t temp_x_100 = (uint16_t)(ioStatus.temperature * 100);
    uint16_t hum_x_100 = (uint16_t)(ioStatus.humidity * 100);

    modbusClients[clientIndex].server.inputRegisterWrite(3, temp_x_100); // Temperature
    modbusClients[clientIndex].server.inputRegisterWrite(4, hum_x_100); // Humidity
    
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

void handleRoot() {
    if (LittleFS.exists("/index.html")) {
        File file = LittleFS.open("/index.html", "r");
        webServer.streamFile(file, "text/html");
        file.close();
    } else {
        webServer.send(404, "text/plain", "File not found");
    }
}

void handleCSS() {
    if (LittleFS.exists("/styles.css")) {
        File file = LittleFS.open("/styles.css", "r");
        webServer.streamFile(file, "text/css");
        file.close();
    } else {
        webServer.send(404, "text/plain", "File not found");
    }
}

void handleJS() {
    if (LittleFS.exists("/script.js")) {
        File file = LittleFS.open("/script.js", "r");
        webServer.streamFile(file, "application/javascript");
        file.close();
    } else {
        webServer.send(404, "text/plain", "File not found");
    }
}

void handleFavicon() {
    if (LittleFS.exists("/favicon.ico")) {
        File file = LittleFS.open("/favicon.ico", "r");
        webServer.streamFile(file, "image/x-icon");
        file.close();
    } else {
        webServer.send(404, "text/plain", "File not found");
    }
}

void handleLogo() {
    if (LittleFS.exists("/logo.png")) {
        File file = LittleFS.open("/logo.png", "r");
        webServer.streamFile(file, "image/png");
        file.close();
    } else {
        webServer.send(404, "text/plain", "File not found");
    }
}

void handleGetConfig() {
    // Add a brief delay to ensure all internal states are updated
    // This helps with the first request after server initialization
    delay(5);
    
    char jsonBuffer[1024];  
    StaticJsonDocument<1024> doc;  

    // Add network configuration
    doc["dhcp"] = config.dhcpEnabled;
    
    // Format IP addresses as strings
    char ipStr[16], gwStr[16], subStr[16], currentIpStr[16];
    sprintf(ipStr, "%d.%d.%d.%d", config.ip[0], config.ip[1], config.ip[2], config.ip[3]);
    sprintf(gwStr, "%d.%d.%d.%d", config.gateway[0], config.gateway[1], config.gateway[2], config.gateway[3]);
    sprintf(subStr, "%d.%d.%d.%d", config.subnet[0], config.subnet[1], config.subnet[2], config.subnet[3]);
    
    doc["ip"] = ipStr;
    doc["gateway"] = gwStr;
    doc["subnet"] = subStr;
    doc["modbus_port"] = config.modbusPort;
    doc["hostname"] = config.hostname;
    
    // Always include the current IP address
    IPAddress localIP = eth.localIP();
    // Check if IP is valid (not 0.0.0.0)
    if (localIP[0] == 0 && localIP[1] == 0 && localIP[2] == 0 && localIP[3] == 0) {
        // IP is not set, use configured IP instead
        doc["current_ip"] = ipStr;
    } else {
        sprintf(currentIpStr, "%d.%d.%d.%d", localIP[0], localIP[1], localIP[2], localIP[3]);
        doc["current_ip"] = currentIpStr;
    }

    // Add Modbus client status
    doc["modbus_connected"] = (connectedClients > 0);
    doc["modbus_client_count"] = connectedClients;
    
    // Add detailed client information
    if (connectedClients > 0) {
        JsonArray clients = doc.createNestedArray("modbus_clients");
        
        for (int i = 0; i < MAX_MODBUS_CLIENTS; i++) {
            if (modbusClients[i].connected) {
                JsonObject client = clients.createNestedObject();
                
                // Add client IP address
                IPAddress clientIP = modbusClients[i].clientIP;
                char clientIPStr[16];
                sprintf(clientIPStr, "%d.%d.%d.%d", clientIP[0], clientIP[1], clientIP[2], clientIP[3]);
                client["ip"] = clientIPStr;
                
                // Add client slot number
                client["slot"] = i;
                
                // Add connection duration in seconds
                unsigned long duration = (millis() - modbusClients[i].connectionTime) / 1000;
                client["connected_for"] = duration;
            }
        }
    }

    // Digital inputs - account for inversion
    JsonArray di = doc.createNestedArray("di");
    for (int i = 0; i < 8; i++) {
        di.add(ioStatus.dIn[i]);
    }

    // Digital outputs - account for inversion
    JsonArray do_ = doc.createNestedArray("do");
    for (int i = 0; i < 8; i++) {
        do_.add(ioStatus.dOut[i]);
    }

    // Add analog input values - always in millivolts
    JsonArray ai = doc.createNestedArray("ai");
    for (int i = 0; i < sizeof(ANALOG_INPUTS)/sizeof(ANALOG_INPUTS[0]); i++) {
        ai.add(ioStatus.aIn[i]);
    }

    // I2C Sensor Data Template - Uncomment when adding I2C sensors
    // Add sensor readings to config response:
    // doc["temperature"] = ioStatus.temperature;    // Temperature in Celsius
    // doc["humidity"] = ioStatus.humidity;          // Humidity in %
    // doc["pressure"] = ioStatus.pressure;          // Pressure in hPa

    serializeJson(doc, jsonBuffer);
    webServer.send(200, "application/json", jsonBuffer);
}

void handleSetConfig() {
    Serial.println("Received config update request");
    
    if (!webServer.hasArg("plain")) {
        Serial.println("No data received");
        webServer.send(400, "application/json", "{\"error\":\"No data received\"}");
        return;
    }
    
    String data = webServer.arg("plain");
    Serial.print("Received data length: ");
    Serial.println(data.length());

    // Debug: Print the raw JSON data
    Serial.println("Raw JSON data received:");
    Serial.println(data);
    
    // Prevent buffer overflow
    if (data.length() > 256) {
        Serial.println("Data too long");
        webServer.send(400, "application/json", "{\"error\":\"Request too large\"}");
        return;
    }

    // Allocate JSON document based on input size
    const size_t capacity = JSON_OBJECT_SIZE(6) + 150;  
    StaticJsonDocument<384> doc;  
    
    Serial.print("JSON capacity: ");
    Serial.println(capacity);

    DeserializationError error = deserializeJson(doc, data);
    
    if (error) {
        Serial.print("JSON parse error: ");
        Serial.println(error.c_str());
        webServer.send(400, "application/json", "{\"error\":\"JSON parse error\"}");
        return;
    }

    Serial.println("JSON parsed successfully");

    // Process fields directly from JSON to save memory
    bool dhcpEnabled = doc["dhcp"] | config.dhcpEnabled;
    
    // Detailed debug for modbusPort field
    Serial.println("Checking for modbusPort in JSON data...");
    if (doc.containsKey("modbus_port")) {
        Serial.println("modbus_port field found!");
        Serial.print("Raw value: ");
        serializeJson(doc["modbus_port"], Serial);
        Serial.println();
        
        // Try to get as different types to debug type issues
        String portStr = doc["modbus_port"].as<String>();
        int portInt = doc["modbus_port"].as<int>();
        Serial.print("As String: ");
        Serial.println(portStr);
        Serial.print("As int: ");
        Serial.println(portInt);
        
        Serial.print("Final parsed modbus_port value (as uint16_t): ");
        Serial.println(doc["modbus_port"].as<uint16_t>());
    } else {
        Serial.println("modbus_port field NOT found in JSON!");
        Serial.print("Using existing value: ");
        Serial.println(config.modbusPort);
    }
    
    uint16_t modbusPort = doc["modbus_port"] | config.modbusPort;
    
    Serial.print("Received modbus_port value from web: ");
    Serial.println(modbusPort);
    
    // Validate port early
    if (modbusPort <= 0 || modbusPort > 65535) {
        webServer.send(400, "application/json", "{\"error\":\"Invalid port\"}");
        return;
    }

    // Process IP addresses
    uint8_t newIp[4], newGw[4], newSub[4];
    memcpy(newIp, config.ip, 4);
    memcpy(newGw, config.gateway, 4);
    memcpy(newSub, config.subnet, 4);

    const char* ipStr = doc["ip"] | "";
    if (*ipStr) {  
        if (sscanf(ipStr, "%hhu.%hhu.%hhu.%hhu", 
            &newIp[0], &newIp[1], &newIp[2], &newIp[3]) != 4) {
            webServer.send(400, "application/json", "{\"error\":\"Invalid IP\"}");
            return;
        }
    }

    const char* gwStr = doc["gateway"] | "";
    if (*gwStr) {
        if (sscanf(gwStr, "%hhu.%hhu.%hhu.%hhu",
            &newGw[0], &newGw[1], &newGw[2], &newGw[3]) != 4) {
            webServer.send(400, "application/json", "{\"error\":\"Invalid gateway\"}");
            return;
        }
    }

    const char* subStr = doc["subnet"] | "";
    if (*subStr) {
        if (sscanf(subStr, "%hhu.%hhu.%hhu.%hhu",
            &newSub[0], &newSub[1], &newSub[2], &newSub[3]) != 4) {
            webServer.send(400, "application/json", "{\"error\":\"Invalid subnet\"}");
            return;
        }
    }

    // Process hostname
    char newHostname[HOSTNAME_MAX_LENGTH];
    strncpy(newHostname, config.hostname, HOSTNAME_MAX_LENGTH - 1);
    newHostname[HOSTNAME_MAX_LENGTH - 1] = '\0';

    const char* hostname = doc["hostname"] | "";
    if (*hostname) {
        if (strlen(hostname) >= HOSTNAME_MAX_LENGTH) {
            webServer.send(400, "application/json", "{\"error\":\"Hostname too long\"}");
            return;
        }
        strncpy(newHostname, hostname, HOSTNAME_MAX_LENGTH - 1);
        newHostname[HOSTNAME_MAX_LENGTH - 1] = '\0';
    }

    Serial.println("All validation passed, updating config");

    // Apply the new configuration
    config.dhcpEnabled = dhcpEnabled;
    config.modbusPort = modbusPort;
    memcpy(config.ip, newIp, 4);
    memcpy(config.gateway, newGw, 4);
    memcpy(config.subnet, newSub, 4);
    strncpy(config.hostname, newHostname, HOSTNAME_MAX_LENGTH - 1);
    config.hostname[HOSTNAME_MAX_LENGTH - 1] = '\0';

    Serial.println("Saving to LittleFS");
    saveConfig();

    // Send minimal response
    char response[64];
    snprintf(response, sizeof(response), 
        "{\"success\":true,\"ip\":\"%d.%d.%d.%d\"}", 
        config.ip[0], config.ip[1], config.ip[2], config.ip[3]);
    
    webServer.send(200, "application/json", response);
    Serial.println("Config update complete, rebooting...");
    rp2040.reboot();
}

void handleSetOutput() {
    if (!webServer.hasArg("output") || !webServer.hasArg("state")) {
        webServer.send(400, "text/plain", "Missing output or state parameter");
        Serial.println("Missing output or state parameter");
        return;
    }

    int output = webServer.arg("output").toInt();
    int state = webServer.arg("state").toInt();

    Serial.printf("Received output %d, state %d from web interface\n", output, state);

    // Validate output number
    if (output < 0 || output >= sizeof(DIGITAL_OUTPUTS)/sizeof(DIGITAL_OUTPUTS[0])) {
        webServer.send(400, "text/plain", "Invalid output number");
        Serial.println("Invalid output number");
        return;
    }

    // Store the *logical* state (not inverted)
    ioStatus.dOut[output] = state;
    
    // Apply inversion if configured for the physical pin state
    bool physicalState = state;
    if (config.doInvert[output]) {
        physicalState = !state;
    }
    
    // Set the physical pin state
    digitalWrite(DIGITAL_OUTPUTS[output], physicalState);
    
    // Update coil state for ALL connected clients with the *logical* state
    for (int i = 0; i < MAX_MODBUS_CLIENTS; i++) {
        if (modbusClients[i].connected) {
            modbusClients[i].server.coilWrite(output, state);
            Serial.printf("Updated client %d with output %d state %d\n", i, output, state);
        }
    }

    webServer.send(200, "text/plain", "OK");
}

void handleGetIOStatus() {
    // Add a brief delay to ensure all internal states are updated
    // This helps with the first request after server initialization
    delay(5);
    
    char jsonBuffer[1024];  
    StaticJsonDocument<1024> doc;  

    // Add Modbus client status - now shows number of connected clients
    doc["modbus_connected"] = (connectedClients > 0);
    doc["modbus_client_count"] = connectedClients;
    
    // Add detailed client information
    if (connectedClients > 0) {
        JsonArray clients = doc.createNestedArray("modbus_clients");
        
        for (int i = 0; i < MAX_MODBUS_CLIENTS; i++) {
            if (modbusClients[i].connected) {
                JsonObject client = clients.createNestedObject();
                
                // Add client IP address
                IPAddress clientIP = modbusClients[i].clientIP;
                char clientIPStr[16];
                sprintf(clientIPStr, "%d.%d.%d.%d", clientIP[0], clientIP[1], clientIP[2], clientIP[3]);
                client["ip"] = clientIPStr;
                
                // Add client slot number
                client["slot"] = i;
                
                // Add connection duration in seconds
                unsigned long duration = (millis() - modbusClients[i].connectionTime) / 1000;
                client["connected_for"] = duration;
            }
        }
    }

    // Digital inputs - account for inversion
    JsonArray di = doc.createNestedArray("di");
    for (int i = 0; i < 8; i++) {
        di.add(ioStatus.dIn[i]);
    }

    // Add raw digital input states (without latching effect)
    JsonArray diRaw = doc.createNestedArray("di_raw");
    for (int i = 0; i < 8; i++) {
        diRaw.add(ioStatus.dInRaw[i]);
    }

    // Add latched state information
    JsonArray diLatched = doc.createNestedArray("di_latched");
    for (int i = 0; i < 8; i++) {
        diLatched.add(ioStatus.dInLatched[i]);
    }

    // Digital outputs - account for inversion
    JsonArray do_ = doc.createNestedArray("do");
    for (int i = 0; i < 8; i++) {
        do_.add(ioStatus.dOut[i]);
    }

    // Add analog input values - always in millivolts
    JsonArray ai = doc.createNestedArray("ai");
    for (int i = 0; i < sizeof(ANALOG_INPUTS)/sizeof(ANALOG_INPUTS[0]); i++) {
        ai.add(ioStatus.aIn[i]);
    }

    // I2C Sensor Data - Add sensor readings as nested object
    JsonObject i2c_sensors = doc.createNestedObject("i2c_sensors");
    i2c_sensors["temperature"] = String(ioStatus.temperature, 2);
    i2c_sensors["humidity"] = String(ioStatus.humidity, 2);

    serializeJson(doc, jsonBuffer);
    webServer.send(200, "application/json", jsonBuffer);
}

void handleGetIOConfig() {
    delay(5);
    
    StaticJsonDocument<1024> doc;
    
    // Add version information
    doc["version"] = config.version;
    
    // Add digital input configuration
    JsonArray diPullup = doc.createNestedArray("di_pullup");
    JsonArray diInvert = doc.createNestedArray("di_invert");
    JsonArray diLatch = doc.createNestedArray("di_latch");
    
    for (int i = 0; i < sizeof(DIGITAL_INPUTS)/sizeof(DIGITAL_INPUTS[0]); i++) {
        diPullup.add(config.diPullup[i]);
        diInvert.add(config.diInvert[i]);
        diLatch.add(config.diLatch[i]);
    }
    
    // Add digital output configuration
    JsonArray doInvert = doc.createNestedArray("do_invert");
    JsonArray doInitialState = doc.createNestedArray("do_initial_state");
    
    for (int i = 0; i < sizeof(DIGITAL_OUTPUTS)/sizeof(DIGITAL_OUTPUTS[0]); i++) {
        doInvert.add(config.doInvert[i]);
        doInitialState.add(config.doInitialState[i]);
    }
    
    String response;
    serializeJson(doc, response);
    webServer.send(200, "application/json", response);
}

void handleSetIOConfig() {
    Serial.println("Received IO config update request");
    delay(100);

    Serial.println("Validating receieved request");
    if (!webServer.hasArg("plain")) {
        webServer.send(400, "text/plain", "No data provided");
        return;
    }
    
    Serial.println("Parsing JSON");
    String jsonData = webServer.arg("plain");
    StaticJsonDocument<2048> doc;
    DeserializationError error = deserializeJson(doc, jsonData);
    
    if (error) {
        String errorMsg = "JSON parsing failed: ";
        errorMsg += error.c_str();
        Serial.println(errorMsg);
        webServer.send(400, "text/plain", errorMsg);
        return;
    }
    
    bool changed = false;
    
    Serial.println("Updating digital input configuration");
    // Update digital input configuration
    if (doc.containsKey("di_pullup") && doc["di_pullup"].is<JsonArray>()) {
        JsonArray diPullup = doc["di_pullup"].as<JsonArray>();
        int index = 0;
        for (JsonVariant value : diPullup) {
            if (index < sizeof(DIGITAL_INPUTS)/sizeof(DIGITAL_INPUTS[0])) {
                bool newValue = value.as<bool>();
                if (config.diPullup[index] != newValue) {
                    config.diPullup[index] = newValue;
                    changed = true;
                    // Apply pullup setting immediately
                    if (newValue) {
                        pinMode(DIGITAL_INPUTS[index], INPUT_PULLUP);
                    } else {
                        pinMode(DIGITAL_INPUTS[index], INPUT);
                    }
                }
                index++;
            }
        }
    }
    
    Serial.println("Updating digital input invert configuration");
    // Update digital input invert configuration
    if (doc.containsKey("di_invert") && doc["di_invert"].is<JsonArray>()) {
        JsonArray diInvert = doc["di_invert"].as<JsonArray>();
        int index = 0;
        for (JsonVariant value : diInvert) {
            if (index < sizeof(DIGITAL_INPUTS)/sizeof(DIGITAL_INPUTS[0])) {
                bool newValue = value.as<bool>();
                if (config.diInvert[index] != newValue) {
                    config.diInvert[index] = newValue;
                    changed = true;
                }
                index++;
            }
        }
    }
    
    Serial.println("Updating digital input latch configuration");
    // Update digital input latch configuration
    if (doc.containsKey("di_latch") && doc["di_latch"].is<JsonArray>()) {
        JsonArray diLatch = doc["di_latch"].as<JsonArray>();
        int index = 0;
        for (JsonVariant value : diLatch) {
            if (index < sizeof(DIGITAL_INPUTS)/sizeof(DIGITAL_INPUTS[0])) {
                bool newValue = value.as<bool>();
                if (config.diLatch[index] != newValue) {
                    config.diLatch[index] = newValue;
                    
                    // If disabling latching, clear any latched states
                    if (!newValue && ioStatus.dInLatched[index]) {
                        ioStatus.dInLatched[index] = false;
                    }
                    
                    changed = true;
                }
                index++;
            }
        }
    }
    
    Serial.println("Updating digital output invert configuration");
    // Update digital output invert configuration
    if (doc.containsKey("do_invert") && doc["do_invert"].is<JsonArray>()) {
        JsonArray doInvert = doc["do_invert"].as<JsonArray>();
        int index = 0;
        for (JsonVariant value : doInvert) {
            if (index < sizeof(DIGITAL_OUTPUTS)/sizeof(DIGITAL_OUTPUTS[0])) {
                bool newValue = value.as<bool>();
                if (config.doInvert[index] != newValue) {
                    config.doInvert[index] = newValue;
                    changed = true;
                }
                index++;
            }
        }
    }
    
    Serial.println("Updating digital output initial state configuration");
    // Update digital output initial state configuration
    if (doc.containsKey("do_initial_state") && doc["do_initial_state"].is<JsonArray>()) {
        JsonArray doInitialState = doc["do_initial_state"].as<JsonArray>();
        int index = 0;
        for (JsonVariant value : doInitialState) {
            if (index < sizeof(DIGITAL_OUTPUTS)/sizeof(DIGITAL_OUTPUTS[0])) {
                bool newValue = value.as<bool>();
                if (config.doInitialState[index] != newValue) {
                    config.doInitialState[index] = newValue;
                    changed = true;
                }
                index++;
            }
        }
    }
    
    Serial.printf("Checking for changes... %s\n", changed ? "changes found" : "no changes");
    
    // Save the configuration if changes were made
    if (changed) {
        Serial.print("Saving IO configuration...");
        saveConfig();
        Serial.println(" done");
    }
    
    // Send success response
    StaticJsonDocument<64> responseDoc;
    responseDoc["success"] = true;
    responseDoc["changed"] = changed;
    
    String response;
    serializeJson(responseDoc, response);
    webServer.send(200, "application/json", response);
}

void handleResetLatches() {
    Serial.println("Handling reset latches request");
    
    // Reset all latched inputs
    resetLatches();
    
    // Create a JSON response
    StaticJsonDocument<128> doc;
    doc["success"] = true;
    doc["message"] = "All latched inputs have been reset";
    
    String response;
    serializeJson(doc, response);
    webServer.send(200, "application/json", response);
}

void handleResetSingleLatch() {
    // Check if the request has a body
    if (!webServer.hasArg("plain")) {
        webServer.send(400, "application/json", "{\"success\":false,\"message\":\"No request body\"}");
        return;
    }
    
    String requestBody = webServer.arg("plain");
    StaticJsonDocument<128> doc;
    DeserializationError error = deserializeJson(doc, requestBody);
    
    if (error) {
        Serial.print(F("Reset latch JSON deserialization failed: "));
        Serial.println(error.c_str());
        webServer.send(400, "application/json", "{\"success\":false,\"message\":\"Invalid JSON\"}");
        return;
    }
    
    // Check if the input field exists and is valid
    if (!doc.containsKey("input")) {
        webServer.send(400, "application/json", "{\"success\":false,\"message\":\"Missing input field\"}");
        return;
    }
    
    int inputIndex = doc["input"];
    
    // Validate input index
    if (inputIndex < 0 || inputIndex >= 8) {
        webServer.send(400, "application/json", "{\"success\":false,\"message\":\"Invalid input index\"}");
        return;
    }
    
    // Reset the latch for the specified input
    Serial.printf("Resetting latch for input %d\n", inputIndex);
    ioStatus.dInLatched[inputIndex] = false;
    
    // Prepare response
    StaticJsonDocument<128> responseDoc;
    responseDoc["success"] = true;
    responseDoc["message"] = "Latch has been reset for input " + String(inputIndex);
    
    String response;
    serializeJson(responseDoc, response);
    webServer.send(200, "application/json", response);
}