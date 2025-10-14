/*
  Modbus IO Module Simulator
  - Serves the existing web UI from ../data
  - Implements REST endpoints: /config (GET/POST), /iostatus (GET), /ioconfig (GET/POST), /setoutput (POST), /reset-latches (POST), /reset-latch (POST), /sensors/config (GET/POST)
  - Simulates DI/DO/AI, latching, inversion, and simple sensor values
  - Optionally exposes a Modbus TCP server on the configured port
*/

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');

const app = express();
const HTTP_PORT = process.env.HTTP_PORT ? parseInt(process.env.HTTP_PORT, 10) : 8080;

// Serve UI from data folder
const webRoot = path.resolve(__dirname, '..', 'data');

app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Inject simulator-specific content into index.html (alerts + sim controls)
function injectSimulatorContent(html) {
  // Sim Controls panel HTML
  const simControlsPanel = `
    <div class="card" id="sim-controls-card" style="border: 2px solid #007acc; background: linear-gradient(145deg, #f8f9fa, #e9ecef);">
      <div class="card-header">
        <h2 style="color: #007acc;">🔧 Simulator Controls</h2>
        <p style="margin: 0; color: #666; font-size: 0.9em;">Control simulation modes and values (only visible in simulator)</p>
      </div>
      <div class="card-body">
        <div class="sim-controls-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          
          <!-- Sensor Controls -->
          <div class="sim-section">
            <h3>I2C Sensors</h3>
            <p style="font-size: 0.9em; color: #666; margin: 10px 0;">
              I2C sensor simulation is now controlled through the sensor configuration interface. 
              Add simulated sensors using the "Add Sensor" button and select simulated sensor types.
            </p>
          </div>
          
          <!-- Digital Input Controls -->
          <div class="sim-section">
            <h3>Digital Inputs</h3>
            <div class="sim-control-item">
              <label class="switch-label">
                <input type="checkbox" id="sim-di-auto" checked>
                <span class="switch-text">Auto Mode</span>
              </label>
            </div>
            <div id="sim-di-manual" style="display: none;">
              <div class="di-sim-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 10px 0;">
                <!-- DI checkboxes will be generated here -->
              </div>
              <button onclick="updateDigitalInputs()" class="action-button">Update DI</button>
            </div>
          </div>
          
          <!-- Analog Input Controls -->
          <div class="sim-section">
            <h3>Analog Inputs</h3>
            <div class="sim-control-item">
              <label class="switch-label">
                <input type="checkbox" id="sim-ai-auto" checked>
                <span class="switch-text">Auto Mode</span>
              </label>
            </div>
            <div id="sim-ai-manual" style="display: none;">
              <div class="form-group">
                <label for="sim-ai1">AI1 (mV)</label>
                <input type="number" id="sim-ai1" step="1" value="1650" min="0" max="3300">
              </div>
              <div class="form-group">
                <label for="sim-ai2">AI2 (mV)</label>
                <input type="number" id="sim-ai2" step="1" value="1650" min="0" max="3300">
              </div>
              <div class="form-group">
                <label for="sim-ai3">AI3 (mV)</label>
                <input type="number" id="sim-ai3" step="1" value="1650" min="0" max="3300">
              </div>
              <button onclick="updateAnalogInputs()" class="action-button">Update AI</button>
            </div>
          </div>
          
          <!-- Status Info -->
          <div class="sim-section">
            <h3>Simulation Status</h3>
            <div id="sim-status" style="font-family: monospace; font-size: 0.85em; color: #666;">
              Sensors: Auto<br>
              DI: Auto<br>
              AI: Auto
            </div>
          </div>
          
        </div>
      </div>
    </div>`;

  // JavaScript for sim controls
  const simControlsScript = `
<script>
// Simulator Controls JavaScript
(function() {
  function initSimControls() {
    // Generate DI checkboxes
    const diGrid = document.querySelector('#sim-di-manual .di-sim-grid');
    if (diGrid) {
      for (let i = 0; i < 8; i++) {
        const div = document.createElement('div');
        div.innerHTML = '<label class="switch-label"><input type="checkbox" id="sim-di' + (i+1) + '"><span class="switch-text">DI' + (i+1) + '</span></label>';
        diGrid.appendChild(div);
      }
    }
    
    // Load current simulation state
    fetch('/simulate/status').then(r => r.ok ? r.json() : null).then(status => {
      if (status) {
        // Set mode toggles for remaining controls
        document.getElementById('sim-di-auto').checked = (status.diMode === 'auto');
        document.getElementById('sim-ai-auto').checked = (status.aiMode === 'auto');
        
        // Set manual control values for remaining controls
        if (status.ai) {
          document.getElementById('sim-ai1').value = status.ai[0] || 0;
          document.getElementById('sim-ai2').value = status.ai[1] || 0;
          document.getElementById('sim-ai3').value = status.ai[2] || 0;
        }
        
        if (status.di) {
          for (let i = 0; i < 8; i++) {
            const checkbox = document.getElementById('sim-di' + (i+1));
            if (checkbox) checkbox.checked = status.di[i] || false;
          }
        }
        
        // Update UI visibility
        updateManualControlsVisibility();
        updateSimStatus();
      }
    }).catch(() => {});
    
    // Auto/Manual mode toggles for remaining controls
    document.getElementById('sim-di-auto').addEventListener('change', function() {
      updateManualControlsVisibility();
      updateSimStatus();
    });
    
    document.getElementById('sim-ai-auto').addEventListener('change', function() {
      updateManualControlsVisibility();
      updateSimStatus();
    });
  }
  
  function updateManualControlsVisibility() {
    document.getElementById('sim-di-manual').style.display = 
      document.getElementById('sim-di-auto').checked ? 'none' : 'block';
    document.getElementById('sim-ai-manual').style.display = 
      document.getElementById('sim-ai-auto').checked ? 'none' : 'block';
  }
  
  function updateSimStatus() {
    const diMode = document.getElementById('sim-di-auto').checked ? 'Auto' : 'Manual';
    const aiMode = document.getElementById('sim-ai-auto').checked ? 'Auto' : 'Manual';
    
    document.getElementById('sim-status').innerHTML = 
      'Sensors: Controlled by sensor config<br>' +
      'DI: ' + diMode + '<br>' +
      'AI: ' + aiMode;
  }
  
  window.updateDigitalInputs = function() {
    const diValues = [];
    for (let i = 0; i < 8; i++) {
      const checkbox = document.getElementById('sim-di' + (i+1));
      diValues.push(checkbox ? checkbox.checked : false);
    }
    
    fetch('/simulate/di', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'manual',
        values: diValues
      })
    }).then(response => response.json())
      .then(data => {
        if (data.success && window.showToast) {
          window.showToast('Digital inputs updated', 'success');
        }
      }).catch(err => {
        if (window.showToast) window.showToast('Error updating DI', 'error');
      });
  };
  
  window.updateAnalogInputs = function() {
    const ai1 = parseInt(document.getElementById('sim-ai1').value);
    const ai2 = parseInt(document.getElementById('sim-ai2').value);
    const ai3 = parseInt(document.getElementById('sim-ai3').value);
    
    fetch('/simulate/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'manual',
        values: [ai1, ai2, ai3]
      })
    }).then(response => response.json())
      .then(data => {
        if (data.success && window.showToast) {
          window.showToast('Analog inputs updated: ' + ai1 + ', ' + ai2 + ', ' + ai3 + ' mV', 'success');
        }
      }).catch(err => {
        if (window.showToast) window.showToast('Error updating AI', 'error');
      });
  };
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSimControls);
  } else {
    initSimControls();
  }
  
  // Also set auto modes back to auto when they're re-enabled for remaining controls
  setInterval(function() {
    if (document.getElementById('sim-di-auto').checked) {
      fetch('/simulate/di', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'auto' }) }).catch(() => {});
    }
    if (document.getElementById('sim-ai-auto').checked) {
      fetch('/simulate/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'auto' }) }).catch(() => {});
    }
  }, 5000);
})();

// Contract check and error alerts
(function(){
  function go(){
    try{
      fetch('/__contract').then(r=>r.ok?r.json():null).then(info=>{
        if(info && info.missing_in_server && info.missing_in_server.length>0 && window.showToast){
          window.showToast('Simulator missing sensors expected by UI: '+info.missing_in_server.join(', '), 'error', false, 6000);
        }
      }).catch(function(){});
      fetch('/config').then(r=>r.ok?r.json():null).then(cfg=>{
        if(cfg && cfg.modbus_server_error && window.showToast){
          window.showToast('Modbus TCP error: '+cfg.modbus_server_error+' . Change port in Settings and Save.', 'error', false, 7000);
        }
      }).catch(function(){});
    }catch(e){}
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded', go);} else {go();}
})();
</script>`;

  // Inject sim controls panel after the IO Configuration card
  let htmlWithPanel = html;
  const ioConfigCardEnd = /<\/div>\s*<\/div>\s*<div class="github-link-container">/i;
  if (ioConfigCardEnd.test(html)) {
    htmlWithPanel = html.replace(ioConfigCardEnd, simControlsPanel + '\n    </div>\n    \n    <div class="github-link-container">');
  }
  
  // Inject script before </body>
  if (/<\/body>/i.test(htmlWithPanel)) {
    return htmlWithPanel.replace(/<\/body>/i, simControlsScript + '\n</body>');
  }
  
  // Fallback: append at end
  return htmlWithPanel + simControlsScript;
}

