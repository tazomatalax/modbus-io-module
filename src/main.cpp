#include <Arduino.h>
#include <SPI.h>
#include <W5500lwIP.h>
#include <WebServer.h>
#include <ArduinoModbus.h>
#include <ArduinoJson.h>
#include <EEPROM.h>

// Pin Definitions
#define PIN_ETH_CS 17
#define PIN_ETH_IRQ 21
#define EEPROM_SIZE 512
#define CONFIG_ADDR 0
#define CONFIG_VERSION 2  // Increment this when config structure changes
#define HOSTNAME_MAX_LENGTH 32

// Global flags
bool modbusClientConnected = false;

// Digital IO pins
const uint8_t DIGITAL_INPUTS[] = {0, 1, 2, 3, 4, 5, 6, 7};  // Digital input pins
const uint8_t DIGITAL_OUTPUTS[] = {8, 9, 10, 11, 12, 13, 14, 15}; // Digital output pins
const uint8_t ANALOG_INPUTS[] = {26, 27, 28};   // ADC pins

// Network and Modbus Configuration
struct Config {
    uint8_t version;
    bool dhcpEnabled;
    uint8_t ip[4];
    uint8_t gateway[4];
    uint8_t subnet[4];
    uint16_t modbusPort;
    char hostname[HOSTNAME_MAX_LENGTH];
} config;

// Default configuration
const Config DEFAULT_CONFIG = {
    CONFIG_VERSION,              // version
    true,                       // DHCP enabled
    {192, 168, 1, 10},         // Default IP
    {192, 168, 1, 1},          // Default Gateway
    {255, 255, 255, 0},        // Default Subnet
    502,                       // Default Modbus port
    "modbus-io"                // Default hostname
};

// Ethernet and Server instances
Wiznet5500lwIP eth(PIN_ETH_CS, SPI, PIN_ETH_IRQ);
WiFiServer modbusServer(502);
ModbusTCPServer ModbusTCPServer;
WebServer webServer(80);

// Function declarations
void loadConfig();
void saveConfig();
void setupEthernet();
void setupModbus();
void setupWebServer();
void handleRoot();
void handleGetConfig();
void handleSetConfig();
void updateIO();
void handleGetIOStatus();

void setup() {
    Serial.begin(115200);
    uint32_t timeStamp = millis();
    while (!Serial) {
        if (millis() - timeStamp > 5000) {
            break;
        }
    }
    Serial.println("Booting...");
    
    // Initialize pins
    for (auto pin : DIGITAL_INPUTS) {
        pinMode(pin, INPUT);
    }
    for (auto pin : DIGITAL_OUTPUTS) {
        pinMode(pin, OUTPUT);
    }

    analogReadResolution(12);
    
    // Initialize EEPROM
    EEPROM.begin(EEPROM_SIZE);
    
    // Load configuration
    loadConfig();
    
    // Setup network and services
    setupEthernet();
    setupModbus();
    setupWebServer();
}

WiFiClient client;

void loop() {
    if (!modbusClientConnected) {
        // listen for incoming clients
        client = modbusServer.accept();
        
        if (client) {
            // a new client connected
            Serial.println("new client");

            // let the Modbus TCP accept the connection 
            ModbusTCPServer.accept(client);

            modbusClientConnected = true;
        }
    } else {
        if(!client.connected()) {
            Serial.println("client disconnected");
            modbusClientConnected = false;
        } else {
            // poll for Modbus TCP requests, while client connected
            ModbusTCPServer.poll();
            // update IO
            updateIO();
        }
    }
    webServer.handleClient();
}

void loadConfig() {
    // Read config from EEPROM
    EEPROM.get(CONFIG_ADDR, config);
    
    // Check if config is valid
    if (config.version != CONFIG_VERSION) {
        Serial.println("Invalid config version, using defaults");
        config = DEFAULT_CONFIG;
        saveConfig();
    }
}

void saveConfig() {
    EEPROM.put(CONFIG_ADDR, config);
    EEPROM.commit();
}

