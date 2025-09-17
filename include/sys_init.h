#pragma once

#include <Arduino.h>
#include <SPI.h>
#include <EthernetENC.h>
#include <ArduinoModbus.h>
#include <ArduinoJson.h>
#include <LittleFS.h>

#define WDT_TIMEOUT 5000

#define PIN_ETH_MISO 16
#define PIN_ETH_CS 17
#define PIN_ETH_SCK 18
#define PIN_ETH_MOSI 19
#define PIN_ETH_RST 20
#define PIN_ETH_IRQ 21
#define PIN_EXT_LED 22

#define I2C_SDA_PIN 4
#define I2C_SCL_PIN 5

extern const uint8_t I2C_PIN_PAIRS[][2];
#define NUM_I2C_PAIRS 3

extern const uint8_t AVAILABLE_FLEXIBLE_PINS[];
#define NUM_FLEXIBLE_PINS 17

extern const uint8_t ADC_PINS[];
#define NUM_ADC_PINS 3

struct PinAllocation {
    uint8_t pin;
    char protocol[16];
    char sensorName[32];
    bool allocated;
};

#define CONFIG_FILE "/config.json"
#define SENSORS_FILE "/sensors.json"
#define CONFIG_VERSION 6
#define HOSTNAME_MAX_LENGTH 32
#define MAX_MODBUS_CLIENTS 4
#define MAX_SENSORS 10

#define DATA_FORMAT_UINT8     0
#define DATA_FORMAT_UINT16_BE 1
#define DATA_FORMAT_UINT16_LE 2
#define DATA_FORMAT_UINT32_BE 3
#define DATA_FORMAT_UINT32_LE 4
#define DATA_FORMAT_FLOAT32   5
#define DATA_FORMAT_INT16_BE  6

extern bool core0setupComplete;

const uint8_t DIGITAL_INPUTS[] = {0, 1, 2, 3, 4, 5, 6, 7};
const uint8_t DIGITAL_OUTPUTS[] = {8, 9, 10, 11, 12, 13, 14, 15};
const uint8_t ANALOG_INPUTS[] = {26, 27, 28};

struct Config {
    uint8_t version;
    uint8_t ip[4];
    uint8_t subnet[4];
    uint8_t gateway[4];
    bool dhcpEnabled;
    uint16_t modbusPort;
    char hostname[HOSTNAME_MAX_LENGTH];
    bool diInvert[8];
    bool diPullup[8];
    bool diLatch[8];
    bool doInvert[8];
    bool doInitialState[8];
};

struct IOStatus {
    bool dInRaw[8];
    bool dIn[8];  // Used by the main code
    bool dInLatched[8];
    bool dOut[8];
    uint16_t aIn[3];
    float temperature;
    float humidity;
    float pressure;
    unsigned long lastUpdate;
    struct {
        float ph;
        float dissolvedOxygen;
        float conductivity;
        float temperature;
        bool commandPending;
        char lastCommand[32];
        char lastResponse[64];
    } ezo;
    struct {
        bool ph_enabled;
        bool do_enabled;
        bool ec_enabled;
        bool rtd_enabled;
    } sensors;
};

struct SensorConfig {
    bool enabled;
    char name[32];
    char type[16];
    uint8_t i2cAddress;
    uint16_t modbusRegister;
    uint16_t updateInterval;
    char calibrationData[64];
    char response[64];
    bool cmdPending;
    unsigned long lastCmdSent;
};

struct ModbusClientInfo {
    bool connected;
    EthernetClient client;
    ModbusTCPServer server;
    unsigned long lastActivity;
    IPAddress clientIP;
    unsigned long connectionTime;
};

// Default configuration
const Config DEFAULT_CONFIG = {
    .version = CONFIG_VERSION,
    .ip = {192, 168, 1, 10},
    .subnet = {255, 255, 255, 0},
    .gateway = {192, 168, 1, 1},
    .dhcpEnabled = true,
    .modbusPort = 502,
    .hostname = "modbus-io-module",
    .diInvert = {false, false, false, false, false, false, false, false},
    .diPullup = {true, true, true, true, true, true, true, true},
    .diLatch = {false, false, false, false, false, false, false, false},
    .doInvert = {false, false, false, false, false, false, false, false},
    .doInitialState = {false, false, false, false, false, false, false, false}
};

void initializePins();
void loadConfig();
void saveConfig();
void loadSensorConfig();
void saveSensorConfig();
void updateIOpins();
void resetLatches();
void initializeEzoSensors();
void handleEzoSensors();

extern Config config;
extern IOStatus ioStatus;
extern SensorConfig configuredSensors[MAX_SENSORS];
extern ModbusClientInfo modbusClients[MAX_MODBUS_CLIENTS];
extern int numConfiguredSensors;
extern int connectedClients;
extern bool systemInitialized;
extern unsigned long lastSensorRead;
extern unsigned long lastEzoCommand;