app.get(['/', '/index.html'], (req, res, next) => {
  const indexPath = path.join(webRoot, 'index.html');
  fs.readFile(indexPath, 'utf8', (err, html) => {
    if (err || !html) return next();
    try {
      const out = injectSimulatorContent(html);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(out);
    } catch (e) {
      next();
    }
  });
});

app.use(express.static(webRoot));

// ------------------ Simulated Device State ------------------
const DEFAULT_CONFIG = {
  version: 6,
  dhcpEnabled: true,
  ip: [192, 168, 1, 10],
  gateway: [192, 168, 1, 1],
  subnet: [255, 255, 255, 0],
  modbusPort: 502,
  hostname: 'modbus-io',
  diPullup: Array(8).fill(false),
  diInvert: Array(8).fill(false),
  diLatch: Array(8).fill(false),
  doInvert: Array(8).fill(false),
  doInitialState: Array(8).fill(false),
};

const state = {
  config: JSON.parse(JSON.stringify(DEFAULT_CONFIG)),
  io: {
    dIn: Array(8).fill(false),
    dInRaw: Array(8).fill(false),
    dInLatched: Array(8).fill(false),
    dOut: Array(8).fill(false),
    aIn: [0, 0, 0], // No analog values when no sensors configured
    temperature: 22.5,      // Room temperature default
    humidity: 45.0,         // Typical indoor humidity
    pressure: 1013.25,
  },
  modbusClients: [],
  connectedClients: 0,
  bootTime: Date.now(),
  modbusServerRunning: false,
  modbusServerError: null,
  sim: {
    globalSimulationEnabled: false, // Global simulation toggle (OFF by default)
    sensorsMode: 'auto', // 'auto' | 'manual'
    diMode: 'auto',      // 'auto' | 'manual'
    aiMode: 'auto'       // 'auto' | 'manual'
  },
  contract: {
    uiSensorKeys: [],
    serverSensorKeys: ['temperature','humidity','pressure'],
    missingInServer: [],
    unusedOnUI: []
  }
};

// Initialize outputs from config initial state
state.io.dOut = state.config.doInitialState.slice();

// Helper to format IP array to string
function ipToString(arr) {
  return `${arr[0]}.${arr[1]}.${arr[2]}.${arr[3]}`;
}

// Safe mathematical expression evaluator
function evaluateMathExpression(expression, x) {
  try {
    // Sanitize the expression - only allow safe mathematical operations
    const sanitizedExpression = expression
      .replace(/[^0-9+\-*/.()x\s]/g, '') // Remove unsafe characters
      .replace(/x/g, `(${x})`) // Replace x with the actual value
      .replace(/\s+/g, ''); // Remove whitespace
    
    // Check for dangerous patterns
    if (sanitizedExpression.includes('..') || sanitizedExpression.includes('//')) {
      throw new Error('Invalid expression pattern');
    }
    
    // Count parentheses to ensure they're balanced
    const openCount = (sanitizedExpression.match(/\(/g) || []).length;
    const closeCount = (sanitizedExpression.match(/\)/g) || []).length;
    if (openCount !== closeCount) {
      throw new Error('Unbalanced parentheses');
    }
    
    // Evaluate using Function constructor (safer than eval)
    const result = new Function('return ' + sanitizedExpression)();
    
    // Check if result is a valid number
    if (isNaN(result) || !isFinite(result)) {
      throw new Error('Expression result is not a valid number');
    }
    
    return result;
  } catch (error) {
    console.error('Error evaluating expression:', expression, 'with x =', x, ':', error.message);
    return null;
  }
}

