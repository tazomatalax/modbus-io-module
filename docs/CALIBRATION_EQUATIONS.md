# Sensor Calibration Mathematical Equations Guide

This document outlines the mathematical symbols, functions, and operators supported in sensor calibration equations for the Modbus IO Module.

## Overview

The calibration system supports both simple linear calibration (offset + multiplier) and complex mathematical expressions. All expressions use `x` as the variable representing the raw sensor value.

## Basic Arithmetic Operators

| Symbol | Operation | Example | Description |
|--------|-----------|---------|-------------|
| `+` | Addition | `x + 5` | Add 5 to raw value |
| `-` | Subtraction | `x - 2.5` | Subtract 2.5 from raw value |
| `*` | Multiplication | `x * 3.14` | Multiply raw value by 3.14 |
| `/` | Division | `x / 100` | Divide raw value by 100 |
| `^` | Exponentiation | `x^2` | Square the raw value |

## Mathematical Functions

| Function | Syntax | Example | Description |
|----------|--------|---------|-------------|
| Square Root | `sqrt(x)` | `sqrt(x)` | Square root of raw value |
| Sine | `sin(x)` | `sin(x * 3.14159 / 180)` | Sine (input in radians) |
| Cosine | `cos(x)` | `cos(x * 3.14159 / 180)` | Cosine (input in radians) |
| Tangent | `tan(x)` | `tan(x)` | Tangent (input in radians) |
| Natural Log | `ln(x)` | `ln(x)` | Natural logarithm (base e) |
| Log Base 10 | `log(x)` | `log(x)` | Common logarithm (base 10) |
| Exponential | `exp(x)` | `exp(x)` | e raised to the power of x |

## Common Calibration Examples

### Linear Calibration
```
2.5 * x + 1.3          # Multiply by 2.5 and add offset of 1.3
x / 100                 # Convert percentage to decimal
x * 0.001 + 4.0         # Convert millivolts to volts with 4V offset
```

### Temperature Conversions
```
x * 9/5 + 32            # Celsius to Fahrenheit
(x - 32) * 5/9          # Fahrenheit to Celsius
x + 273.15              # Celsius to Kelvin
```

### Polynomial Calibration
```
2*x^2 + 3*x + 1         # Quadratic equation
0.5*x^3 - 2*x^2 + x     # Cubic polynomial
```

### Logarithmic Calibration
```
log(x)                  # Base 10 logarithm
ln(x) * 2.5             # Natural log with scaling
exp(x / 100)            # Exponential scaling
```

### Complex Sensor Calibrations
```
sqrt(x^2 + 25)          # Distance calculation
sin(x * 3.14159 / 180)  # Convert degrees to radians and take sine
x / 1024 * 3.3          # ADC to voltage (12-bit ADC, 3.3V reference)
```

## Multi-Output Sensor Calibration

For sensors that provide multiple values (like SHT30 temperature + humidity), each output can have its own calibration:

- **Primary Output (A)**: Uses main calibration settings
- **Secondary Output (B)**: Uses calibrationExpressionB or calibrationOffsetB/calibrationSlopeB
- **Tertiary Output (C)**: Uses calibrationExpressionC or calibrationOffsetC/calibrationSlopeC

### Example Multi-Output Configuration
```json
{
  "name": "SHT30_Sensor",
  "type": "SHT30", 
  "calibration": {
    "expression": "x * 1.02 + 0.5",     // Temperature calibration
    "offset": 0,
    "scale": 1
  },
  "calibrationExpressionB": "x * 0.98 - 2.0",  // Humidity calibration
  "calibrationExpressionC": ""                   // No tertiary output
}
```

## Variable Names

| Variable | Description |
|----------|-------------|
| `x` or `X` | Raw sensor value (both uppercase and lowercase supported) |

## Limitations and Notes

1. **Order of Operations**: Basic order of operations is supported (^, *, /, +, -)
2. **Parentheses**: Limited support for complex nested parentheses
3. **Precision**: Results are calculated as floating-point numbers with 6 decimal places
4. **Fallback**: If expression parsing fails, the system falls back to linear calibration (offset + slope)
5. **Case Sensitivity**: Function names are case-insensitive (`sin`, `SIN`, `Sin` all work)

## Testing Calibration Equations

You can test calibration equations using the sensor configuration interface:

1. Set up a sensor with your calibration equation
2. Use the "Poll Now" feature to test with real sensor data
3. Check the sensor dataflow display to verify raw vs. calibrated values
4. Monitor Modbus registers to confirm proper scaling

## Error Handling

- Invalid expressions fall back to linear calibration
- Division by zero returns the raw value
- Invalid function arguments return 0
- Parsing errors are logged to Serial output for debugging

## Future Enhancements

Planned additions include:
- More trigonometric functions (asin, acos, atan)
- Hyperbolic functions (sinh, cosh, tanh)
- Advanced polynomial parsing
- Custom user-defined functions
- Multi-variable expressions for sensor fusion