/**
 * @file vibration.h
 * @brief Vibration analysis module declarations for LIS3DH accelerometer
 * 
 * High-frequency vibration analysis running on Core 1 of RP2040.
 * Samples LIS3DH accelerometers at 500 Hz and computes vibration statistics.
 * 
 * Key metrics (ISO 10816-3 based):
 * - RMS: Overall vibration energy (general machine condition)
 * - Peak: Maximum amplitude (impacts/loose components)
 * - Crest Factor: Peak/RMS ratio (bearing defects indicator)
 * - Velocity RMS: Industry standard for machine condition (mm/s)
 */

#ifndef VIBRATION_H
#define VIBRATION_H

#include <Arduino.h>
#include "sys_init.h"

// =============================================================================
// Global vibration state (defined in vibration.cpp, declared in sys_init.h)
// =============================================================================
// extern VibrationSensorState vibrationSensors[MAX_VIBRATION_SENSORS];
// extern int numVibrationSensors;
// extern volatile bool vibrationDataReady;
// extern volatile bool vibrationEnabled;

// =============================================================================
// Public API Functions
// =============================================================================

/**
 * @brief Initialize the vibration analysis module
 * Sets up mutex for I2C synchronization between cores.
 * Core 1 will start automatically via setup1()/loop1().
 */
void initVibrationModule();

/**
 * @brief Get vibration statistics for a sensor by I2C address
 * @param i2cAddress The I2C address of the LIS3DH sensor
 * @return Pointer to VibrationStats, or nullptr if not found/not ready
 */
VibrationStats* getVibrationStats(uint8_t i2cAddress);

/**
 * @brief Get vibration statistics by sensor index (0 or 1)
 * @param index The vibration sensor index
 * @return Pointer to VibrationStats, or nullptr if out of range/not ready
 */
VibrationStats* getVibrationStatsByIndex(int index);

/**
 * @brief Acquire I2C mutex for Core 0 operations
 * Call before any I2C operation on Core 0 to prevent conflicts with Core 1
 */
extern "C" void vibration_acquire_i2c_mutex();

/**
 * @brief Release I2C mutex after Core 0 operations
 */
extern "C" void vibration_release_i2c_mutex();

#endif // VIBRATION_H