// Parse polynomial coefficients from string (e.g., "2x^2 + 3x + 1" -> [1, 3, 2])
function parsePolynomial(polynomialStr) {
  try {
    const terms = [];
    
    // Match polynomial terms like "2x^3", "-1.5x^2", "4x", "7", etc.
    const termRegex = /([+-]?\s*\d*\.?\d*)\s*\*?\s*x?\s*(\^\s*\d+)?/g;
    let match;
    
    while ((match = termRegex.exec(polynomialStr)) !== null) {
      const coeffStr = match[1].replace(/\s/g, '') || '1';
      const powerStr = match[2] ? match[2].replace(/[\^\s]/g, '') : (match[0].includes('x') ? '1' : '0');
      
      const coefficient = parseFloat(coeffStr === '+' || coeffStr === '' ? '1' : coeffStr === '-' ? '-1' : coeffStr);
      const power = parseInt(powerStr) || 0;
      
      if (!isNaN(coefficient) && coefficient !== 0) {
        terms.push({ coefficient, power });
      }
    }
    
    if (terms.length === 0) {
      throw new Error('No valid polynomial terms found');
    }
    
    return terms;
  } catch (error) {
    console.error('Error parsing polynomial:', polynomialStr, ':', error.message);
    return null;
  }
}

// Evaluate polynomial given coefficients and x value
function evaluatePolynomial(terms, x) {
  try {
    let result = 0;
    for (const term of terms) {
      result += term.coefficient * Math.pow(x, term.power);
    }
    
    if (!isFinite(result)) {
      throw new Error('Polynomial evaluation resulted in non-finite value');
    }
    
    return result;
  } catch (error) {
    console.error('Error evaluating polynomial:', terms, 'with x =', x, ':', error.message);
    return null;
  }
}

// Apply calibration to sensor reading
function applySensorCalibration(rawValue, calibration) {
  if (!calibration) {
    return rawValue;
  }
  
  try {
    // Handle mathematical expression
    if (calibration.expression && calibration.expression.trim() !== '') {
      const result = evaluateMathExpression(calibration.expression, rawValue);
      return result !== null ? parseFloat(result.toFixed(6)) : rawValue;
    }
    
    // Handle polynomial coefficients
    if (calibration.polynomial && Array.isArray(calibration.polynomial)) {
      const result = evaluatePolynomial(calibration.polynomial, rawValue);
      return result !== null ? parseFloat(result.toFixed(6)) : rawValue;
    }
    
    // Handle polynomial string
    if (calibration.polynomialStr && calibration.polynomialStr.trim() !== '') {
      const terms = parsePolynomial(calibration.polynomialStr);
      if (terms) {
        const result = evaluatePolynomial(terms, rawValue);
        return result !== null ? parseFloat(result.toFixed(6)) : rawValue;
      }
    }
    
    // Fall back to simple linear calibration (existing behavior)
    let result = rawValue;
    if (calibration.scale !== undefined && calibration.scale !== 0) {
      result *= calibration.scale;
    }
    if (calibration.offset !== undefined) {
      result += calibration.offset;
    }
    
    return parseFloat(result.toFixed(6));
  } catch (error) {
    console.error('Error applying calibration:', error.message);
    return rawValue; // Return raw value if calibration fails
  }
}

// Helper function to get sensor data (simulated or real)
function getSensorData(sensor) {
  // In simulator mode: provide simulated data if simulation is enabled for this sensor type
  // On hardware: this would read from actual I2C devices
  
  const sensorTypeLower = sensor.type.toLowerCase();
  
  // Check if this is a simulated sensor type
  if (sensor.type.startsWith('SIM_')) {
    return getSimulatedSensorData(sensor);
  }
  
  // Temperature sensors
  if (sensorTypeLower.includes('temperature') || 
      sensorTypeLower.includes('bmp') || 
      sensorTypeLower.includes('bme') || 
      sensorTypeLower.includes('sht') ||
      sensorTypeLower.includes('tmp') ||
      sensorTypeLower.includes('lm35') ||
      sensorTypeLower.includes('ds18b20')) {
    
    const rawTemp = state.io.temperature;
    return applySensorCalibration(rawTemp, sensor.calibration);
  }
  
  // Humidity sensors
  if (sensorTypeLower.includes('humidity') || 
      sensorTypeLower.includes('bme') || 
      sensorTypeLower.includes('sht') ||
      sensorTypeLower.includes('hih')) {
    
    const rawHumidity = state.io.humidity;
    return applySensorCalibration(rawHumidity, sensor.calibration);
  }
  
  // Pressure sensors
  if (sensorTypeLower.includes('pressure') || 
      sensorTypeLower.includes('bmp') || 
      sensorTypeLower.includes('bme')) {
    
    const rawPressure = state.io.pressure;
    return applySensorCalibration(rawPressure, sensor.calibration);
  }
  
  // Generic sensor - return a simulated value based on the sensor's modbus register
  // This allows for custom sensor types
  if (sensor.modbusRegister !== undefined) {
    const baseValue = 20 + (sensor.modbusRegister % 10) * 2;
    const variation = Math.sin(Date.now() / (5000 + sensor.modbusRegister * 100)) * 5;
    const rawValue = baseValue + variation;
    
    return applySensorCalibration(rawValue, sensor.calibration);
  }
  
  return null;
}

// Helper function to get simulated sensor data for SIM_ sensors
function getSimulatedSensorData(sensor) {
  // Only return data if sensor is enabled
  if (!sensor.enabled) {
    return null;
  }
  
  if (!sensor.simulatedValue && sensor.simulatedValue !== 0) {
    // Initialize with a default value if not set
    sensor.simulatedValue = getSensorSimulationBaseValue(sensor);
    console.log(`[sim] Late initialization of sensor ${sensor.name} with value: ${sensor.simulatedValue}`);
  }
  return applySensorCalibration(sensor.simulatedValue, sensor.calibration);
}

// Helper function to get base simulation value for a sensor type
function getSensorSimulationBaseValue(sensor) {
  const sensorType = sensor.type.toUpperCase();
  
  switch (sensorType) {
    case 'SIM_I2C_TEMPERATURE':
      return 22.5; // °C
    case 'SIM_I2C_HUMIDITY':
      return 45.0; // %
    case 'SIM_I2C_PRESSURE':
      return 1013.25; // hPa
    case 'SIM_UART_GPS':
      return 0; // Generic value for GPS
    case 'SIM_UART_MODBUS':
      return 100; // Generic modbus sensor value
    case 'SIM_ANALOG_VOLTAGE':
      return 1650; // mV (middle of 0-3300 range)
    case 'SIM_ANALOG_CURRENT':
      return 12; // mA (4-20mA loop)
    case 'SIM_DIGITAL_SWITCH':
      return 0; // Boolean state
    case 'SIM_DIGITAL_COUNTER':
      return 0; // Counter value
    default:
      return 20 + (sensor.modbusRegister % 10) * 2;
  }
}

