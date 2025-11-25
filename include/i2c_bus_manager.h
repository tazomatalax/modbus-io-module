#pragma once

#include <Arduino.h>
#include <Wire.h>
#include <cstring>

/**
 * I2C Bus Manager - Advanced Multi-Bus, Multi-Pin I2C Polling System
 * 
 * Features:
 * - Automatically discovers active I2C buses (I2C0, I2C1) and pin pairs
 * - Groups sensors by bus and pin pair for sequential polling
 * - Handles atomic pin switching before each transaction
 * - Prevents conflicts through per-bus, per-pin sequencing
 * - Supports both hardware I2C buses on RP2040
 * - Dynamically configured from sensors.json
 * 
 * Usage:
 * 1. Call i2cBusManager.initialize() in setup() after loading sensor config
 * 2. Call i2cBusManager.discoverActiveBuses() to map all configured sensors
 * 3. In main loop, call i2cBusManager.processNextSensor() for sequential polling
 * 4. Call i2cBusManager.performAtomicRead() for actual I2C transactions
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * I2C bus identifier on RP2040
 * I2C0: GP0/GP1, GP4/GP5, GP8/GP9, GP12/GP13, GP16/GP17, GP20/GP21
 * I2C1: GP2/GP3, GP6/GP7, GP10/GP11, GP14/GP15, GP18/GP19, GP22/GP23, GP26/GP27
 */
enum class I2CBusId : uint8_t {
    I2C0 = 0,
    I2C1 = 1,
    UNKNOWN = 255
};

/**
 * Represents a single pin pair (SDA, SCL) on an I2C bus
 */
struct I2CPinPair {
    int sda;
    int scl;
    I2CBusId bus;
    bool isActive;  // Set to true if at least one sensor uses this pair
    
    I2CPinPair() : sda(-1), scl(-1), bus(I2CBusId::UNKNOWN), isActive(false) {}
    
    I2CPinPair(int _sda, int _scl, I2CBusId _bus) 
        : sda(_sda), scl(_scl), bus(_bus), isActive(false) {}
    
    bool matches(int checkSda, int checkScl) const {
        return sda == checkSda && scl == checkScl;
    }
    
    bool isValid() const {
        return sda >= 0 && scl >= 0;
    }
};

/**
 * Represents a sensor grouped with its I2C pin pair
 */
struct I2CSensorNode {
    uint8_t sensorIndex;      // Index into configuredSensors array
    I2CPinPair pinPair;       // Which pin pair this sensor uses
    uint32_t lastPollMs;      // When this sensor was last polled
    bool pollNeeded;          // Set to true when polling interval has elapsed
};

/**
 * Result of an I2C transaction attempt
 */
enum class I2CTransactionResult : uint8_t {
    SUCCESS = 0,
    ERROR_PIN_SWITCH_FAILED = 1,
    ERROR_TRANSMISSION = 2,
    ERROR_NACK = 3,
    ERROR_TIMEOUT = 4,
    ERROR_READ_FAILED = 5,
    ERROR_SENSOR_NOT_CONFIGURED = 6
};

// ============================================================================
// PREDEFINED PIN PAIRS FOR RP2040
// ============================================================================

static const I2CPinPair RP2040_I2C_PIN_PAIRS[] = {
    // I2C0 pin pairs
    I2CPinPair(0, 1, I2CBusId::I2C0),
    I2CPinPair(4, 5, I2CBusId::I2C0),
    I2CPinPair(8, 9, I2CBusId::I2C0),
    I2CPinPair(12, 13, I2CBusId::I2C0),
    I2CPinPair(16, 17, I2CBusId::I2C0),
    I2CPinPair(20, 21, I2CBusId::I2C0),
    
    // I2C1 pin pairs
    I2CPinPair(2, 3, I2CBusId::I2C1),
    I2CPinPair(6, 7, I2CBusId::I2C1),
    I2CPinPair(10, 11, I2CBusId::I2C1),
    I2CPinPair(14, 15, I2CBusId::I2C1),
    I2CPinPair(18, 19, I2CBusId::I2C1),
    I2CPinPair(22, 23, I2CBusId::I2C1),
    I2CPinPair(26, 27, I2CBusId::I2C1),
};

