#pragma once

#include <Arduino.h>
#include <SPI.h>
#include <W5500lwIP.h>
#include <WebServer.h>
#include <ArduinoModbus.h>
#include <ArduinoJson.h>
#include <LittleFS.h>

// Watchdog timer
#define WDT_TIMEOUT 5000

// Pin Definitions
#define PIN_ETH_MISO 16
#define PIN_ETH_CS 17
#define PIN_ETH_SCK 18
#define PIN_ETH_MOSI 19
#define PIN_ETH_RST 20
#define PIN_ETH_IRQ 21
#define PIN_EXT_LED 22

// Add I2C Pin Definitions
#define I2C_SDA_PIN 24
#define I2C_SCL_PIN 25

// Constants
#define CONFIG_FILE "/config.json"
#define SENSORS_FILE "/sensors.json"
#define CONFIG_VERSION 6  // Increment this when config structure changes
#define HOSTNAME_MAX_LENGTH 32
#define MAX_MODBUS_CLIENTS 4  // Maximum number of concurrent Modbus clients
#define MAX_SENSORS 10

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
    bool diLatch[8];          // Enable latching for digital inputs (stay ON until read)
    bool doInvert[8];         // Invert logic for digital outputs
    bool doInitialState[8];   // Initial state for digital outputs (true = ON, false = OFF)
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
    {false, false, false, false, false, false, false, false},  // diLatch (no latching)
    {false, false, false, false, false, false, false, false},  // doInvert (no inversion)
    {false, false, false, false, false, false, false, false},  // doInitialState (all OFF)
};

struct SensorConfig {
    bool enabled;
    char name[32];
    char type[16]; // "BME280", "EZO_PH", etc.
    char sensor_type[16]; // New: "I2C", "UART", "Digital", "Analog"
    char formula[64];     // New: mathematical conversion formula
    char units[16];       // New: engineering units for display
    uint8_t i2cAddress;
    uint16_t modbusRegister;
    // EZO sensor state tracking
    bool cmdPending;
    unsigned long lastCmdSent;
    char response[32];
};

struct IOStatus {
    bool dIn[8];          // Current state of digital inputs (including latching behavior if enabled)
    bool dInRaw[8];       // Actual physical state of digital inputs (without latching)
    bool dInLatched[8];   // Tracks if an input has been latched (true = latched)
    bool dOut[8];
    uint16_t aIn[3];
    
    // I2C Sensor Data - Active sensor fields
    float temperature;    // Temperature reading from I2C sensor (e.g., BME280)
    float humidity;       // Humidity reading from I2C sensor (e.g., BME280) 
    float pressure;       // Pressure reading from I2C sensor (e.g., BME280)
    // Add additional sensor fields as needed for your specific I2C sensors
};

IOStatus ioStatus;

extern SensorConfig configuredSensors[MAX_SENSORS];
extern int numConfiguredSensors;

// Ethernet and Server instances
Wiznet5500lwIP eth(PIN_ETH_CS, SPI, PIN_ETH_IRQ);
WiFiServer modbusServer; 
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

// Function declarations
void loadConfig();
void saveConfig();
void setPinModes();
void setupEthernet();
void setupModbus();
void setupWebServer();
void updateIOpins();
void updateIOForClient(int clientIndex);
void handleRoot();
void handleCSS();
void handleJS();
void handleFavicon();
void handleLogo();
void handleGetConfig();
void handleSetConfig();
void handleSetOutput();
void handleGetIOStatus();
void handleGetIOConfig();
void handleSetIOConfig();
void resetLatches();
void handleResetLatches();
void handleResetSingleLatch();
void handleGetSensorConfig();
void handleSetSensorConfig();
void loadSensorConfig();
void saveSensorConfig();
void handleGetSensorConfig();
void handleSetSensorConfig();
void handleEzoSensors();
void initializeEzoSensors();
void handleSensorCommand();
void handleTerminalCommand();
float applyFormulaConversion(float rawValue, const char* formula);