// Helper function to get simulation variation for realistic data
function getSensorSimulationVariation(sensor, timestamp) {
  const sensorType = sensor.type.toUpperCase();
  const phase = sensor.modbusRegister * 1000; // Use register as phase offset
  
  switch (sensorType) {
    case 'SIM_I2C_TEMPERATURE':
      return Math.sin((timestamp + phase) / 10000) * 2.0; // ±2°C variation
    case 'SIM_I2C_HUMIDITY':
      return Math.cos((timestamp + phase) / 8000) * 5.0; // ±5% variation
    case 'SIM_I2C_PRESSURE':
      return Math.sin((timestamp + phase) / 15000) * 10.0; // ±10 hPa variation
    case 'SIM_UART_GPS':
      return Math.random() * 10; // Random GPS value
    case 'SIM_UART_MODBUS':
      return Math.sin((timestamp + phase) / 5000) * 10; // ±10 variation
    case 'SIM_ANALOG_VOLTAGE':
      return Math.sin((timestamp + phase) / 5000) * 800; // ±800mV variation
    case 'SIM_ANALOG_CURRENT':
      return Math.sin((timestamp + phase) / 7000) * 4; // ±4mA variation
    case 'SIM_DIGITAL_SWITCH':
      // Random state changes every ~10 seconds
      return Math.random() < 0.01 ? (Math.random() < 0.5 ? 1 : -1) : 0;
    case 'SIM_DIGITAL_COUNTER':
      // Increment occasionally
      return Math.random() < 0.02 ? 1 : 0;
    default:
      return Math.sin((timestamp + phase) / 5000) * 5;
  }
}

// Helper function to update simulated sensor value
function updateSimulatedSensorValue(sensor, newValue) {
  const sensorType = sensor.type.toUpperCase();
  
  switch (sensorType) {
    case 'SIM_I2C_TEMPERATURE':
      sensor.simulatedValue = newValue;
      // Also update global temperature for backward compatibility
      state.io.temperature = newValue;
      break;
    case 'SIM_I2C_HUMIDITY':
      sensor.simulatedValue = newValue;
      // Also update global humidity for backward compatibility
      state.io.humidity = newValue;
      break;
    case 'SIM_I2C_PRESSURE':
      sensor.simulatedValue = newValue;
      // Also update global pressure for backward compatibility
      state.io.pressure = newValue;
      break;
    case 'SIM_ANALOG_VOLTAGE':
      sensor.simulatedValue = newValue;
      // Update corresponding analog input channel (mV)
      if (sensor.modbusRegister >= 0 && sensor.modbusRegister < 3) {
        state.io.aIn[sensor.modbusRegister] = Math.round(newValue);
      }
      break;
    case 'SIM_ANALOG_CURRENT':
      sensor.simulatedValue = newValue;
      // Update corresponding analog input channel (convert mA to mV for ADC representation)
      if (sensor.modbusRegister >= 0 && sensor.modbusRegister < 3) {
        // Convert 4-20mA to 0-3300mV range for display
        const voltage = ((newValue - 4) / 16) * 3300;
        state.io.aIn[sensor.modbusRegister] = Math.round(Math.max(0, Math.min(3300, voltage)));
      }
      break;
    case 'SIM_DIGITAL_SWITCH':
      // For digital sensors, handle boolean states
      const currentState = sensor.simulatedValue || 0;
      sensor.simulatedValue = Math.abs(newValue) > 0.5 ? (currentState > 0.5 ? 0 : 1) : currentState;
      // Update corresponding digital input channel
      if (sensor.modbusRegister >= 0 && sensor.modbusRegister < 8) {
        state.io.dInRaw[sensor.modbusRegister] = sensor.simulatedValue > 0.5;
        state.io.dIn[sensor.modbusRegister] = sensor.simulatedValue > 0.5;
      }
      break;
    case 'SIM_DIGITAL_COUNTER':
      // For counters, accumulate
      sensor.simulatedValue = (sensor.simulatedValue || 0) + Math.max(0, newValue);
      // Digital counters don't directly affect DI pins, they just maintain count values
      break;
    default:
      sensor.simulatedValue = newValue;
      break;
  }
}