static const uint8_t RP2040_I2C_PIN_PAIRS_COUNT = sizeof(RP2040_I2C_PIN_PAIRS) / sizeof(I2CPinPair);

// ============================================================================
// I2C BUS MANAGER CLASS
// ============================================================================

class I2CBusManager {
private:
    // Current I2C bus state
    int currentSdaPin;
    int currentSclPin;
    I2CBusId currentBusId;
    
    // Sensor nodes for sequential polling
    I2CSensorNode sensorNodes[10];  // Max 10 sensors (matches MAX_SENSORS)
    uint8_t sensorNodeCount;
    uint8_t nextSensorToPolIndex;   // Round-robin poll index
    
    // Active pin pairs discovered from sensor configuration
    I2CPinPair activePinPairs[13];  // Max pin pairs on RP2040
    uint8_t activePinPairCount;
    
    // Track bus state
    bool isInitialized;
    bool busDiscoveryComplete;
    
    // For debugging
    uint32_t lastDiscoveryMs;
    uint32_t transactionCount;
    uint32_t transactionErrors;
    
public:
    I2CBusManager() 
        : currentSdaPin(-1), currentSclPin(-1), currentBusId(I2CBusId::UNKNOWN),
          sensorNodeCount(0), nextSensorToPolIndex(0), activePinPairCount(0),
          isInitialized(false), busDiscoveryComplete(false),
          lastDiscoveryMs(0), transactionCount(0), transactionErrors(0) {}
    
    /**
     * Initialize the I2C bus manager
     * Call this in setup() after I2C is available but before sensor operations
     */
    void initialize() {
        isInitialized = true;
        currentSdaPin = -1;
        currentSclPin = -1;
        currentBusId = I2CBusId::UNKNOWN;
        nextSensorToPolIndex = 0;
        Serial.println("[I2C Manager] Initialized");
    }
    
    /**
     * Discover active I2C buses based on configured sensors
     * Should be called after loadSensorConfig() to map all active pin pairs
     * 
     * This function:
     * 1. Scans all configured sensors
     * 2. Groups them by I2C bus and pin pair
     * 3. Builds round-robin polling sequence
     */
    void discoverActiveBuses(const struct SensorConfig* sensors, uint8_t sensorCount) {
        sensorNodeCount = 0;
        activePinPairCount = 0;
        nextSensorToPolIndex = 0;
        memset(sensorNodes, 0, sizeof(sensorNodes));
        memset(activePinPairs, 0, sizeof(activePinPairs));
        
        Serial.println("[I2C Manager] Starting bus discovery...");
        
        // Iterate through all configured sensors
        for (uint8_t i = 0; i < sensorCount; i++) {
            if (!sensors[i].enabled) continue;
            
            // Only process I2C protocol sensors
            if (strcmp(sensors[i].protocol, "I2C") != 0) continue;
            
            int sda = sensors[i].sdaPin;
            int scl = sensors[i].sclPin;
            
            // Skip if pins not configured
            if (sda < 0 || scl < 0) {
                Serial.printf("  [WARN] Sensor %d (%s) has incomplete I2C pins: SDA=%d SCL=%d\n", 
                            i, sensors[i].name, sda, scl);
                continue;
            }
            
            // Find or create pin pair entry
            int pinPairIndex = findOrCreatePinPair(sda, scl);
            if (pinPairIndex < 0) {
                Serial.printf("  [ERR] Could not add pin pair SDA=%d SCL=%d (too many pairs)\n", sda, scl);
                continue;
            }
            
            // Create sensor node
            if (sensorNodeCount >= 10) {
                Serial.printf("  [ERR] Too many sensors (max 10)\n");
                break;
            }
            
            sensorNodes[sensorNodeCount].sensorIndex = i;
            sensorNodes[sensorNodeCount].pinPair = activePinPairs[pinPairIndex];
            sensorNodes[sensorNodeCount].lastPollMs = 0;
            sensorNodes[sensorNodeCount].pollNeeded = true;
            
            Serial.printf("  [OK] Sensor %d (%s): Bus=%s, SDA=%d SCL=%d, Addr=0x%02X, Interval=%ldms\n",
                        i, sensors[i].name,
                        sensors[i].sdaPin <= 3 || sensors[i].sdaPin == 16 || sensors[i].sdaPin == 20 ? 
                            (sensors[i].sdaPin <= 1 ? "I2C0" : "I2C1") : "I2C0",
                        sda, scl,
                        sensors[i].i2cAddress,
                        sensors[i].updateInterval);
            
            sensorNodeCount++;
        }
        
        Serial.printf("[I2C Manager] Discovery complete: %d sensors on %d active pin pairs\n", 
                    sensorNodeCount, activePinPairCount);
        busDiscoveryComplete = true;
        lastDiscoveryMs = millis();
    }
    