void setupEthernet() {
    // Set hostname first
    eth.hostname(config.hostname);

    if (config.dhcpEnabled) {
        if (!eth.begin()) {
            Serial.println("Failed to configure DHCP, falling back to static IP");
            IPAddress defaultIP(config.ip[0], config.ip[1], config.ip[2], config.ip[3]);
            eth.config(defaultIP);
        }
    } else {
        IPAddress ip(config.ip[0], config.ip[1], config.ip[2], config.ip[3]);
        IPAddress gateway(config.gateway[0], config.gateway[1], config.gateway[2], config.gateway[3]);
        IPAddress subnet(config.subnet[0], config.subnet[1], config.subnet[2], config.subnet[3]);
        eth.config(ip, gateway, subnet);
        if (!eth.begin()) {
            Serial.println("Failed to configure static IP");
            return;
        }
    }
    
    // Wait for connection or timeout
    int timeout = 0;
    while (eth.status() != WL_CONNECTED && timeout < 10) {
        delay(1000);
        Serial.print(".");
        timeout++;
    }
    
    if (eth.status() != WL_CONNECTED) {
        Serial.println("Failed to connect with current settings");
        Serial.println("Falling back to static IP");
        IPAddress ip(config.ip[0], config.ip[1], config.ip[2], config.ip[3]);
        IPAddress gateway(config.gateway[0], config.gateway[1], config.gateway[2], config.gateway[3]);
        IPAddress subnet(config.subnet[0], config.subnet[1], config.subnet[2], config.subnet[3]);
        eth.config(ip, gateway, subnet);
        eth.begin();
    }
    
    Serial.print("Hostname: ");
    Serial.println(config.hostname);
    Serial.print("IP Address: ");
    Serial.println(eth.localIP());
}

void setupModbus() {
    modbusServer.begin();
    
    if (!ModbusTCPServer.begin()) {
        Serial.println("Failed to start Modbus TCP Server!");
        return;
    }
    
    Serial.println("Modbus TCP Server started");
    
    // Configure Modbus registers
    ModbusTCPServer.configureHoldingRegisters(0x00, 16);  // 16 holding registers
    ModbusTCPServer.configureInputRegisters(0x00, 16);    // 16 input registers
    ModbusTCPServer.configureCoils(0x00, 16);            // 16 coils
    ModbusTCPServer.configureDiscreteInputs(0x00, 16);   // 16 discrete inputs
}

void setupWebServer() {
    webServer.on("/", HTTP_GET, handleRoot);
    webServer.on("/config", HTTP_GET, handleGetConfig);
    webServer.on("/config", HTTP_POST, handleSetConfig);
    webServer.on("/iostatus", HTTP_GET, handleGetIOStatus);
    webServer.begin();
}