// Helper function to determine the data key for a sensor
function getSensorDataKey(sensor) {
  const sensorTypeLower = sensor.type.toLowerCase();
  
  // Use standard keys for common sensor types for UI compatibility
  if (sensorTypeLower.includes('temperature') || 
      sensorTypeLower.includes('bmp') || 
      sensorTypeLower.includes('bme') || 
      sensorTypeLower.includes('sht') ||
      sensorTypeLower.includes('tmp') ||
      sensorTypeLower.includes('lm35') ||
      sensorTypeLower.includes('ds18b20')) {
    return 'temperature';
  }
  
  if (sensorTypeLower.includes('humidity') || 
      sensorTypeLower.includes('bme') || 
      sensorTypeLower.includes('sht') ||
      sensorTypeLower.includes('hih')) {
    return 'humidity';
  }
  
  if (sensorTypeLower.includes('pressure') || 
      sensorTypeLower.includes('bmp') || 
      sensorTypeLower.includes('bme')) {
    return 'pressure';
  }
  
  // For custom sensors, use a sanitized version of the name
  return sensor.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

// Scan the UI script to discover which i2c_sensors keys it expects
function scanUISensorKeys() {
  try {
    const scriptPath = path.resolve(webRoot, 'script.js');
    const src = fs.readFileSync(scriptPath, 'utf8');
    const re = /i2c_sensors\.(\w+)/g;
    const found = new Set();
    let m;
    while ((m = re.exec(src)) !== null) {
      if (m[1]) found.add(m[1]);
    }
    // Update contract info
    state.contract.uiSensorKeys = Array.from(found);
    const server = new Set(state.contract.serverSensorKeys);
    const ui = new Set(state.contract.uiSensorKeys);
    state.contract.missingInServer = Array.from(ui).filter(k => !server.has(k));
    state.contract.unusedOnUI = Array.from(server).filter(k => !ui.has(k));

    if (state.contract.missingInServer.length > 0) {
      console.warn(`[sim][contract] UI expects sensors not provided by simulator: ${state.contract.missingInServer.join(', ')}`);
    }
    if (state.contract.unusedOnUI.length > 0) {
      console.info(`[sim][contract] Simulator exposes extra sensors not used by UI: ${state.contract.unusedOnUI.join(', ')}`);
    }
  } catch (e) {
    // Non-fatal; just log once
    console.warn('[sim][contract] Could not scan UI script for sensor keys:', e.message);
  }
}

// Simulate sensor and analog values over time
function updateSensors() {
  const t = Date.now();
  
  // Only simulate sensor values for configured simulated sensors that are enabled
  if (currentSensorConfig && currentSensorConfig.sensors) {
    currentSensorConfig.sensors.forEach(sensor => {
      if (sensor.enabled && sensor.type && sensor.type.startsWith('SIM_')) {
        // Generate simulated data based on sensor type
        const baseValue = getSensorSimulationBaseValue(sensor);
        const variation = getSensorSimulationVariation(sensor, t);
        const simulatedValue = baseValue + variation;
        
        // Store the simulated value based on sensor type
        updateSimulatedSensorValue(sensor, simulatedValue);
      } else if (sensor.type && sensor.type.startsWith('SIM_') && !sensor.enabled) {
        // If sensor is disabled, clear its simulated value
        if (sensor.simulatedValue !== undefined) {
          console.log(`[sim] Clearing simulation data for disabled sensor: ${sensor.name}`);
          delete sensor.simulatedValue;
        }
      }
    });
  }
  
  // Analog inputs are now handled by the sensor configuration system
  // If you have SIM_ANALOG_* sensors configured, they will provide analog data
  // Otherwise, analog inputs remain at 0 (no analog sensors configured)
}

// Digital inputs simulation: random toggles with latching behavior
function updateDigitalInputs() {
  if (state.sim.diMode === 'manual') {
    // Respect manual DI state; still apply inversion/latching mapping
    for (let i = 0; i < 8; i++) {
      let raw = state.io.dInRaw[i];
      if (state.config.diInvert[i]) raw = !raw;
      if (state.config.diLatch[i]) {
        if (raw && !state.io.dInLatched[i]) {
          state.io.dInLatched[i] = true;
          state.io.dIn[i] = true;
        } else if (state.io.dInLatched[i]) {
          state.io.dIn[i] = true;
        } else {
          state.io.dIn[i] = raw;
        }
      } else {
        state.io.dIn[i] = raw;
        state.io.dInLatched[i] = false;
      }
    }
    return;
  }
  for (let i = 0; i < 8; i++) {
    // 1% chance to toggle
    if (Math.random() < 0.01) {
      state.io.dInRaw[i] = !state.io.dInRaw[i];
    }
    let raw = state.io.dInRaw[i];
    if (state.config.diInvert[i]) raw = !raw;

    if (state.config.diLatch[i]) {
      if (raw && !state.io.dInLatched[i]) {
        state.io.dInLatched[i] = true;
        state.io.dIn[i] = true;
      } else if (state.io.dInLatched[i]) {
        state.io.dIn[i] = true;
      } else {
        state.io.dIn[i] = raw;
      }
    } else {
      state.io.dIn[i] = raw;
      state.io.dInLatched[i] = false;
    }
  }
}

function updateOutputsFromModbusMirror() {
  // In this simulator, outputs are only driven via REST or Modbus (if enabled)
  // Apply inversion to physical pin notion only if you later integrate GPIO
}

setInterval(() => {
  updateSensors();
  updateDigitalInputs();
  updateOutputsFromModbusMirror();
}, 500);

// ------------------ REST API ------------------
app.get('/config', (req, res) => {
  const cfg = state.config;
  const resp = {
    dhcp: cfg.dhcpEnabled,
    ip: ipToString(cfg.ip),
    gateway: ipToString(cfg.gateway),
    subnet: ipToString(cfg.subnet),
    modbus_port: cfg.modbusPort,
    hostname: cfg.hostname,
    current_ip: ipToString(cfg.ip), // simulator uses configured IP
    modbus_connected: state.connectedClients > 0,
    modbus_client_count: state.connectedClients,
    available_sensors: state.contract.serverSensorKeys,
    modbus_server_running: state.modbusServerRunning,
    modbus_server_error: state.modbusServerError,
    // Hardware/Simulator detection
    is_simulator: true, // This would be false on actual hardware
    firmware_version: "Simulator v1.0", // On hardware: actual firmware version
    device_type: "Modbus IO Module Simulator"
  };
  if (state.connectedClients > 0) {
    resp.modbus_clients = state.modbusClients.map((c, idx) => ({
      ip: c.ip,
      slot: idx,
      connected_for: Math.floor((Date.now() - c.since) / 1000)
    }));
  }
  res.json(resp);
});

app.post('/config', (req, res) => {
  const b = req.body || {};
  const cfg = state.config;
  if (typeof b.dhcp === 'boolean') cfg.dhcpEnabled = b.dhcp;
  if (typeof b.modbus_port === 'number') {
    const p = b.modbus_port | 0;
    if (p <= 0 || p > 65535) return res.status(400).json({ error: 'Invalid port' });
    const portChanged = cfg.modbusPort !== p;
    cfg.modbusPort = p;
    if (portChanged) {
      restartModbusTCP(cfg.modbusPort);
    }
  }
  if (typeof b.hostname === 'string' && b.hostname.length < 32) cfg.hostname = b.hostname;
  function parseIp(str, fallback) {
    if (!str || typeof str !== 'string') return fallback;
    const m = str.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!m) return fallback;
    const arr = m.slice(1).map(n => Math.min(255, Math.max(0, parseInt(n, 10))));
    return arr.length === 4 ? arr : fallback;
  }
  cfg.ip = parseIp(b.ip, cfg.ip);
  cfg.gateway = parseIp(b.gateway, cfg.gateway);
  cfg.subnet = parseIp(b.subnet, cfg.subnet);

  // In firmware, device reboots. Here we “accept” and return configured IP
  return res.json({ success: true, ip: ipToString(cfg.ip) });
});

app.get('/iostatus', (req, res) => {
  const io = state.io;
  const resp = {
    modbus_connected: state.connectedClients > 0,
    modbus_client_count: state.connectedClients,
    di: io.dIn.slice(),
    di_raw: io.dInRaw.slice(),
    di_latched: io.dInLatched.slice(),
    do: io.dOut.slice(),
    ai: io.aIn.slice()
  };

  // Include sensor data based on configured sensors (real hardware would read from actual I2C devices)
  // In simulator: provide simulated data for configured sensors
  // On hardware: this would be replaced with actual I2C sensor readings
  if (currentSensorConfig && currentSensorConfig.sensors) {
    const enabledSensors = currentSensorConfig.sensors.filter(sensor => sensor.enabled);
    
    if (enabledSensors.length > 0) {
      const i2c_sensors = {};
      
      // Process each enabled sensor
      enabledSensors.forEach(sensor => {
        const sensorData = getSensorData(sensor);
        if (sensorData !== null) {
          // Use the sensor's configured name as the key, or fall back to a standard name
          const dataKey = getSensorDataKey(sensor);
          i2c_sensors[dataKey] = sensorData;
        }
      });
      
      // Only add i2c_sensors to response if we have at least one sensor value
      if (Object.keys(i2c_sensors).length > 0) {
        resp.i2c_sensors = i2c_sensors;
      }
    }
  }

  if (state.connectedClients > 0) {
    resp.modbus_clients = state.modbusClients.map((c, idx) => ({
      ip: c.ip,
      slot: idx,
      connected_for: Math.floor((Date.now() - c.since) / 1000)
    }));
  }
  res.json(resp);
});