    /**
     * Determine I2C bus ID from pin pair
     * Returns I2CBusId::I2C0, I2CBusId::I2C1, or UNKNOWN
     */
    I2CBusId getBusIdForPins(int sda, int scl) const {
        // Search predefined pin pairs
        for (uint8_t i = 0; i < RP2040_I2C_PIN_PAIRS_COUNT; i++) {
            if (RP2040_I2C_PIN_PAIRS[i].matches(sda, scl)) {
                return RP2040_I2C_PIN_PAIRS[i].bus;
            }
        }
        return I2CBusId::UNKNOWN;
    }
    
    /**
     * Check if a pin pair is reserved (Ethernet, LED, etc.)
     */
    bool isPinReserved(int pin) const {
        // Reserved pins for W5500 Ethernet and system use (GP16-21, GP22 for LED)
        const uint8_t reserved[] = {16, 17, 18, 19, 20, 21, 22};
        for (uint8_t i = 0; i < 7; i++) {
            if (reserved[i] == pin) return true;
        }
        return false;
    }
    
    /**
     * Atomically switch to a new I2C pin pair and perform a transaction
     * This is the core function for conflict-free I2C operations
     * 
     * @param sda New SDA pin (-1 to skip switch)
     * @param scl New SCL pin (-1 to skip switch)
     * @param transactionCallback Function to execute after pin switch
     * @return Result of transaction
     */
    I2CTransactionResult performAtomicTransaction(
        int sda, int scl,
        std::function<I2CTransactionResult()> transactionCallback) {
        
        // Only switch pins if necessary
        if (sda >= 0 && scl >= 0 && (currentSdaPin != sda || currentSclPin != scl)) {
            if (!switchI2CPins(sda, scl)) {
                transactionErrors++;
                return I2CTransactionResult::ERROR_PIN_SWITCH_FAILED;
            }
        }
        
        // Perform the actual transaction
        I2CTransactionResult result = transactionCallback();
        
        if (result != I2CTransactionResult::SUCCESS) {
            transactionErrors++;
        }
        transactionCount++;
        
        return result;
    }
    
    /**
     * Get the next sensor that needs polling (round-robin)
     * Returns sensor index, or 255 if no sensor needs polling
     */
    uint8_t getNextSensorToPoll(const struct SensorConfig* sensors) {
        if (sensorNodeCount == 0) return 255;
        
        uint32_t now = millis();
        uint8_t attempts = 0;
        
        while (attempts < sensorNodeCount) {
            I2CSensorNode& node = sensorNodes[nextSensorToPolIndex];
            const SensorConfig& sensor = sensors[node.sensorIndex];
            
            // Check if polling interval has elapsed
            if (now - node.lastPollMs >= sensor.updateInterval) {
                node.pollNeeded = true;
            }
            
            if (node.pollNeeded) {
                node.lastPollMs = now;
                node.pollNeeded = false;
                
                uint8_t sensorIdx = node.sensorIndex;
                nextSensorToPolIndex = (nextSensorToPolIndex + 1) % sensorNodeCount;
                
                return sensorIdx;
            }
            
            // Move to next sensor
            nextSensorToPolIndex = (nextSensorToPolIndex + 1) % sensorNodeCount;
            attempts++;
        }
        
        return 255;  // No sensor needs polling yet
    }
    
    /**
     * Get I2C pin pair for a sensor
     */
    bool getSensorPinPair(uint8_t sensorIndex, int& outSda, int& outScl) const {
        for (uint8_t i = 0; i < sensorNodeCount; i++) {
            if (sensorNodes[i].sensorIndex == sensorIndex) {
                outSda = sensorNodes[i].pinPair.sda;
                outScl = sensorNodes[i].pinPair.scl;
                return true;
            }
        }
        return false;
    }
    