void handleRoot() {
    const char WEBPAGE_HTML[] = R"=====(
<!DOCTYPE html>
<html>
<head>
    <title>Modbus IO Module Configuration</title>
    <style>
        :root {
            --primary-color: #2196F3;
            --success-color: #4CAF50;
            --error-color: #f44336;
            --warning-color: #ff9800;
            --background-color: #f5f5f5;
            --card-background: #ffffff;
        }
        
        body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            margin: 0;
            padding: 20px;
            background-color: var(--background-color);
            color: #333;
        }
        
        .container { 
            max-width: 800px; 
            margin: 0 auto;
        }
        
        .card {
            background: var(--card-background);
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            padding: 20px;
            margin-bottom: 20px;
        }
        
        h1 {
            color: var(--primary-color);
            margin: 0 0 20px 0;
            font-weight: 300;
            font-size: 2.2em;
        }
        
        h2 {
            color: #555;
            font-weight: 500;
            margin: 0 0 15px 0;
            font-size: 1.5em;
        }
        
        .status-banner {
            background: var(--primary-color);
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
        }
        
        .status-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .status-indicator {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
        }
        
        .status-connected {
            background-color: var(--success-color);
        }
        
        .status-disconnected {
            background-color: var(--error-color);
        }
        
        .ip {
            font-weight: bold;
        }
        
        .form-group {
            margin-bottom: 15px;
        }
        
        label {
            display: block;
            margin-bottom: 8px;
            color: #666;
            font-weight: 500;
        }
        
        input[type="text"] {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
            transition: border-color 0.2s;
            box-sizing: border-box;
        }
        
        input[type="text"]:focus {
            border-color: var(--primary-color);
            outline: none;
            box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.1);
        }

        /* Switch styles */
        .switch {
            position: relative;
            display: inline-block;
            width: 60px;
            height: 34px;
            margin-right: 10px;
        }

        .switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }

        .slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            transition: .4s;
            border-radius: 34px;
        }

        .slider:before {
            position: absolute;
            content: "";
            height: 26px;
            width: 26px;
            left: 4px;
            bottom: 4px;
            background-color: white;
            transition: .4s;
            border-radius: 50%;
        }

        input:checked + .slider {
            background-color: var(--primary-color);
        }

        input:checked + .slider:before {
            transform: translateX(26px);
        }
        
        .switch-wrapper {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
        }

        .switch-label {
            font-weight: 500;
            color: #666;
        }
        
        button {
            background-color: var(--primary-color);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: background-color 0.2s;
            width: 100%;
            margin-top: 10px;
        }
        
        button:hover {
            background-color: #1976D2;
        }
        
        .status {
            margin-top: 15px;
            padding: 10px;
            border-radius: 4px;
            display: none;
            text-align: center;
        }
        
        .io-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }
        
        .io-group {
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .io-group h3 {
            margin: 0 0 15px 0;
            color: var(--primary-color);
            font-size: 1.2em;
        }
        
        .io-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px;
            margin-bottom: 8px;
            border-radius: 4px;
            color: white;
            font-weight: 500;
        }
        
        .io-on {
            background-color: var(--success-color);
        }
        
        .io-off {
            background-color: var(--error-color);
        }
        
        .analog-value {
            background-color: var(--primary-color);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="status-banner">
            <div class="status-grid">
                <div class="status-item">
                    <span>Current IP: </span>
                    <span id="current-ip" class="ip">Loading...</span>
                </div>
                <div class="status-item">
                    <span>Hostname: </span>
                    <span id="current-hostname" class="ip">Loading...</span>
                </div>
                <div class="status-item">
                    <span>Modbus Client: </span>
                    <span class="status-indicator" id="modbus-status"></span>
                    <span id="modbus-status-text">Loading...</span>
                </div>
            </div>
        </div>
        
        <div class="card">
            <h1>Network Configuration</h1>
            
            <div class="switch-wrapper">
                <label class="switch">
                    <input type="checkbox" id="dhcp">
                    <span class="slider"></span>
                </label>
                <span class="switch-label">Enable DHCP</span>
            </div>
            
            <div class="form-group">
                <label for="hostname">Hostname</label>
                <input type="text" id="hostname">
            </div>
            
            <div class="form-group">
                <label for="ip">IP Address</label>
                <input type="text" id="ip">
            </div>
            
            <div class="form-group">
                <label for="subnet">Subnet Mask</label>
                <input type="text" id="subnet">
            </div>
            
            <div class="form-group">
                <label for="gateway">Gateway</label>
                <input type="text" id="gateway">
            </div>
            
            <div class="form-group">
                <label for="modbus_port">Modbus Port</label>
                <input type="text" id="modbus_port">
            </div>
            
            <button onclick="saveConfig()">Save Configuration</button>
            <div id="status" class="status"></div>
        </div>

        <div class="card">
            <h1>IO Status</h1>
            <div class="io-grid">
                <div class="io-group">
                    <h3>Digital Inputs</h3>
                    <div id="digital-inputs"></div>
                </div>
                
                <div class="io-group">
                    <h3>Digital Outputs</h3>
                    <div id="digital-outputs"></div>
                </div>
                
                <div class="io-group">
                    <h3>Analog Inputs</h3>
                    <div id="analog-inputs"></div>
                </div>
            </div>
        </div>
    </div>

    <script>
        function loadConfig() {
            fetch('/config')
                .then(response => response.json())
                .then(data => {
                    document.getElementById('dhcp').checked = data.dhcp;
                    document.getElementById('ip').value = data.ip;
                    document.getElementById('subnet').value = data.subnet;
                    document.getElementById('gateway').value = data.gateway;
                    document.getElementById('hostname').value = data.hostname;
                    document.getElementById('modbus_port').value = data.modbus_port;
                    document.getElementById('current-ip').textContent = data.current_ip || data.ip;
                    document.getElementById('current-hostname').textContent = data.hostname;
                    
                    // Disable IP fields if DHCP is enabled
                    const dhcpEnabled = data.dhcp;
                    ['ip', 'subnet', 'gateway'].forEach(id => {
                        document.getElementById(id).disabled = dhcpEnabled;
                    });
                });
        }

        // Toggle IP fields when DHCP checkbox changes
        document.getElementById('dhcp').addEventListener('change', function(e) {
            const disabled = e.target.checked;
            ['ip', 'subnet', 'gateway'].forEach(id => {
                document.getElementById(id).disabled = disabled;
            });
        });

        function saveConfig() {
            const config = {
                dhcp: document.getElementById('dhcp').checked,
                ip: document.getElementById('ip').value,
                subnet: document.getElementById('subnet').value,
                gateway: document.getElementById('gateway').value,
                hostname: document.getElementById('hostname').value,
                modbus_port: document.getElementById('modbus_port').value
            };

            fetch('/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(config)
            })
            .then(response => response.json())
            .then(data => {
                const status = document.getElementById('status');
                status.style.display = 'block';
                
                if (data.success) {
                    status.style.backgroundColor = '#4CAF50';
                    status.style.color = 'white';
                    status.innerHTML = 'Configuration saved successfully! Rebooting now...';
                    document.getElementById('current-ip').textContent = data.ip;
                    
                    // Set a countdown for reload
                    let countdown = 5;
                    const countdownInterval = setInterval(() => {
                        countdown--;
                        status.innerHTML = `Configuration saved successfully! Rebooting now... Page will reload in ${countdown} seconds`;
                        if (countdown <= 0) {
                            clearInterval(countdownInterval);
                            window.location.reload();
                        }
                    }, 1000);
                } else {
                    status.style.backgroundColor = '#f44336';
                    status.style.color = 'white';
                    status.innerHTML = 'Error: ' + data.error;
                }
                
                setTimeout(() => {
                    status.style.display = 'none';
                }, 3000);
            });
        }

        function updateIOStatus() {
            fetch('/iostatus')
                .then(response => response.json())
                .then(data => {
                    // Update Modbus status
                    const statusIndicator = document.getElementById('modbus-status');
                    const statusText = document.getElementById('modbus-status-text');
                    
                    if (data.modbus_connected) {
                        statusIndicator.className = 'status-indicator status-connected';
                        statusText.textContent = 'Connected';
                    } else {
                        statusIndicator.className = 'status-indicator status-disconnected';
                        statusText.textContent = 'Disconnected';
                    }

                    // Update digital inputs
                    const diDiv = document.getElementById('digital-inputs');
                    diDiv.innerHTML = data.di.map((value, index) => 
                        `<div class="io-item ${value ? 'io-on' : 'io-off'}">
                            <span>DI${index + 1}</span>
                            <span>${value ? 'ON' : 'OFF'}</span>
                        </div>`
                    ).join('');

                    // Update digital outputs
                    const doDiv = document.getElementById('digital-outputs');
                    doDiv.innerHTML = data.do.map((value, index) => 
                        `<div class="io-item ${value ? 'io-on' : 'io-off'}">
                            <span>DO${index + 1}</span>
                            <span>${value ? 'ON' : 'OFF'}</span>
                        </div>`
                    ).join('');

                    // Update analog inputs
                    const aiDiv = document.getElementById('analog-inputs');
                    aiDiv.innerHTML = data.ai.map((value, index) => 
                        `<div class="io-item analog-value">
                            <span>AI${index + 1}</span>
                            <span>${value} mV</span>
                        </div>`
                    ).join('');
                });
        }

        // Load initial configuration
        loadConfig();

        // Update IO status every second
        setInterval(updateIOStatus, 1000);
    </script>