app.post('/setoutput', (req, res) => {
  const output = parseInt(req.body?.output ?? req.query.output, 10);
  const stateVal = parseInt(req.body?.state ?? req.query.state, 10);
  if (Number.isNaN(output) || output < 0 || output >= 8) return res.status(400).send('Invalid output number');
  const logical = stateVal ? true : false;
  state.io.dOut[output] = logical;
  // Optionally mirror to Modbus server if enabled
  res.send('OK');
});

app.get('/ioconfig', (req, res) => {
  const cfg = state.config;
  res.json({
    version: cfg.version,
    di_pullup: cfg.diPullup.slice(),
    di_invert: cfg.diInvert.slice(),
    di_latch: cfg.diLatch.slice(),
    do_invert: cfg.doInvert.slice(),
    do_initial_state: cfg.doInitialState.slice(),
  });
});

app.post('/ioconfig', (req, res) => {
  const b = req.body || {};
  let changed = false;
  function applyArray(key, len) {
    if (Array.isArray(b[key])) {
      for (let i = 0; i < Math.min(len, b[key].length); i++) {
        const v = !!b[key][i];
        if (state.config[key][i] !== v) {
          state.config[key][i] = v;
          changed = true;
        }
      }
    }
  }
  applyArray('diPullup', 8); // not exposed by UI directly, but maintain mapping
  // UI uses snake_case keys; map them to camelCase
  if (Array.isArray(b.di_pullup)) {
    for (let i = 0; i < 8; i++) {
      const v = !!b.di_pullup[i];
      if (state.config.diPullup[i] !== v) { state.config.diPullup[i] = v; changed = true; }
    }
  }
  if (Array.isArray(b.di_invert)) {
    for (let i = 0; i < 8; i++) {
      const v = !!b.di_invert[i];
      if (state.config.diInvert[i] !== v) { state.config.diInvert[i] = v; changed = true; }
    }
  }
  if (Array.isArray(b.di_latch)) {
    for (let i = 0; i < 8; i++) {
      const v = !!b.di_latch[i];
      if (state.config.diLatch[i] !== v) { state.config.diLatch[i] = v; changed = true; if (!v) state.io.dInLatched[i] = false; }
    }
  }
  if (Array.isArray(b.do_invert)) {
    for (let i = 0; i < 8; i++) {
      const v = !!b.do_invert[i];
      if (state.config.doInvert[i] !== v) { state.config.doInvert[i] = v; changed = true; }
    }
  }
  if (Array.isArray(b.do_initial_state)) {
    for (let i = 0; i < 8; i++) {
      const v = !!b.do_initial_state[i];
      if (state.config.doInitialState[i] !== v) { state.config.doInitialState[i] = v; changed = true; state.io.dOut[i] = v; }
    }
  }
  res.json({ success: true, changed });
});

app.post('/reset-latches', (req, res) => {
  state.io.dInLatched = Array(8).fill(false);
  res.json({ success: true, message: 'All latched inputs have been reset' });
});

app.post('/reset-latch', (req, res) => {
  const idx = typeof req.body?.input === 'number' ? req.body.input : parseInt(req.body?.input ?? req.query.input, 10);
  if (Number.isNaN(idx) || idx < 0 || idx >= 8) return res.status(400).json({ success: false, message: 'Invalid input index' });
  state.io.dInLatched[idx] = false;
  res.json({ success: true, message: `Latch has been reset for input ${idx}` });
});

// ------------------ Sensor Configuration endpoints ------------------
// Sensor configuration file path (simulates LittleFS /sensors.json on real device)
const SENSORS_FILE_PATH = path.join(webRoot, 'sensors.json');

// Load sensor configuration from file (simulates LittleFS loading on real device)
function loadSensorConfig() {
  console.log('[sim] Loading sensor configuration from file (simulating LittleFS):', SENSORS_FILE_PATH);
  
  try {
    if (fs.existsSync(SENSORS_FILE_PATH)) {
      const fileContent = fs.readFileSync(SENSORS_FILE_PATH, 'utf8');
      const config = JSON.parse(fileContent);
      console.log('[sim] Loaded', config.sensors?.length || 0, 'sensors from file');
      return config;
    } else {
      console.log('[sim] Sensors file does not exist, creating with empty configuration');
      const emptyConfig = { sensors: [] };
      saveSensorConfig(emptyConfig);
      return emptyConfig;
    }
  } catch (error) {
    console.error('[sim] Error loading sensor config:', error);
    console.log('[sim] Using empty configuration as fallback');
    return { sensors: [] };
  }
}

// Save sensor configuration to file (simulates LittleFS writing on real device)
function saveSensorConfig(config) {
  console.log('[sim] Saving sensor configuration to file (simulating LittleFS):', SENSORS_FILE_PATH);
  console.log('[sim] Saving', config.sensors?.length || 0, 'sensors');
  
  try {
    // Initialize simulated sensor values for newly configured sensors
    if (config && config.sensors) {
      const simulatedSensors = config.sensors.filter(sensor => 
        sensor.enabled && sensor.type && sensor.type.startsWith('SIM_')
      );
      
      console.log(`[sim] Active simulated sensors to save: ${simulatedSensors.length}`);
      
      config.sensors.forEach(sensor => {
        if (sensor.enabled && sensor.type && sensor.type.startsWith('SIM_')) {
          // Initialize simulated values for new simulated sensors
          if (sensor.simulatedValue === undefined) {
            sensor.simulatedValue = getSensorSimulationBaseValue(sensor);
            console.log(`[sim] Initialized simulated sensor ${sensor.name} (${sensor.type}) with value: ${sensor.simulatedValue}`);
          }
        }
      });
    }
    
    // Preserve documentation comments when saving
    const configWithComments = {
      "_comment": "SIMULATOR SENSOR CONFIGURATION - This file simulates the LittleFS /sensors.json that will exist on your Raspberry Pi Pico. The simulator reads/writes this file exactly like the real device reads/writes LittleFS. Changes made via the web interface will be saved here and persist across simulator restarts.",
      "_architecture": "Simulator uses this file <-> Real device uses LittleFS /sensors.json",
      "_registers_note": "Any register 0-65535 can be used. Registers 0-2 are also used for analog inputs if enabled.",
      "sensors": config.sensors || []
    };
    
    fs.writeFileSync(SENSORS_FILE_PATH, JSON.stringify(configWithComments, null, 2));
    console.log('[sim] Sensor configuration saved successfully');
    return true;
  } catch (error) {
    console.error('[sim] Error saving sensor config:', error);
    return false;
  }
}

// Initialize sensor configuration on server startup (simulates device boot)
console.log('[sim] ========================================');
console.log('[sim] INITIALIZING SENSOR CONFIGURATION');
console.log('[sim] (Simulating device LittleFS behavior)');
console.log('[sim] ========================================');
let currentSensorConfig = loadSensorConfig();
console.log('[sim] Sensor configuration initialization complete');

