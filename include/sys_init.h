#pragma once

#include <Arduino.h>
#include <SPI.h>
#include <W5500lwIP.h>
#include <WebServer.h>
#include <ArduinoModbus.h>
#include <ArduinoJson.h>
#include <LittleFS.h>

// Pin Definitions
#define PIN_ETH_MISO 16
#define PIN_ETH_CS 17
#define PIN_ETH_SCK 18
#define PIN_ETH_MOSI 19
#define PIN_ETH_RST 20
#define PIN_ETH_IRQ 21
#define PIN_EXT_LED 22

// Constants
#define CONFIG_FILE "/config.json"
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

struct IOStatus {
    bool dIn[8];
    bool dOut[8];
    uint16_t aIn[3];
};

IOStatus ioStatus;

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
void handleRoot();
void handleCSS();
void handleJS();
void handleFavicon();
void handleLogo();
void handleGetConfig();
void handleSetConfig();
void handleSetOutput();
void updateIOForClient(int clientIndex);
void handleGetIOStatus();
void handleGetIOConfig();
void handleSetIOConfig();