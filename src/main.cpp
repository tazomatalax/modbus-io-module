#include <Arduino.h>
#include <SPI.h>
#include <W5500lwIP.h>
#include <WebServer.h>
#include <ArduinoModbus.h>
#include <ArduinoJson.h>
#include <EEPROM.h>

// Pin Definitions
#define PIN_ETH_MISO 16
#define PIN_ETH_CS 17
#define PIN_ETH_SCK 18
#define PIN_ETH_MOSI 19
#define PIN_ETH_RST 20
#define PIN_ETH_IRQ 21
#define PIN_EXT_LED 22

// Constants
#define EEPROM_SIZE 1024
#define CONFIG_ADDR 0
#define CONFIG_VERSION 5  // Increment this when config structure changes
#define HOSTNAME_MAX_LENGTH 32
#define MAX_MODBUS_CLIENTS 4  // Maximum number of concurrent Modbus clients

// Global flags
bool core0setupComplete = false;

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
    bool diPullup[8];         // Enable internal pullup for digital inputs
    bool diInvert[8];         // Invert logic for digital inputs
    bool doInvert[8];         // Invert logic for digital outputs
    bool aiPulldown[3];       // Enable internal pulldown for analog inputs
    bool aiRawFormat[3];      // Use RAW format (true) or millivolts (false)
} config;

// Default configuration
const Config DEFAULT_CONFIG = {
    CONFIG_VERSION,              // version
    true,                       // DHCP enabled
    {192, 168, 1, 10},         // Default IP
    {192, 168, 1, 1},          // Default Gateway
    {255, 255, 255, 0},        // Default Subnet
    502,                       // Default Modbus port
    "modbus-io",                // Default hostname
    {false, false, false, false, false, false, false, false},  // diPullup (all disabled)
    {false, false, false, false, false, false, false, false},  // diInvert (no inversion)
    {false, false, false, false, false, false, false, false},  // doInvert (no inversion)
    {false, false, false},  // aiPulldown (all disabled)
    {true, true, true}      // aiRawFormat (all RAW format by default)
};

// Ethernet and Server instances
Wiznet5500lwIP eth(PIN_ETH_CS, SPI, PIN_ETH_IRQ);
WiFiServer modbusServer(502);
WebServer webServer(80);
WiFiClient client;

// Client management
struct ModbusClientConnection {
    WiFiClient client;
    ModbusTCPServer server;
    bool connected;
    IPAddress clientIP;
    unsigned long connectionTime;
};

ModbusClientConnection modbusClients[MAX_MODBUS_CLIENTS];
int connectedClients = 0;
int IO_CONFIG_ADDRESS = sizeof(config);

// Function declarations
void loadConfig();
void saveConfig();
void setPinModes();
void setupEthernet();
void setupModbus();
void setupWebServer();
void handleRoot();
void handleGetConfig();
void handleSetConfig();
void handleSetOutput();
void updateIOForClient(int clientIndex);
void handleGetIOStatus();
void handleGetIOConfig();
void handleSetIOConfig();

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
    
    // Initialize EEPROM
    EEPROM.begin(EEPROM_SIZE);
    
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
    core0setupComplete = true;
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
                modbusClients[i].server.poll();
                
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
    
    webServer.handleClient();
}

void loadConfig() {
    // Read config from EEPROM
    rp2040.idleOtherCore();     // Make sure we are not trying to access EEPROM while the other core is using flash
    EEPROM.get(CONFIG_ADDR, config);
    rp2040.resumeOtherCore();   // Resume other core after reading from EEPROM
    
    // Check if config is valid
    if (config.version != CONFIG_VERSION) {
        Serial.println("Invalid config version, using defaults");
        config = DEFAULT_CONFIG;
        saveConfig();
    }
}

void saveConfig() {
    EEPROM.put(CONFIG_ADDR, config);
    rp2040.idleOtherCore();     // Make sure we are not trying to access EEPROM while the other core is using flash
    EEPROM.commit();
    rp2040.resumeOtherCore();   // Resume other core after reading from EEPROM
}