app.get('/sensors/config', (req, res) => {
  console.log('[sim] Getting sensor configuration');
  res.json(currentSensorConfig);
});

app.post('/sensors/config', (req, res) => {
  console.log('[sim] Setting sensor configuration:', req.body);
  
  if (!req.body) {
    return res.status(400).json({ success: false, message: 'No request body' });
  }
  
  // Update and save configuration (simulates LittleFS write on real device)
  if (req.body.sensors && Array.isArray(req.body.sensors)) {
    // Compare old vs new configuration to determine what changed
    const oldSensors = currentSensorConfig.sensors || [];
    const newSensors = req.body.sensors;
    
    // Stop simulation for removed simulated sensors
    oldSensors.forEach(oldSensor => {
      if (oldSensor.type && oldSensor.type.startsWith('SIM_') && oldSensor.enabled) {
        const stillExists = newSensors.find(newSensor => 
          newSensor.name === oldSensor.name && 
          newSensor.type === oldSensor.type && 
          newSensor.enabled
        );
        
        if (!stillExists) {
          console.log(`[sim] Stopping simulation for removed sensor: ${oldSensor.name} (${oldSensor.type})`);
          // Clear any stored simulation data for this sensor
          delete oldSensor.simulatedValue;
        }
      }
    });
    
    // Start simulation for new simulated sensors
    newSensors.forEach(newSensor => {
      if (newSensor.type && newSensor.type.startsWith('SIM_') && newSensor.enabled) {
        const existedBefore = oldSensors.find(oldSensor => 
          oldSensor.name === newSensor.name && 
          oldSensor.type === newSensor.type && 
          oldSensor.enabled
        );
        
        if (!existedBefore) {
          console.log(`[sim] Starting simulation for new sensor: ${newSensor.name} (${newSensor.type})`);
          // Initialize simulation value for new sensor
          newSensor.simulatedValue = getSensorSimulationBaseValue(newSensor);
          console.log(`[sim] Initialized ${newSensor.name} with value: ${newSensor.simulatedValue}`);
        }
      }
    });
    
    // Update the configuration
    currentSensorConfig.sensors = newSensors;
    console.log('[sim] Updated sensor configuration with', newSensors.length, 'sensors');
    
    // Count active simulated sensors
    const activeSimulatedSensors = newSensors.filter(sensor => 
      sensor.enabled && sensor.type && sensor.type.startsWith('SIM_')
    ).length;
    console.log(`[sim] Active simulated sensors: ${activeSimulatedSensors}`);
    
    // Save to file (simulates device writing to LittleFS)
    if (saveSensorConfig(currentSensorConfig)) {
      res.json({ 
        success: true, 
        message: 'Sensor configuration saved successfully. Device will reboot.' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to save sensor configuration to file' 
      });
    }
  } else {
    res.status(400).json({ 
      success: false, 
      message: 'Invalid sensors array in request body' 
    });
  }
});

// ------------------ Contract / health endpoints ------------------
app.get('/__contract', (req, res) => {
  res.json({
    ui_sensor_keys: state.contract.uiSensorKeys,
    server_sensor_keys: state.contract.serverSensorKeys,
    missing_in_server: state.contract.missingInServer,
    unused_on_ui: state.contract.unusedOnUI,
    di_count: 8,
    do_count: 8,
    ai_count: 3
  });
});

// ------------------ Simulation control endpoints ------------------
// Get/Set sensors (I2C-like) simulation
app.get('/simulate/sensors', (req, res) => {
  res.json({
    mode: state.sim.sensorsMode,
    temperature: state.io.temperature,
    humidity: state.io.humidity,
    pressure: state.io.pressure
  });
});

app.post('/simulate/sensors', (req, res) => {
  const b = req.body || {};
  if (b.mode === 'auto' || b.mode === 'manual') state.sim.sensorsMode = b.mode;
  if (typeof b.temperature === 'number') state.io.temperature = b.temperature;
  if (typeof b.humidity === 'number') state.io.humidity = b.humidity;
  if (typeof b.pressure === 'number') state.io.pressure = b.pressure;
  res.json({ success: true, mode: state.sim.sensorsMode, temperature: state.io.temperature, humidity: state.io.humidity, pressure: state.io.pressure });
});

// Get/Set digital inputs simulation
app.get('/simulate/di', (req, res) => {
  res.json({
    mode: state.sim.diMode,
    dInRaw: state.io.dInRaw,
    dIn: state.io.dIn,
    dInLatched: state.io.dInLatched
  });
});

app.post('/simulate/di', (req, res) => {
  const b = req.body || {};
  if (b.mode === 'auto' || b.mode === 'manual') state.sim.diMode = b.mode;
  if (typeof b.index === 'number' && b.index >= 0 && b.index < 8 && typeof b.value === 'boolean') {
    state.io.dInRaw[b.index] = b.value;
  }
  res.json({ success: true, mode: state.sim.diMode, dInRaw: state.io.dInRaw });
});

// Get/Set analog inputs (mV)
app.get('/simulate/ai', (req, res) => {
  res.json({ ai: state.io.aIn, mode: state.sim.aiMode });
});

app.post('/simulate/ai', (req, res) => {
  const b = req.body || {};
  
  // Set mode if provided
  if (b.mode === 'auto' || b.mode === 'manual') state.sim.aiMode = b.mode;
  
  // Set values if in manual mode and values are provided
  if (state.sim.aiMode === 'manual') {
    const values = b.values || b.ai; // Accept both 'values' (from UI) and 'ai' (legacy)
    if (Array.isArray(values)) {
      for (let i = 0; i < Math.min(3, values.length); i++) {
        const v = Math.max(0, Math.min(3300, parseInt(values[i], 10) || 0));
        state.io.aIn[i] = v;
      }
    }
  }
  
  res.json({ success: true, ai: state.io.aIn, mode: state.sim.aiMode });
});

// Global simulation control endpoint
app.get('/simulate/global', (req, res) => {
  res.json({
    enabled: state.sim.globalSimulationEnabled
  });
});

app.post('/simulate/global', (req, res) => {
  const b = req.body || {};
  if (typeof b.enabled === 'boolean') {
    state.sim.globalSimulationEnabled = b.enabled;
    console.log(`[sim] Global simulation ${b.enabled ? 'enabled' : 'disabled'}`);
    res.json({ 
      success: true, 
      enabled: state.sim.globalSimulationEnabled 
    });
  } else {
    res.status(400).json({ 
      success: false, 
      message: 'Invalid enabled parameter' 
    });
  }
});

// Get simulation state (for UI initialization)
app.get('/simulate/status', (req, res) => {
  res.json({
    sensorsMode: state.sim.sensorsMode,
    diMode: state.sim.diMode,
    aiMode: state.sim.aiMode,
    sensors: {
      temperature: state.io.temperature,
      humidity: state.io.humidity
    },
    ai: state.io.aIn,
    di: state.io.dInRaw
  });
});