</body>
</html>
)=====";
    webServer.send(200, "text/html", WEBPAGE_HTML);
}

void handleGetConfig() {
    StaticJsonDocument<512> doc;
    char ipStr[16], gwStr[16], subStr[16];
    
    doc["dhcp"] = config.dhcpEnabled;
    sprintf(ipStr, "%d.%d.%d.%d", config.ip[0], config.ip[1], config.ip[2], config.ip[3]);
    sprintf(gwStr, "%d.%d.%d.%d", config.gateway[0], config.gateway[1], config.gateway[2], config.gateway[3]);
    sprintf(subStr, "%d.%d.%d.%d", config.subnet[0], config.subnet[1], config.subnet[2], config.subnet[3]);
    
    doc["ip"] = ipStr;
    doc["gateway"] = gwStr;
    doc["subnet"] = subStr;
    doc["modbus_port"] = config.modbusPort;
    doc["hostname"] = config.hostname;
    doc["current_ip"] = eth.localIP().toString();
    
    String response;
    serializeJson(doc, response);
    webServer.send(200, "application/json", response);
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

    // Prevent buffer overflow
    if (data.length() > 256) {
        Serial.println("Data too long");
        webServer.send(400, "application/json", "{\"error\":\"Request too large\"}");
        return;
    }

    // Allocate JSON document based on input size
    const size_t capacity = JSON_OBJECT_SIZE(6) + 150;  // 6 fields + string storage
    StaticJsonDocument<384> doc;  // Increased from 128 to 384 bytes
    
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
    uint16_t modbusPort = doc["modbus_port"] | config.modbusPort;
    
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
    if (*ipStr) {  // More efficient than strlen(ipStr) > 0
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

    Serial.println("Saving to EEPROM");
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

void handleGetIOStatus() {
    char jsonBuffer[384];  // Increased buffer size to accommodate status
    StaticJsonDocument<384> doc;

    // Add Modbus client status
    doc["modbus_connected"] = modbusClientConnected;

    // Digital inputs
    JsonArray di = doc.createNestedArray("di");
    for (int i = 0; i < sizeof(DIGITAL_INPUTS)/sizeof(DIGITAL_INPUTS[0]); i++) {
        di.add(digitalRead(DIGITAL_INPUTS[i]));
    }

    // Digital outputs
    JsonArray do_ = doc.createNestedArray("do");
    for (int i = 0; i < sizeof(DIGITAL_OUTPUTS)/sizeof(DIGITAL_OUTPUTS[0]); i++) {
        do_.add(digitalRead(DIGITAL_OUTPUTS[i]));
    }

    // Analog inputs - convert to millivolts (12-bit resolution, 3.3V reference)
    JsonArray ai = doc.createNestedArray("ai");
    for (int i = 0; i < sizeof(ANALOG_INPUTS)/sizeof(ANALOG_INPUTS[0]); i++) {
        uint32_t rawValue = analogRead(ANALOG_INPUTS[i]);
        // Convert to millivolts: (raw * 3300) / 4095
        uint32_t millivolts = (rawValue * 3300UL) / 4095UL;
        ai.add(millivolts);
    }

    serializeJson(doc, jsonBuffer);
    webServer.send(200, "application/json", jsonBuffer);
}

void updateIO() {
    // Update discrete inputs from digital input pins
    for (size_t i = 0; i < sizeof(DIGITAL_INPUTS)/sizeof(DIGITAL_INPUTS[0]); i++) {
        ModbusTCPServer.discreteInputWrite(i, digitalRead(DIGITAL_INPUTS[i]));
    }

    // Update input registers from analog input pins (convert to millivolts)
    for (size_t i = 0; i < sizeof(ANALOG_INPUTS)/sizeof(ANALOG_INPUTS[0]); i++) {
        uint32_t rawValue = analogRead(ANALOG_INPUTS[i]);
        // Convert to millivolts: (raw * 3300) / 4095
        uint32_t millivolts = (rawValue * 3300UL) / 4095UL;
        ModbusTCPServer.inputRegisterWrite(i, millivolts);
    }

    // Update digital outputs from coils
    for (size_t i = 0; i < sizeof(DIGITAL_OUTPUTS)/sizeof(DIGITAL_OUTPUTS[0]); i++) {
        digitalWrite(DIGITAL_OUTPUTS[i], ModbusTCPServer.coilRead(i));
    }
}