void setPinModes() {
    for (auto pin : DIGITAL_INPUTS) {
        pinMode(pin, config.diPullup[pin] ? INPUT_PULLUP : INPUT);
    }
    for (auto pin : DIGITAL_OUTPUTS) {
        pinMode(pin, OUTPUT);
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
    modbusServer.begin();
    
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
        modbusClients[i].server.configureInputRegisters(0x00, 16);    // 16 input registers
        modbusClients[i].server.configureCoils(0x00, 16);            // 16 coils
        modbusClients[i].server.configureDiscreteInputs(0x00, 16);   // 16 discrete inputs
    }
    
    Serial.println("Modbus TCP Servers started");
}

void setupWebServer() {
    // Add a small delay before starting the web server
    // This helps ensure the network stack is fully initialized
    delay(50);
    
    webServer.on("/", HTTP_GET, handleRoot);
    webServer.on("/config", HTTP_GET, handleGetConfig);
    webServer.on("/config", HTTP_POST, handleSetConfig);
    webServer.on("/iostatus", HTTP_GET, handleGetIOStatus);
    webServer.on("/io/setoutput", HTTP_POST, handleSetOutput);
    webServer.on("/ioconfig", HTTP_GET, handleGetIOConfig);
    webServer.on("/ioconfig", HTTP_POST, handleSetIOConfig);
    webServer.begin();
    
    Serial.println("Web server started");
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
            --primary-hover: #0b7dda;
            --success-color: #4CAF50;
            --error-color: #f44336;
            --warning-color: #ff9800;
            --background-color: #f5f5f5;
            --card-background: #ffffff;
            --on-color: rgb(0, 170, 41);
            --off-color: rgb(124, 124, 124);
            --analog-color: rgb(0, 103, 181);
            --border-color: rgba(0, 0, 0, 0.1);
            --io-group-bg: #f9f9f9;
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
        
        .device-status {
            margin-bottom: 20px;
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
            background-color: var(--error-color);
        }
        
        .status-connected {
            background-color: var(--success-color);
        }
        
        .status-disconnected {
            background-color: var(--error-color);
        }
        
        .form-group {
            margin-bottom: 15px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
        }
        
        .form-group input {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-sizing: border-box;
        }
        
        .switch-wrapper {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .switch {
            position: relative;
            display: inline-block;
            width: 50px;
            height: 24px;
            margin-right: 10px;
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
            border-radius: 24px;
        }
        
        .slider:before {
            position: absolute;
            content: "";
            height: 16px;
            width: 16px;
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
        
        .switch-label {
            font-weight: 500;
        }
        
        /* IO styling */
        .io-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 10px;
        }
        
        .io-section {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
        }
        
        .io-group {
            flex: 1;
            min-width: 250px;
            margin-bottom: 20px;
            background-color: var(--io-group-bg);
            border-radius: 6px;
            padding: 15px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            border: 1px solid rgba(0,0,0,0.03);
        }
        
        .io-group h3 {
            margin: 0 0 15px 0;
            color: #444;
            font-size: 1.1em;
            font-weight: 500;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(0,0,0,0.05);
            display: flex;
            align-items: center;
        }
        
        .io-group h3::before {
            content: "";
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-right: 8px;
        }
        
        .io-group:nth-child(1) h3::before {
            background-color: var(--off-color);
        }
        
        .io-group:nth-child(2) h3::before {
            background-color: var(--on-color);
        }
        
        .io-group:nth-child(3) h3::before {
            background-color: var(--analog-color);
        }
        
        .io-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 15px;
            border-radius: 6px;
            background-color: var(--off-color);
            color: white;
            margin-bottom: 8px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
            transition: all 0.2s ease;
        }
        
        .io-on {
            background-color: var(--on-color);
        }
        
        .analog-value {
            background-color: var(--analog-color);
        }
        
        .output-item {
            cursor: pointer;
            transition: transform 0.1s, box-shadow 0.2s;
        }
        
        .output-item:hover {
            opacity: 0.9;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .output-item:active {
            transform: scale(0.98);
        }
        
        /* Client list styling */
        .client-list {
            padding: 0;
            margin: 0;
        }
        
        .client-item {
            background-color: white;
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 10px;
            border: 1px solid var(--border-color);
        }
        
        .client-item h4 {
            margin: 0 0 8px 0;
            color: var(--primary-color);
            font-size: 1em;
            font-weight: 500;
        }
        
        .client-item p {
            margin: 5px 0;
            font-size: 0.9em;
        }
        
        .no-clients {
            color: #777;
            font-style: italic;
            padding: 10px 0;
        }
        
        /* New device status card */
        .device-info-card {
            background: var(--card-background);
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
            overflow: hidden;
        }
        
        .device-header {
            background-color: var(--primary-color);
            color: white;
            padding: 15px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .device-header h1 {
            margin: 0;
            color: white;
            font-size: 1.5em;
            font-weight: 400;
        }
        
        .device-details {
            display: flex;
            flex-wrap: wrap;
            padding: 15px 20px;
        }
        
        .device-detail-column {
            flex: 1;
            min-width: 200px;
        }
        
        .device-detail {
            margin-bottom: 10px;
        }
        
        .device-detail-label {
            font-weight: 500;
            color: #555;
            margin-bottom: 3px;
        }
        
        .device-detail-value {
            color: #333;
        }
        
        .client-section {
            border-top: 1px solid var(--border-color);
            padding: 15px 20px;
        }
        
        .client-section h2 {
            margin: 0 0 15px 0;
            font-size: 1.2em;
            color: var(--primary-color);
        }
        
        .client-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
            gap: 10px;
        }
        
        /* IO Configuration */
        .io-config-item {
            margin-bottom: 15px;
        }
        
        .io-config-title {
            font-weight: 500;
            margin-bottom: 5px;
        }
        
        .io-config-options {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }
        
        .switch-label {
            display: inline-flex;
            align-items: center;
            margin-right: 15px;
            cursor: pointer;
        }
        
        .switch-text {
            margin-left: 5px;
        }
        
        button {
            background-color: var(--primary-color);
            color: white;
            border: none;
            border-radius: 4px;
            padding: 8px 15px;
            cursor: pointer;
            font-size: 14px;
            margin-top: 10px;
            transition: background-color 0.2s;
        }
        
        button:hover {
            background-color: var(--primary-hover);
        }
        
        .status {
            margin-top: 15px;
            padding: 10px;
            border-radius: 4px;
            display: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="device-info-card">
            <div class="device-header">
                <h1>Modbus IO Module</h1>
                <div class="status-item">
                    <span class="status-indicator" id="modbus-status"></span>
                    <span id="modbus-status-text">Loading...</span>
                </div>
            </div>
            
            <div class="device-details">
                <div class="device-detail-column">
                    <div class="device-detail">
                        <div class="device-detail-label">IP Address</div>
                        <div class="device-detail-value" id="current-ip">Loading...</div>
                    </div>
                    <div class="device-detail">
                        <div class="device-detail-label">Hostname</div>
                        <div class="device-detail-value" id="current-hostname">Loading...</div>
                    </div>
                </div>
                <div class="device-detail-column">
                    <div class="device-detail">
                        <div class="device-detail-label">Modbus Port</div>
                        <div class="device-detail-value" id="current-modbus-port">Loading...</div>
                    </div>
                    <div class="device-detail">
                        <div class="device-detail-label">Connected Clients</div>
                        <div class="device-detail-value" id="client-count">0</div>
                    </div>
                </div>
            </div>
            
            <div class="client-section" id="client-section" style="display: none;">
                <h2>Connected Clients</h2>
                <div class="client-grid" id="client-list">
                    <div class="no-clients">No clients connected</div>
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
            <div class="io-section">
                <div class="io-group">
                    <h3>Digital Inputs</h3>
                    <div id="digital-inputs" class="io-grid"></div>
                </div>
                
                <div class="io-group">
                    <h3>Digital Outputs</h3>
                    <div id="digital-outputs" class="io-grid"></div>
                </div>
                
                <div class="io-group">
                    <h3>Analog Inputs</h3>
                    <div id="analog-inputs" class="io-grid"></div>
                </div>
            </div>
        </div>
        
        <div class="card">
            <h1>IO Configuration</h1>
            <div class="io-section">
                <div class="io-group">
                    <h3>Digital Input Configuration</h3>
                    <div id="di-config"></div>
                </div>
                
                <div class="io-group">
                    <h3>Digital Output Configuration</h3>
                    <div id="do-config"></div>
                </div>
                
                <div class="io-group">
                    <h3>Analog Input Configuration</h3>
                    <div id="ai-config"></div>
                </div>
            </div>
            <button onclick="saveIOConfig()">Save IO Configuration</button>
            <div id="io-config-status" class="status"></div>
        </div>
    </div>

    <script>
        let configLoadAttempts = 0;
        const MAX_CONFIG_LOAD_ATTEMPTS = 5;
        
        function loadConfig() {
            console.log("Attempting to load configuration...");
            fetch('/config')
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    // Check if we got valid data (current_ip should exist)
                    if (!data.current_ip) {
                        throw new Error('Incomplete data received');
                    }
                    
                    console.log("Configuration loaded successfully:", data);
                    document.getElementById('dhcp').checked = data.dhcp;
                    document.getElementById('ip').value = data.ip;
                    document.getElementById('subnet').value = data.subnet;
                    document.getElementById('gateway').value = data.gateway;
                    document.getElementById('hostname').value = data.hostname;
                    document.getElementById('modbus_port').value = data.modbus_port;
                    document.getElementById('current-ip').textContent = data.current_ip || data.ip;
                    document.getElementById('current-hostname').textContent = data.hostname;
                    document.getElementById('current-modbus-port').textContent = data.modbus_port;
                    document.getElementById('client-count').textContent = data.modbus_client_count;
                    
                    // Update connected clients information
                    const clientList = document.getElementById('client-list');
                    if (data.modbus_client_count > 0 && data.modbus_clients) {
                        document.getElementById('client-section').style.display = 'block';
                        clientList.innerHTML = data.modbus_clients.map(client => 
                            `<div class="client-item">
                                <h4>Client ${client.slot + 1}</h4>
                                <p>IP Address: ${client.ip}</p>
                                <p>Connected for: ${formatDuration(client.connected_for)}</p>
                            </div>`
                        ).join('');
                    } else {
                        document.getElementById('client-section').style.display = 'none';
                        clientList.innerHTML = '<div class="no-clients">No clients connected</div>';
                    }
                    
                    // Disable IP fields if DHCP is enabled
                    const dhcpEnabled = data.dhcp;
                    ['ip', 'subnet', 'gateway'].forEach(id => {
                        document.getElementById(id).disabled = dhcpEnabled;
                    });
                    
                    // Reset attempts counter on success
                    configLoadAttempts = 0;
                    
                    // Once config is loaded successfully, wait a moment then start loading IO status
                    setTimeout(() => {
                        console.log("Starting IO status updates...");
                        updateIOStatus();
                    }, 500);
                })
                .catch(error => {
                    console.error('Error loading config:', error);
                    configLoadAttempts++;
                    
                    if (configLoadAttempts < MAX_CONFIG_LOAD_ATTEMPTS) {
                        // Retry after a delay with exponential backoff
                        const retryDelay = Math.min(1000 * Math.pow(1.5, configLoadAttempts), 5000);
                        console.log(`Retrying config load (attempt ${configLoadAttempts+1}/${MAX_CONFIG_LOAD_ATTEMPTS}) in ${retryDelay}ms...`);
                        setTimeout(loadConfig, retryDelay);
                    } else {
                        // Even after max attempts, try one more time after a longer delay
                        console.log("Maximum config load attempts reached. Trying one final attempt in 5 seconds...");
                        setTimeout(loadConfig, 5000);
                    }
                });
        }

        let ioStatusLoadAttempts = 0;
        const MAX_IO_STATUS_LOAD_ATTEMPTS = 5;
        
        function updateIOStatus() {
            console.log("Fetching IO status...");
            fetch('/iostatus')
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    console.log("IO status loaded successfully:", data);
                    
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

                    // Update client count
                    document.getElementById('client-count').textContent = data.modbus_client_count;

                    // Update digital inputs
                    const diDiv = document.getElementById('digital-inputs');
                    diDiv.innerHTML = data.di.map((value, index) => 
                        `<div class="io-item ${value ? 'io-on' : 'io-off'}">
                            <span><strong>DI${index + 1}</strong></span>
                            <span>${value ? 'ON' : 'OFF'}</span>
                        </div>`
                    ).join('');

                    // Update digital outputs with click handlers
                    const doDiv = document.getElementById('digital-outputs');
                    doDiv.innerHTML = data.do.map((value, index) => 
                        `<div class="io-item output-item ${value ? 'io-on' : 'io-off'}" 
                              onclick="toggleOutput(${index}, ${value})">
                            <span><strong>DO${index + 1}</strong></span>
                            <span>${value ? 'ON' : 'OFF'}</span>
                        </div>`
                    ).join('');

                    // Update analog inputs
                    const aiDiv = document.getElementById('analog-inputs');
                    aiDiv.innerHTML = data.ai.map((value, index) => 
                        `<div class="io-item analog-value">
                            <span><strong>AI${index + 1}</strong></span>
                            <span>${value} mV</span>
                        </div>`
                    ).join('');
                    
                    // Update connected clients
                    const clientList = document.getElementById('client-list');
                    if (data.modbus_client_count > 0) {
                        document.getElementById('client-section').style.display = 'block';
                        clientList.innerHTML = data.modbus_clients.map(client => 
                            `<div class="client-item">
                                <h4>Client ${client.slot + 1}</h4>
                                <p>IP Address: ${client.ip}</p>
                                <p>Connected for: ${formatDuration(client.connected_for)}</p>
                            </div>`
                        ).join('');
                    } else {
                        document.getElementById('client-section').style.display = 'none';
                        clientList.innerHTML = '<div class="no-clients">No clients connected</div>';
                    }
                    
                    // Reset attempts counter on success
                    ioStatusLoadAttempts = 0;
                    
                    // Schedule next update
                    setTimeout(updateIOStatus, 1000);
                })
                .catch(error => {
                    console.error('Error updating IO status:', error);
                    ioStatusLoadAttempts++;
                    
                    if (ioStatusLoadAttempts < MAX_IO_STATUS_LOAD_ATTEMPTS) {
                        // Retry after a delay with exponential backoff
                        const retryDelay = Math.min(1000 * Math.pow(1.5, ioStatusLoadAttempts), 5000);
                        console.log(`Retrying IO status update (attempt ${ioStatusLoadAttempts+1}/${MAX_IO_STATUS_LOAD_ATTEMPTS}) in ${retryDelay}ms...`);
                        setTimeout(updateIOStatus, retryDelay);
                    } else {
                        // After max attempts, still try again but less frequently
                        console.log("Maximum IO status load attempts reached. Continuing with reduced frequency...");
                        setTimeout(updateIOStatus, 5000);
                    }
                });
        }
        
        // Helper function to format duration in seconds to a readable format
        function formatDuration(seconds) {
            if (seconds < 60) {
                return seconds + " seconds";
            } else if (seconds < 3600) {
                const minutes = Math.floor(seconds / 60);
                const remainingSeconds = seconds % 60;
                return minutes + " min " + remainingSeconds + " sec";
            } else {
                const hours = Math.floor(seconds / 3600);
                const minutes = Math.floor((seconds % 3600) / 60);
                return hours + " hr " + minutes + " min";
            }
        }
        
        // Wait a short time before loading initial configuration to ensure server is ready
        setTimeout(() => {
            console.log("Starting initial data load sequence...");
            
            // First attempt at loading config
            loadConfig();
            
            // Load IO configuration after a short delay
            setTimeout(() => {
                loadIOConfig();
            }, 500);
        }, 500);
        
        // Add the IO configuration handling
        let ioConfigLoadAttempts = 0;
        const MAX_IO_CONFIG_LOAD_ATTEMPTS = 5;
        
        function loadIOConfig() {
            console.log("Loading IO configuration...");
            fetch('/ioconfig')
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    console.log("IO configuration loaded successfully:", data);
                    
                    // Digital Inputs configuration
                    const diConfigDiv = document.getElementById('di-config');
                    let diConfigHtml = '';
                    
                    for (let i = 0; i < data.di_pullup.length; i++) {
                        diConfigHtml += `
                            <div class="io-config-item">
                                <div class="io-config-title">DI${i + 1}</div>
                                <div class="io-config-options">
                                    <label class="switch-label">
                                        <input type="checkbox" id="di-pullup-${i}" ${data.di_pullup[i] ? 'checked' : ''}>
                                        <span class="switch-text">Pullup</span>
                                    </label>
                                    <label class="switch-label">
                                        <input type="checkbox" id="di-invert-${i}" ${data.di_invert[i] ? 'checked' : ''}>
                                        <span class="switch-text">Invert</span>
                                    </label>
                                </div>
                            </div>
                        `;
                    }
                    diConfigDiv.innerHTML = diConfigHtml;
                    
                    // Digital Outputs configuration
                    const doConfigDiv = document.getElementById('do-config');
                    let doConfigHtml = '';
                    
                    for (let i = 0; i < data.do_invert.length; i++) {
                        doConfigHtml += `
                            <div class="io-config-item">
                                <div class="io-config-title">DO${i + 1}</div>
                                <div class="io-config-options">
                                    <label class="switch-label">
                                        <input type="checkbox" id="do-invert-${i}" ${data.do_invert[i] ? 'checked' : ''}>
                                        <span class="switch-text">Invert</span>
                                    </label>
                                </div>
                            </div>
                        `;
                    }
                    doConfigDiv.innerHTML = doConfigHtml;
                    
                    // Analog Inputs configuration
                    const aiConfigDiv = document.getElementById('ai-config');
                    let aiConfigHtml = '';
                    
                    for (let i = 0; i < data.ai_pulldown.length; i++) {
                        aiConfigHtml += `
                            <div class="io-config-item">
                                <div class="io-config-title">AI${i + 1}</div>
                                <div class="io-config-options">
                                    <label class="switch-label">
                                        <input type="checkbox" id="ai-pulldown-${i}" ${data.ai_pulldown[i] ? 'checked' : ''}>
                                        <span class="switch-text">Pulldown</span>
                                    </label>
                                    <label class="switch-label">
                                        <input type="checkbox" id="ai-raw-${i}" ${data.ai_raw_format[i] ? 'checked' : ''}>
                                        <span class="switch-text">RAW Format</span>
                                    </label>
                                </div>
                            </div>
                        `;
                    }
                    aiConfigDiv.innerHTML = aiConfigHtml;
                    
                    // Reset attempts counter on success
                    ioConfigLoadAttempts = 0;
                })
                .catch(error => {
                    console.error('Error loading IO configuration:', error);
                    ioConfigLoadAttempts++;
                    
                    if (ioConfigLoadAttempts < MAX_IO_CONFIG_LOAD_ATTEMPTS) {
                        // Retry after a delay with exponential backoff
                        const retryDelay = Math.min(1000 * Math.pow(1.5, ioConfigLoadAttempts), 5000);
                        console.log(`Retrying IO config load (attempt ${ioConfigLoadAttempts+1}/${MAX_IO_CONFIG_LOAD_ATTEMPTS}) in ${retryDelay}ms...`);
                        setTimeout(loadIOConfig, retryDelay);
                    } else {
                        // Even after max attempts, try one more time after a longer delay
                        console.log("Maximum IO config load attempts reached. Trying one final attempt in 5 seconds...");
                        setTimeout(loadIOConfig, 5000);
                    }
                });
        }
        
        function saveIOConfig() {
            // Gather all configuration data
            const ioConfig = {
                di_pullup: [],
                di_invert: [],
                do_invert: [],
                ai_pulldown: [],
                ai_raw_format: []
            };
            
            // Get digital input configuration
            const diLength = document.querySelectorAll('[id^="di-pullup-"]').length;
            for (let i = 0; i < diLength; i++) {
                ioConfig.di_pullup.push(document.getElementById(`di-pullup-${i}`).checked);
                ioConfig.di_invert.push(document.getElementById(`di-invert-${i}`).checked);
            }
            
            // Get digital output configuration
            const doLength = document.querySelectorAll('[id^="do-invert-"]').length;
            for (let i = 0; i < doLength; i++) {
                ioConfig.do_invert.push(document.getElementById(`do-invert-${i}`).checked);
            }
            
            // Get analog input configuration
            const aiLength = document.querySelectorAll('[id^="ai-pulldown-"]').length;
            for (let i = 0; i < aiLength; i++) {
                ioConfig.ai_pulldown.push(document.getElementById(`ai-pulldown-${i}`).checked);
                ioConfig.ai_raw_format.push(document.getElementById(`ai-raw-${i}`).checked);
            }
            
            console.log("Saving IO configuration:", ioConfig);
            
            // Send configuration to server
            fetch('/ioconfig', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(ioConfig)
            })
            .then(response => response.json())
            .then(data => {
                const status = document.getElementById('io-config-status');
                status.style.display = 'block';
                
                if (data.success) {
                    status.style.backgroundColor = 'var(--success-color)';
                    status.style.color = 'white';
                    if (data.changed) {
                        status.textContent = 'IO Configuration saved successfully!';
                    } else {
                        status.textContent = 'No changes detected in IO Configuration.';
                    }
                    
                    // Hide the status message after 3 seconds
                    setTimeout(() => {
                        status.style.display = 'none';
                    }, 3000);
                } else {
                    status.style.backgroundColor = 'var(--error-color)';
                    status.style.color = 'white';
                    status.textContent = 'Failed to save IO Configuration. Please try again.';
                }
            })
            .catch(error => {
                console.error('Error saving IO configuration:', error);
                const status = document.getElementById('io-config-status');
                status.style.display = 'block';
                status.style.backgroundColor = 'var(--error-color)';
                status.style.color = 'white';
                status.textContent = 'Error saving IO Configuration: ' + error.message;
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

        function toggleOutput(index, currentState) {
            const newState = currentState ? 0 : 1;
            fetch('/setoutput', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `output=${index}&state=${newState}`
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                // Update will happen on next status refresh
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Failed to toggle output');
            });
        }
        
        function updateUI() {
            // Update IO status and client status
            updateIOStatus();
            updateClientStatus();
        }
        
        // Set up regular polling for status updates
        setInterval(updateUI, 2000);
    </script>
</body>
</html>
)=====";
    webServer.send(200, "text/html", WEBPAGE_HTML);
}