// ------------------ Modbus TCP server (functional subset) ------------------
let tcpServer = null;

function boolArrayToBytes(bools, start, quantity) {
  const bytes = [];
  let byte = 0;
  let bitCount = 0;
  for (let i = 0; i < quantity; i++) {
    const bit = bools[start + i] ? 1 : 0;
    byte |= (bit << (i % 8));
    bitCount++;
    if (bitCount === 8 || i === quantity - 1) {
      bytes.push(byte);
      byte = 0;
      bitCount = 0;
    }
  }
  return Buffer.from(bytes);
}

function u16ToBuffer(val) {
  const b = Buffer.alloc(2);
  b.writeUInt16BE(val & 0xFFFF, 0);
  return b;
}

function readCoils(addr, qty) {
  const coils = new Array(qty).fill(false);
  for (let i = 0; i < qty; i++) {
    const a = addr + i;
    if (a >= 0 && a < 8) coils[i] = !!state.io.dOut[a];
    else if (a >= 100 && a < 108) coils[i] = false; // latch reset coils read as 0
    else coils[i] = false;
  }
  return coils;
}

function readDiscreteInputs(addr, qty) {
  const inputs = new Array(qty).fill(false);
  for (let i = 0; i < qty; i++) {
    const a = addr + i;
    if (a >= 0 && a < 8) inputs[i] = !!state.io.dIn[a];
    else inputs[i] = false;
  }
  return inputs;
}

function readInputRegisters(addr, qty) {
  const regs = new Array(qty).fill(0);
  for (let i = 0; i < qty; i++) {
    const a = addr + i;
    if (a >= 0 && a < 3) regs[i] = state.io.aIn[a] & 0xFFFF; // mV
    else if (a === 3) regs[i] = Math.max(0, Math.min(65535, Math.round(state.io.temperature * 100)));
    else if (a === 4) regs[i] = Math.max(0, Math.min(65535, Math.round(state.io.humidity * 100)));
    else regs[i] = 0;
  }
  return regs;
}

function writeSingleCoil(addr, valueOn) {
  if (addr >= 0 && addr < 8) {
    state.io.dOut[addr] = !!valueOn;
    return true;
  }
  if (addr >= 100 && addr < 108) {
    const idx = addr - 100;
    if (valueOn) state.io.dInLatched[idx] = false; // reset latch
    return true; // treated as momentary
  }
  return false;
}

function startModbusTCP(port) {
  const net = require('net');
  if (tcpServer) {
    try { tcpServer.close(); } catch {}
    tcpServer = null;
  }
  tcpServer = net.createServer((socket) => {
    const clientInfo = { ip: socket.remoteAddress?.replace('::ffff:', '') || '127.0.0.1', since: Date.now() };
    state.modbusClients.push(clientInfo);
    state.connectedClients = state.modbusClients.length;

    let buf = Buffer.alloc(0);
    socket.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      while (buf.length >= 7) {
        const tid = buf.readUInt16BE(0);
        const pid = buf.readUInt16BE(2);
        const len = buf.readUInt16BE(4);
        if (buf.length < 6 + len) break; // wait full frame
        const unitId = buf.readUInt8(6);
        const pdu = buf.slice(7, 6 + len);
        buf = buf.slice(6 + len);

        if (pid !== 0) continue; // only Modbus protocol

        const fc = pdu.readUInt8(0);
        function sendPDU(pduResp) {
          const respLen = 1 + pduResp.length; // uid + PDU
          const hdr = Buffer.alloc(7);
          hdr.writeUInt16BE(tid, 0);
          hdr.writeUInt16BE(0, 2);
          hdr.writeUInt16BE(respLen, 4);
          hdr.writeUInt8(unitId, 6);
          socket.write(Buffer.concat([hdr, pduResp]));
        }
        function sendException(code) {
          sendPDU(Buffer.from([fc | 0x80, code & 0xFF]));
        }

        try {
          if (fc === 0x01 || fc === 0x02) {
            const addr = pdu.readUInt16BE(1);
            const qty = pdu.readUInt16BE(3);
            if (qty < 1 || qty > 2000) return sendException(0x03);
            const arr = (fc === 0x01) ? readCoils(addr, qty) : readDiscreteInputs(addr, qty);
            const bytes = boolArrayToBytes(arr, 0, qty);
            sendPDU(Buffer.concat([Buffer.from([fc, bytes.length]), bytes]));
          } else if (fc === 0x04) {
            const addr = pdu.readUInt16BE(1);
            const qty = pdu.readUInt16BE(3);
            if (qty < 1 || qty > 125) return sendException(0x03);
            const regs = readInputRegisters(addr, qty);
            const bytes = Buffer.concat(regs.map(u16ToBuffer));
            sendPDU(Buffer.concat([Buffer.from([fc, bytes.length]), bytes]));
          } else if (fc === 0x05) {
            const addr = pdu.readUInt16BE(1);
            const val = pdu.readUInt16BE(3);
            const on = (val === 0xFF00);
            if (!writeSingleCoil(addr, on)) return sendException(0x02);
            // Echo request (function + address + value)
            sendPDU(Buffer.from([fc, pdu[1], pdu[2], pdu[3], pdu[4]]));
          } else {
            sendException(0x01);
          }
        } catch (e) {
          sendException(0x04); // server device failure on errors
        }
      }
    });

    socket.on('close', () => {
      state.modbusClients = state.modbusClients.filter(c => c !== clientInfo);
      state.connectedClients = state.modbusClients.length;
    });
    socket.on('error', () => { /* ignore per-connection errors */ });
  });
  tcpServer.on('error', (err) => {
    state.modbusServerRunning = false;
    state.modbusServerError = `${err.code || 'ERR'}: ${err.message}`;
    console.warn(`[sim] Modbus TCP server error on port ${port}: ${state.modbusServerError}`);
  });
  tcpServer.listen(port, () => {
    state.modbusServerRunning = true;
    state.modbusServerError = null;
    console.log(`[sim] Modbus TCP listening on ${port}`);
  });
}

function restartModbusTCP(newPort) {
  if (tcpServer) {
    try { tcpServer.close(); } catch {}
    tcpServer = null;
  }
  startModbusTCP(newPort);
}

// Start servers
app.listen(HTTP_PORT, () => {
  console.log(`[sim] HTTP server running at http://localhost:${HTTP_PORT}`);
  console.log(`[sim] Serving UI from ${webRoot}`);
  // Contract scan on startup
  scanUISensorKeys();
  // Start Modbus TCP listener to track connected clients (does not parse Modbus frames)
  startModbusTCP(state.config.modbusPort);
});