    /**
     * Get all sensors on a specific pin pair
     */
    uint8_t getSensorsOnPinPair(int sda, int scl, uint8_t outSensorIndices[], uint8_t maxCount) const {
        uint8_t count = 0;
        for (uint8_t i = 0; i < sensorNodeCount && count < maxCount; i++) {
            if (sensorNodes[i].pinPair.matches(sda, scl)) {
                outSensorIndices[count++] = sensorNodes[i].sensorIndex;
            }
        }
        return count;
    }
    
    /**
     * Print diagnostic information about discovered buses
     */
    void printBusDiagnostics() const {
        Serial.println("\n=== I2C Bus Manager Diagnostics ===");
        Serial.printf("Status: %s\n", isInitialized ? "Initialized" : "Not initialized");
        Serial.printf("Discovery Complete: %s\n", busDiscoveryComplete ? "Yes" : "No");
        Serial.printf("Active Sensors: %d\n", sensorNodeCount);
        Serial.printf("Active Pin Pairs: %d\n", activePinPairCount);
        Serial.printf("Current Pin: SDA=%d SCL=%d\n", currentSdaPin, currentSclPin);
        Serial.printf("Transactions: %lu (Errors: %lu)\n", transactionCount, transactionErrors);
        
        Serial.println("\nActive Pin Pairs:");
        for (uint8_t i = 0; i < activePinPairCount; i++) {
            Serial.printf("  Pair %d: SDA=%d SCL=%d Bus=%s\n",
                        i,
                        activePinPairs[i].sda,
                        activePinPairs[i].scl,
                        activePinPairs[i].bus == I2CBusId::I2C0 ? "I2C0" : "I2C1");
        }
        
        Serial.println("\nSensor Polling Sequence:");
        for (uint8_t i = 0; i < sensorNodeCount; i++) {
            Serial.printf("  Sensor %d: Index=%d SDA=%d SCL=%d LastPoll=%ldms\n",
                        i,
                        sensorNodes[i].sensorIndex,
                        sensorNodes[i].pinPair.sda,
                        sensorNodes[i].pinPair.scl,
                        sensorNodes[i].lastPollMs);
        }
        Serial.println("===================================\n");
    }
    
private:
    /**
     * Switch to a new I2C pin pair
     * Handles Wire.end() and Wire.begin() with new pins
     */
    bool switchI2CPins(int sda, int scl) {
        // Don't switch if already on correct pins
        if (currentSdaPin == sda && currentSclPin == scl) {
            return true;
        }
        
        Serial.printf("[I2C Manager] Switching pins: SDA %d->%d, SCL %d->%d\n",
                    currentSdaPin, sda, currentSclPin, scl);
        
        // End current I2C bus
        if (currentSdaPin >= 0 || currentSclPin >= 0) {
            Wire.end();
            delayMicroseconds(100);  // Small delay for pin release
        }
        
        // Configure new pins
        Wire.setSDA(sda);
        Wire.setSCL(scl);
        
        // Initialize I2C bus on new pins
        Wire.begin();
        // Note: Wire.begin() returns void on RP2040, so no error checking available
        
        // Small delay for bus stabilization
        delay(10);
        
        // Update current state
        currentSdaPin = sda;
        currentSclPin = scl;
        currentBusId = getBusIdForPins(sda, scl);
        
        return true;
    }
    
    /**
     * Find or create a pin pair entry in the active list
     * Returns index into activePinPairs, or -1 if full
     */
    int findOrCreatePinPair(int sda, int scl) {
        // Look for existing entry
        for (uint8_t i = 0; i < activePinPairCount; i++) {
            if (activePinPairs[i].matches(sda, scl)) {
                return i;
            }
        }
        
        // Add new entry if space available
        if (activePinPairCount >= 13) {
            return -1;
        }
        
        I2CBusId busId = getBusIdForPins(sda, scl);
        activePinPairs[activePinPairCount] = I2CPinPair(sda, scl, busId);
        activePinPairs[activePinPairCount].isActive = true;
        
        return activePinPairCount++;
    }
};

// Global instance
extern I2CBusManager i2cBusManager;