void handleGetConfig() {
    // Add a brief delay to ensure all internal states are updated
    // This helps with the first request after server initialization
    delay(5);
    
    StaticJsonDocument<768> doc;  
    char ipStr[16], gwStr[16], subStr[16], currentIpStr[16];
    
    doc["dhcp"] = config.dhcpEnabled;
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
    
    // Add Modbus client information
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

void handleSetOutput() {
    if (!webServer.hasArg("output") || !webServer.hasArg("state")) {
        webServer.send(400, "text/plain", "Missing output or state parameter");
        return;
    }

    int output = webServer.arg("output").toInt();
    int state = webServer.arg("state").toInt();

    // Validate output number
    if (output < 0 || output >= sizeof(DIGITAL_OUTPUTS)/sizeof(DIGITAL_OUTPUTS[0])) {
        webServer.send(400, "text/plain", "Invalid output number");
        return;
    }

    // Set the output state
    digitalWrite(DIGITAL_OUTPUTS[output], state ? HIGH : LOW);
    
    // Update coil state for all connected clients
    for (int i = 0; i < MAX_MODBUS_CLIENTS; i++) {
        if (modbusClients[i].connected) {
            modbusClients[i].server.coilWrite(output, state);
        }
    }

    webServer.send(200, "text/plain", "OK");
}

void updateIOForClient(int clientIndex) {
    // Update Modbus registers with current IO state
    
    // Update digital inputs - account for invert configuration
    for (int i = 0; i < sizeof(DIGITAL_INPUTS)/sizeof(DIGITAL_INPUTS[0]); i++) {
        uint16_t value = digitalRead(DIGITAL_INPUTS[i]);
        
        // Apply inversion if configured
        if (config.diInvert[i]) {
            value = !value;
        }
        
        modbusClients[clientIndex].server.inputRegisterWrite(i, value);
    }
    
    // Update digital outputs - account for invert configuration
    for (int i = 0; i < sizeof(DIGITAL_OUTPUTS)/sizeof(DIGITAL_OUTPUTS[0]); i++) {
        uint16_t value = digitalRead(DIGITAL_OUTPUTS[i]);
        
        // Apply inversion if configured
        if (config.doInvert[i]) {
            value = !value;
        }
        
        modbusClients[clientIndex].server.holdingRegisterWrite(i, value);
    }
    
    // Update analog inputs, using either raw values or millivolts
    for (int i = 0; i < sizeof(ANALOG_INPUTS)/sizeof(ANALOG_INPUTS[0]); i++) {
        uint32_t rawValue = analogRead(ANALOG_INPUTS[i]);
        uint16_t valueToWrite;
        
        if (config.aiRawFormat[i]) {
            // Use RAW format (0-4095)
            valueToWrite = rawValue;
        } else {
            // Convert to millivolts: (raw * 3300) / 4095
            valueToWrite = (rawValue * 3300UL) / 4095UL;
        }
        
        modbusClients[clientIndex].server.inputRegisterWrite(100 + i, valueToWrite);
    }
}

void handleGetIOStatus() {
    // Add a brief delay to ensure all internal states are updated
    // This helps with the first request after server initialization
    delay(5);
    
    char jsonBuffer[1024];  // Increased from 512 to 1024
    StaticJsonDocument<1024> doc;  // Increased from 512 to 1024

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
    for (int i = 0; i < sizeof(DIGITAL_INPUTS)/sizeof(DIGITAL_INPUTS[0]); i++) {
        bool value = digitalRead(DIGITAL_INPUTS[i]);
        
        // Apply inversion if configured
        if (config.diInvert[i]) {
            value = !value;
        }
        
        di.add(value);
    }

    // Digital outputs - account for inversion
    JsonArray do_ = doc.createNestedArray("do");
    for (int i = 0; i < sizeof(DIGITAL_OUTPUTS)/sizeof(DIGITAL_OUTPUTS[0]); i++) {
        bool value = digitalRead(DIGITAL_OUTPUTS[i]);
        
        // Apply inversion if configured
        if (config.doInvert[i]) {
            value = !value;
        }
        
        do_.add(value);
    }

    // Analog inputs - use either RAW or millivolts format
    JsonArray ai = doc.createNestedArray("ai");
    for (int i = 0; i < sizeof(ANALOG_INPUTS)/sizeof(ANALOG_INPUTS[0]); i++) {
        uint32_t rawValue = analogRead(ANALOG_INPUTS[i]);
        uint32_t valueToShow;
        
        if (config.aiRawFormat[i]) {
            // Use RAW format (0-4095)
            valueToShow = rawValue;
        } else {
            // Convert to millivolts: (raw * 3300) / 4095
            valueToShow = (rawValue * 3300UL) / 4095UL;
        }
        
        ai.add(valueToShow);
    }

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
    
    for (int i = 0; i < sizeof(DIGITAL_INPUTS)/sizeof(DIGITAL_INPUTS[0]); i++) {
        diPullup.add(config.diPullup[i]);
        diInvert.add(config.diInvert[i]);
    }
    
    // Add digital output configuration
    JsonArray doInvert = doc.createNestedArray("do_invert");
    
    for (int i = 0; i < sizeof(DIGITAL_OUTPUTS)/sizeof(DIGITAL_OUTPUTS[0]); i++) {
        doInvert.add(config.doInvert[i]);
    }
    
    // Add analog input configuration
    JsonArray aiPulldown = doc.createNestedArray("ai_pulldown");
    JsonArray aiRawFormat = doc.createNestedArray("ai_raw_format");
    
    for (int i = 0; i < sizeof(ANALOG_INPUTS)/sizeof(ANALOG_INPUTS[0]); i++) {
        aiPulldown.add(config.aiPulldown[i]);
        aiRawFormat.add(config.aiRawFormat[i]);
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
    
    Serial.println("Updating digital output configuration");
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
    
    Serial.println("Updating analog input configuration");
    // Update analog input pulldown configuration
    if (doc.containsKey("ai_pulldown") && doc["ai_pulldown"].is<JsonArray>()) {
        JsonArray aiPulldown = doc["ai_pulldown"].as<JsonArray>();
        int index = 0;
        for (JsonVariant value : aiPulldown) {
            if (index < sizeof(ANALOG_INPUTS)/sizeof(ANALOG_INPUTS[0])) {
                bool newValue = value.as<bool>();
                if (config.aiPulldown[index] != newValue) {
                    config.aiPulldown[index] = newValue;
                    changed = true;
                    // Apply pulldown setting immediately (assuming the hardware supports it)
                    if (newValue) {
                        // Enable pulldown - may need specific implementation for your hardware
                    } else {
                        // Disable pulldown
                    }
                }
                index++;
            }
        }
    }
    
    Serial.println("Updating analog input format configuration");
    // Update analog input format configuration
    if (doc.containsKey("ai_raw_format") && doc["ai_raw_format"].is<JsonArray>()) {
        JsonArray aiRawFormat = doc["ai_raw_format"].as<JsonArray>();
        int index = 0;
        for (JsonVariant value : aiRawFormat) {
            if (index < sizeof(ANALOG_INPUTS)/sizeof(ANALOG_INPUTS[0])) {
                bool newValue = value.as<bool>();
                if (config.aiRawFormat[index] != newValue) {
                    config.aiRawFormat[index] = newValue;
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