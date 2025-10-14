// Simple toast notification function
window.showToast = function showToast(message, type = 'info', persistent = false, duration = 3000) {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    let toast = document.createElement('div');
    toast.className = 'toast ' + (type || 'info');
    toast.textContent = message;
    
    if (!persistent) {
        toast.onclick = () => toast.remove();
        setTimeout(() => { if (toast.parentNode) toast.remove(); }, duration);
    }
    
    toastContainer.appendChild(toast);
    setTimeout(() => { toast.classList.add('show'); }, 10);
    
    return toast; // Return toast element for manual removal
};

// Pin definitions for W5500-EVB-PoE-Pico - Based on actual pinout diagram
const ALL_PINS = {
    'I2C': [
        { label: 'I2C0: SDA GP4 (Pin 6), SCL GP5 (Pin 7) - Default', pins: [4, 5] },
        { label: 'I2C0: SDA GP0 (Pin 1), SCL GP1 (Pin 2)', pins: [0, 1] },
        { label: 'I2C0: SDA GP2 (Pin 4), SCL GP3 (Pin 5)', pins: [2, 3] },
        { label: 'I2C0: SDA GP6 (Pin 9), SCL GP7 (Pin 10)', pins: [6, 7] },
        { label: 'I2C0: SDA GP8 (Pin 11), SCL GP9 (Pin 12)', pins: [8, 9] },
        { label: 'I2C0: SDA GP10 (Pin 14), SCL GP11 (Pin 15)', pins: [10, 11] },
        { label: 'I2C0: SDA GP12 (Pin 16), SCL GP13 (Pin 17)', pins: [12, 13] },
        { label: 'I2C0: SDA GP14 (Pin 19), SCL GP15 (Pin 20)', pins: [14, 15] },
        { label: 'I2C1: SDA GP26 (Pin 31), SCL GP27 (Pin 32)', pins: [26, 27] }
    ],
    'UART': [
        { label: 'UART0: TX GP0 (Pin 1), RX GP1 (Pin 2) - Default', pins: [0, 1] },
        { label: 'UART0: TX GP12 (Pin 16), RX GP13 (Pin 17)', pins: [12, 13] },
        { label: 'UART1: TX GP4 (Pin 6), RX GP5 (Pin 7)', pins: [4, 5] },
        { label: 'UART1: TX GP8 (Pin 11), RX GP9 (Pin 12)', pins: [8, 9] },
        { label: 'UART: TX GP2 (Pin 4), RX GP3 (Pin 5)', pins: [2, 3] },
        { label: 'UART: TX GP6 (Pin 9), RX GP7 (Pin 10)', pins: [6, 7] },
        { label: 'UART: TX GP10 (Pin 14), RX GP11 (Pin 15)', pins: [10, 11] },
        { label: 'UART: TX GP14 (Pin 19), RX GP15 (Pin 20)', pins: [14, 15] }
    ],
    'Analog Voltage': [
        { label: 'ADC0: GP26 (Pin 31) - ADC_VREF nearby', pins: [26] },
        { label: 'ADC1: GP27 (Pin 32) - AGND nearby', pins: [27] },
        { label: 'ADC2: GP28 (Pin 34) - Your One-Wire sensor here!', pins: [28] }
    ],
    'One-Wire': [
        // Available GPIO pins (avoiding W5500 pins GP16-GP21)
        { label: 'GP0 (Pin 1) - UART0 TX alt', pins: [0] },
        { label: 'GP1 (Pin 2) - UART0 RX alt', pins: [1] },
        { label: 'GP2 (Pin 4) - General GPIO', pins: [2] },
        { label: 'GP3 (Pin 5) - General GPIO', pins: [3] },
        { label: 'GP4 (Pin 6) - I2C0 SDA alt', pins: [4] },
        { label: 'GP5 (Pin 7) - I2C0 SCL alt', pins: [5] },
        { label: 'GP6 (Pin 9) - General GPIO', pins: [6] },
        { label: 'GP7 (Pin 10) - General GPIO', pins: [7] },
        { label: 'GP8 (Pin 11) - General GPIO', pins: [8] },
        { label: 'GP9 (Pin 12) - General GPIO', pins: [9] },
        { label: 'GP10 (Pin 14) - General GPIO', pins: [10] },
        { label: 'GP11 (Pin 15) - General GPIO', pins: [11] },
        { label: 'GP12 (Pin 16) - General GPIO', pins: [12] },
        { label: 'GP13 (Pin 17) - General GPIO', pins: [13] },
        { label: 'GP14 (Pin 19) - General GPIO', pins: [14] },
        { label: 'GP15 (Pin 20) - General GPIO', pins: [15] },
        { label: 'GP22 (Pin 29) - General GPIO', pins: [22] },
        { label: 'GP26 (Pin 31) - ADC0 alt', pins: [26] },
        { label: 'GP27 (Pin 32) - ADC1 alt', pins: [27] },
        { label: 'GP28 (Pin 34) - ADC2 alt - Your DS18B20 is here!', pins: [28] }
    ],
    'Digital Counter': [
        // Same as One-Wire but labeled for digital counting
        { label: 'GP0 (Pin 1)', pins: [0] },
        { label: 'GP1 (Pin 2)', pins: [1] },
        { label: 'GP2 (Pin 4)', pins: [2] },
        { label: 'GP3 (Pin 5)', pins: [3] },
        { label: 'GP4 (Pin 6)', pins: [4] },
        { label: 'GP5 (Pin 7)', pins: [5] },
        { label: 'GP6 (Pin 9)', pins: [6] },
        { label: 'GP7 (Pin 10)', pins: [7] },
        { label: 'GP8 (Pin 11)', pins: [8] },
        { label: 'GP9 (Pin 12)', pins: [9] },
        { label: 'GP10 (Pin 14)', pins: [10] },
        { label: 'GP11 (Pin 15)', pins: [11] },
        { label: 'GP12 (Pin 16)', pins: [12] },
        { label: 'GP13 (Pin 17)', pins: [13] },
        { label: 'GP14 (Pin 19)', pins: [14] },
        { label: 'GP15 (Pin 20)', pins: [15] },
        { label: 'GP22 (Pin 29)', pins: [22] },
        { label: 'GP26 (Pin 31)', pins: [26] },
        { label: 'GP27 (Pin 32)', pins: [27] },
        { label: 'GP28 (Pin 34) - Your sensor location', pins: [28] }
    ]
};

// Data parsing configurations for different sensor protocols
const DATA_PARSING_OPTIONS = {
    'I2C': {
        methods: ['raw_bytes', 'int16_be', 'int16_le', 'float32_be', 'float32_le', 'custom_bits'],
        description: 'How to interpret I2C response data'
    },
    'UART': {
        methods: ['ascii_string', 'binary_data', 'modbus_rtu', 'custom_protocol'],
        description: 'How to parse UART/RS485 data packets'
    },
    'One-Wire': {
        methods: ['temperature_c', 'temperature_f', 'raw_data'],
        description: 'How to interpret One-Wire sensor data'
    },
    'Digital Counter': {
        methods: ['bit_field', 'counter_value', 'status_register'],
        description: 'How to extract data from digital signals'
    }
};

// Helper to get used pins (except for bus protocols)
function getUsedPins(protocol) {
    let used = [];
    window.sensorConfigData.forEach(sensor => {
        if (!sensor.enabled) return;
        
        // For bus protocols, don't exclude shared pins
        if (protocol === 'I2C' && sensor.protocol === 'I2C') {
            // I2C can share pins, so don't mark as used for other I2C sensors
            return;
        }
        if (protocol === 'One-Wire' && sensor.protocol === 'One-Wire') {
            // One-Wire can share pins, so don't mark as used for other One-Wire sensors  
            return;
        }
        
        // Collect all used pins from this sensor
        if (sensor.sdaPin !== undefined && sensor.sdaPin >= 0) used.push(sensor.sdaPin);
        if (sensor.sclPin !== undefined && sensor.sclPin >= 0) used.push(sensor.sclPin);
        if (sensor.uartTxPin !== undefined && sensor.uartTxPin >= 0) used.push(sensor.uartTxPin);
        if (sensor.uartRxPin !== undefined && sensor.uartRxPin >= 0) used.push(sensor.uartRxPin);
        if (sensor.analogPin !== undefined && sensor.analogPin >= 0) used.push(sensor.analogPin);
        if (sensor.oneWirePin !== undefined && sensor.oneWirePin >= 0) used.push(sensor.oneWirePin);
        if (sensor.digitalPin !== undefined && sensor.digitalPin >= 0) used.push(sensor.digitalPin);
    });
    return used;
}
// Global variables for configuration state
let ioConfigState = {
    di_pullup: [false, false, false, false, false, false, false, false],
    di_invert: [false, false, false, false, false, false, false, false],
    di_latch: [false, false, false, false, false, false, false, false],
    do_invert: [false, false, false, false, false, false, false, false],
	 do_init: [false, false, false, false, false, false, false, false]
};


// Global variables for sensor management
let currentIOStatus = null;

// Function to update the sensor table body
window.updateSensorTableBody = function updateSensorTableBody() {
    const tableBody = document.getElementById('sensor-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = window.sensorConfigData.map((sensor, index) => {
        const i2cAddress = sensor.type && sensor.type.startsWith('SIM_') ?
            (sensor.i2cAddress === 0 ? 'Simulated' : `0x${sensor.i2cAddress.toString(16).toUpperCase().padStart(2, '0')}`) :
            (sensor.i2cAddress ? `0x${sensor.i2cAddress.toString(16).toUpperCase().padStart(2, '0')}` : 'N/A');
        const enabledClass = sensor.enabled ? 'sensor-enabled' : 'sensor-disabled';
        const enabledText = sensor.enabled ? 'Yes' : 'No';
        const hasCalibration = sensor.calibration && (sensor.calibration.offset !== undefined || sensor.calibration.scale !== undefined);
        const calibrationText = hasCalibration ? 'Yes' : 'No';
        const calibrationClass = hasCalibration ? 'calibration-enabled' : 'calibration-disabled';
        return `
            <tr>
                <td>${sensor.name}</td>
                <td>${sensor.type}</td>
                <td>${i2cAddress}</td>
                <td>${sensor.modbusRegister || 'N/A'}</td>
                <td class="${enabledClass}">${enabledText}</td>
                <td class="${calibrationClass}">${calibrationText}</td>
                <td>
                    <div class="sensor-actions">
                        <button class="edit-btn" onclick="editSensor(${index})" title="Edit sensor">Edit</button>
                        <button class="delete-btn" onclick="deleteSensor(${index})" title="Delete sensor">Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    updateRegisterSummary();
}
console.log("script.js loaded");
window.sensorConfigData = [];
let currentSensorConfig = [];
let currentCalibratedSensors = [];
let currentSensorCommand = null;
let currentSensorI2CData = null;

// Toast notification functions
// ...existing code...

// Update the compact register summary
window.updateRegisterSummary = function updateRegisterSummary() {
    const usedRegisters = sensorConfigData
        .filter(sensor => sensor.modbusRegister !== undefined)
        .map(sensor => sensor.modbusRegister)
        .sort((a, b) => a - b);
    
    const usedRegisterElement = document.getElementById('used-registers');
    if (usedRegisterElement) {
        if (usedRegisters.length === 0) {
            usedRegisterElement.textContent = 'None';
        } else {
            usedRegisterElement.textContent = usedRegisters.join(', ');
        }
    }
    
    // Find next available register (first unused register >= 3)
    const availableRegisterElement = document.getElementById('available-registers');
    if (availableRegisterElement) {
        let nextAvailable = 3;
        while (usedRegisters.includes(nextAvailable)) {
            nextAvailable++;
        }
        availableRegisterElement.textContent = `${nextAvailable}+`;
    }
};

// Show the add sensor modal (define in global scope)
window.showAddSensorModal = function showAddSensorModal() {
    editingSensorIndex = -1;
    document.getElementById('sensor-modal-title').textContent = 'Add Sensor';
    document.getElementById('sensor-modal-overlay').querySelector('button[onclick="saveSensor()"]').textContent = 'Add';
    document.getElementById('sensor-form').reset();
    document.getElementById('sensor-enabled').checked = true;
    
    // Clear the user-set flag for register field to allow auto-suggestion
    const modbusRegField = document.getElementById('sensor-modbus-register');
    if (modbusRegField) {
        modbusRegField.removeAttribute('data-user-set');
        modbusRegField.value = ''; // Clear any previous value
    }
    
    // Reset multi-value option
    document.getElementById('sensor-multi-value').checked = false;
    toggleMultiValueConfig();
    
    // Ensure single register field is visible when opening new sensor modal
    const singleRegisterGroup = document.getElementById('sensor-modbus-register')?.parentElement;
    if (singleRegisterGroup) {
        singleRegisterGroup.style.display = 'block';
    }

    // Setup sensor calibration method listeners
    setupSensorCalibrationMethodListeners();

    // Reset calibration to defaults
    document.getElementById('sensor-method-linear').checked = true;
    document.getElementById('sensor-calibration-offset').value = 0;
    document.getElementById('sensor-calibration-scale').value = 1;
    document.getElementById('sensor-calibration-polynomial').value = '';
    document.getElementById('sensor-calibration-expression').value = '';
    showSensorCalibrationMethod('linear');

    // Setup sensor type change listeners
    const sensorTypeSelect = document.getElementById('sensor-type');
    sensorTypeSelect.addEventListener('change', updateSensorFormFields);
    sensorTypeSelect.addEventListener('change', () => {
        // Show/hide sensor command section based on generic sensor selection
        const sensorCommandSection = document.getElementById('sensor-command-section');
        if (sensorCommandSection) {
            sensorCommandSection.style.display = isGenericSensor(sensorTypeSelect.value) ? 'block' : 'none';
        }
    });
    
    // Setup data parsing change listener
    document.getElementById('sensor-data-parsing').addEventListener('change', updateDataParsingFields);
    
    // Initialize form fields visibility
    updateSensorFormFields();

    document.getElementById('sensor-modal-overlay').classList.add('show');
};

// Update protocol-specific configuration fields
window.updateSensorProtocolFields = function updateSensorProtocolFields() {
    const protocolType = document.getElementById('sensor-protocol').value;
    const protocolConfig = document.getElementById('protocol-config');
    const multiValueOption = document.getElementById('multi-value-option');
    
    // Hide all protocol configs and remove required from their fields
    const allConfigs = document.querySelectorAll('.protocol-config');
    allConfigs.forEach(config => {
        config.style.display = 'none';
        config.querySelectorAll('input,select').forEach(field => field.required = false);
    });

    // Show/hide multi-value option based on protocol type
    const digitalProtocols = ['I2C', 'UART', 'One-Wire'];
    if (digitalProtocols.includes(protocolType)) {
        multiValueOption.style.display = 'block';
    } else {
        multiValueOption.style.display = 'none';
        // Reset multi-value checkbox when hiding
        document.getElementById('sensor-multi-value').checked = false;
        toggleMultiValueConfig();
    }

    // Show appropriate protocol config and add required to visible fields
    if (protocolType === 'I2C') {
        protocolConfig.style.display = 'block';
        const i2cConfig = document.getElementById('i2c-config');
        i2cConfig.style.display = 'block';
        i2cConfig.querySelectorAll('input,select').forEach(field => {
            if (field.id === 'sensor-i2c-address') field.required = true;
        });
        loadAvailablePins('I2C');
    } else if (protocolType === 'UART') {
        protocolConfig.style.display = 'block';
        const uartConfig = document.getElementById('uart-config');
        uartConfig.style.display = 'block';
        // Add required if needed for UART fields
        loadAvailablePins('UART');
    } else if (protocolType === 'Analog Voltage') {
        protocolConfig.style.display = 'block';
        const analogConfig = document.getElementById('analog-config');
        analogConfig.style.display = 'block';
        // Add required if needed for Analog fields
        loadAvailablePins('Analog Voltage');
    } else if (protocolType === 'One-Wire') {
        protocolConfig.style.display = 'block';
        const onewireConfig = document.getElementById('onewire-config');
        onewireConfig.style.display = 'block';
        // Add required if needed for One-Wire fields
        loadAvailablePins('One-Wire');
    } else if (protocolType === 'Digital Counter') {
        protocolConfig.style.display = 'block';
        const digitalConfig = document.getElementById('digital-config');
        digitalConfig.style.display = 'block';
        // Add required if needed for Digital fields
        loadAvailablePins('Digital Counter');
    } else {
        // No protocol selected
        protocolConfig.style.display = 'none';
    }
    
    // Also update sensor type options based on protocol
    updateSensorTypeOptions();
};

// Load available pins for the selected protocol
// Load available pins for the selected protocol
window.loadAvailablePins = function loadAvailablePins(protocol) {
    // Use static pin map and current sensor config
    let available = [];
    let used = getUsedPins(protocol);
    if (protocol === 'I2C' || protocol === 'One-Wire') {
        // Bus protocols: always show all bus pins
        available = ALL_PINS[protocol];
    } else {
        // Remove used pins
        available = ALL_PINS[protocol].filter(pair => !pair.pins.some(pin => used.includes(pin)));
    }

    if (protocol === 'I2C') {
        const pinsSelect = document.getElementById('sensor-i2c-pins');
        pinsSelect.innerHTML = '<option value="">Select I2C pins...</option>';
        available.forEach(pair => {
            const option = document.createElement('option');
            option.value = pair.pins.join(',');
            option.textContent = pair.label;
            pinsSelect.appendChild(option);
        });
    } else if (protocol === 'UART') {
        const pinsSelect = document.getElementById('sensor-uart-pins');
        pinsSelect.innerHTML = '<option value="">Select UART pins...</option>';
        available.forEach(pair => {
            const option = document.createElement('option');
            option.value = pair.pins.join(',');
            option.textContent = pair.label;
            pinsSelect.appendChild(option);
        });
    } else if (protocol === 'Analog Voltage') {
        const pinsSelect = document.getElementById('sensor-analog-pin');
        pinsSelect.innerHTML = '<option value="">Select analog pin...</option>';
        available.forEach(pair => {
            const option = document.createElement('option');
            option.value = pair.pins[0];
            option.textContent = pair.label;
            pinsSelect.appendChild(option);
        });
    } else if (protocol === 'One-Wire') {
        const pinsSelect = document.getElementById('sensor-onewire-pin');
        pinsSelect.innerHTML = '<option value="">Select One-Wire pin...</option>';
        available.forEach(pair => {
            const option = document.createElement('option');
            option.value = pair.pins[0];
            option.textContent = pair.label;
            pinsSelect.appendChild(option);
        });
    } else if (protocol === 'Digital Counter') {
        const pinsSelect = document.getElementById('sensor-digital-pin');
        pinsSelect.innerHTML = '<option value="">Select digital pin...</option>';
        available.forEach(pair => {
            const option = document.createElement('option');
            option.value = pair.pins[0];
            option.textContent = pair.label;
            pinsSelect.appendChild(option);
        });
    }
};

// Update sensor type options based on selected protocol
// Helper function to check if sensor type is a generic sensor
function isGenericSensor(sensorType) {
    return ['GENERIC_I2C', 'GENERIC_UART', 'GENERIC_ONEWIRE', 'ANALOG_CUSTOM', 'GENERIC_DIGITAL'].includes(sensorType);
}

window.updateSensorTypeOptions = function updateSensorTypeOptions() {
    const protocolType = document.getElementById('sensor-protocol').value;
    const sensorTypeSelect = document.getElementById('sensor-type');
    const sensorType = sensorTypeSelect.value;
    
    // Show/hide sensor command section based on generic sensor selection
    const sensorCommandSection = document.getElementById('sensor-command-section');
    if (sensorCommandSection) {
        sensorCommandSection.style.display = isGenericSensor(sensorType) ? 'block' : 'none';
    }
    
    // Clear current options if protocol changed
    sensorTypeSelect.innerHTML = '<option value="">Select sensor type</option>';
    
    let optgroups = [];
    
    if (protocolType === 'I2C') {
        optgroups.push({
            label: 'Real I2C Sensors',
            options: [
                { value: 'BME280', text: 'BME280 (Temperature, Humidity, Pressure)' },
                { value: 'SHT30', text: 'SHT30 (Temperature, Humidity)' },
                { value: 'EZO_PH', text: 'EZO-pH (pH Sensor)' },
                { value: 'EZO_EC', text: 'EZO-EC (Conductivity)' },
                { value: 'EZO_DO', text: 'EZO-DO (Dissolved Oxygen)' },
                { value: 'EZO_RTD', text: 'EZO-RTD (Temperature)' },
                { value: 'EZO_ORP', text: 'EZO-ORP (Oxidation-Reduction Potential)' },
                { value: 'GENERIC_I2C', text: 'Generic I2C Sensor' }
            ]
        });
        optgroups.push({
            label: 'Simulated I2C Sensors',
            options: [
                { value: 'SIM_I2C_TEMPERATURE', text: 'Simulated I2C Temperature' },
                { value: 'SIM_I2C_HUMIDITY', text: 'Simulated I2C Humidity' },
                { value: 'SIM_I2C_PRESSURE', text: 'Simulated I2C Pressure' }
            ]
        });
    } else if (protocolType === 'UART') {
        optgroups.push({
            label: 'Real UART Sensors',
            options: [
                { value: 'MODBUS_RTU', text: 'Modbus RTU Sensor' },
                { value: 'NMEA_GPS', text: 'NMEA GPS Receiver' },
                { value: 'ASCII_SENSOR', text: 'ASCII Text Sensor' },
                { value: 'BINARY_SENSOR', text: 'Binary Protocol Sensor' },
                { value: 'GENERIC_UART', text: 'Generic UART Device' }
            ]
        });
        optgroups.push({
            label: 'Simulated UART Sensors',
            options: [
                { value: 'SIM_UART_TEMPERATURE', text: 'Simulated UART Temperature' },
                { value: 'SIM_UART_FLOW', text: 'Simulated UART Flow Meter' }
            ]
        });
    } else if (protocolType === 'Analog Voltage') {
        optgroups.push({
            label: 'Real Analog Sensors',
            options: [
                { value: 'ANALOG_4_20MA', text: '4-20mA Current Loop' },
                { value: 'ANALOG_0_10V', text: '0-10V Voltage Input' },
                { value: 'ANALOG_THERMISTOR', text: 'Thermistor Temperature' },
                { value: 'ANALOG_PRESSURE', text: 'Analog Pressure Transducer' },
                { value: 'ANALOG_CUSTOM', text: 'Custom Analog Input' }
            ]
        });
        optgroups.push({
            label: 'Simulated Analog Sensors',
            options: [
                { value: 'SIM_ANALOG_VOLTAGE', text: 'Simulated Analog Voltage' },
                { value: 'SIM_ANALOG_CURRENT', text: 'Simulated Analog Current' }
            ]
        });
    } else if (protocolType === 'One-Wire') {
        optgroups.push({
            label: 'Real One-Wire Sensors',
            options: [
                { value: 'DS18B20', text: 'DS18B20 Temperature Sensor' },
                { value: 'DS18S20', text: 'DS18S20 Temperature Sensor' },
                { value: 'DS1822', text: 'DS1822 Temperature Sensor' },
                { value: 'GENERIC_ONEWIRE', text: 'Generic One-Wire Device' }
            ]
        });
        optgroups.push({
            label: 'Simulated One-Wire Sensors',
            options: [
                { value: 'SIM_ONEWIRE_TEMP', text: 'Simulated One-Wire Temperature' }
            ]
        });
    } else if (protocolType === 'Digital Counter') {
        optgroups.push({
            label: 'Real Digital Sensors',
            options: [
                { value: 'DIGITAL_PULSE', text: 'Digital Pulse Counter' },
                { value: 'DIGITAL_SWITCH', text: 'Digital Switch/Contact' },
                { value: 'DIGITAL_ENCODER', text: 'Digital Encoder' },
                { value: 'DIGITAL_FREQUENCY', text: 'Frequency Counter' },
                { value: 'GENERIC_DIGITAL', text: 'Generic Digital Input' }
            ]
        });
        optgroups.push({
            label: 'Simulated Digital Sensors',
            options: [
                { value: 'SIM_DIGITAL_SWITCH', text: 'Simulated Digital Switch' },
                { value: 'SIM_DIGITAL_COUNTER', text: 'Simulated Digital Counter' }
            ]
        });
    }
    
    // Add optgroups to select
    optgroups.forEach(group => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = group.label;
        
        group.options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.text;
            optgroup.appendChild(optionElement);
        });
        
        sensorTypeSelect.appendChild(optgroup);

    });
}

// Update sensor form fields based on selected sensor type
window.updateSensorFormFields = function updateSensorFormFields() {
    const protocol = document.getElementById('sensor-protocol').value;
    const sensorType = document.getElementById('sensor-type').value;
    const i2cAddressContainer = document.getElementById('sensor-i2c-address').parentElement;
    const i2cAddressField = document.getElementById('sensor-i2c-address');
    
    // Hide I2C address field for non-I2C protocols
    if (protocol === 'I2C') {
        i2cAddressContainer.style.display = 'block';
        i2cAddressField.required = true;
        
        if (sensorType.startsWith('SIM_')) {
            // For simulated I2C sensors, use 0x00 as default
            i2cAddressField.value = '0x00';
            i2cAddressField.required = false;
        } else if (i2cAddressField.value === '0x00' || i2cAddressField.value === '') {
            // Clear default for real I2C sensors
            i2cAddressField.value = '';
        }
    } else {
        // For non-I2C protocols, hide I2C address field
        i2cAddressContainer.style.display = 'none';
        i2cAddressField.value = '0x00'; // Use placeholder for non-I2C
        i2cAddressField.required = false;
    }
    
    // Show/hide data parsing section based on protocol
    const dataParsingSection = document.getElementById('data-parsing-section');
    if (protocol === 'I2C' || protocol === 'UART' || protocol === 'One-Wire' || protocol === 'Digital Counter') {
        dataParsingSection.style.display = 'block';
    } else {
        dataParsingSection.style.display = 'none';
    }
    
    // Set default modbus register only if field is empty AND not manually set
    const modbusRegField = document.getElementById('sensor-modbus-register');
    if (!modbusRegField.value && !modbusRegField.hasAttribute('data-user-set')) {
        const nextRegister = getNextAvailableRegister();
        modbusRegField.value = nextRegister;
    }
}

// Poll Sensor Now functionality
window.pollSensorNow = function pollSensorNow() {
    const protocolElement = document.getElementById('sensor-protocol');
    const pollResults = document.getElementById('poll-results');
    const pollStatus = document.getElementById('poll-status');
    const rawResponse = document.getElementById('raw-response');
    const parsedData = document.getElementById('parsed-data');
    
    if (!protocolElement || !pollResults || !pollStatus || !rawResponse || !parsedData) {
        alert('Poll form elements not found. Please ensure sensor configuration form is open.');
        return;
    }
    
    const protocol = protocolElement.value;
    
    // Show results area
    pollResults.style.display = 'block';
    pollStatus.className = 'poll-status polling';
    pollStatus.textContent = 'Polling sensor...';
    rawResponse.textContent = '';
    parsedData.textContent = '';
    
    // Gather sensor configuration with null checks
    const nameElement = document.getElementById('sensor-name');
    const typeElement = document.getElementById('sensor-type');
    
    const sensorConfig = {
        protocol: protocol,
        name: nameElement ? nameElement.value || 'Test Sensor' : 'Test Sensor',
        type: typeElement ? typeElement.value || 'GENERIC_I2C' : 'GENERIC_I2C'
    };
    
    if (protocol === 'I2C') {
        const addressElement = document.getElementById('sensor-i2c-address');
        const commandElement = document.getElementById('sensor-command');
        const delayElement = document.getElementById('sensor-command-wait');
        
        sensorConfig.i2cAddress = addressElement ? parseI2CAddress(addressElement.value) : 0x44;
        sensorConfig.command = commandElement ? commandElement.value || '' : '';
        sensorConfig.delayBeforeRead = delayElement ? parseInt(delayElement.value) || 0 : 0;
        
        const pins = getPinsForProtocol('I2C');
        sensorConfig.sdaPin = pins[0];
        sensorConfig.sclPin = pins[1];
    } else if (protocol === 'UART') {
        const baudElement = document.getElementById('sensor-uart-baud');
        const commandElement = document.getElementById('sensor-command');
        
        sensorConfig.baudRate = baudElement ? parseInt(baudElement.value) || 9600 : 9600;
        sensorConfig.command = commandElement ? commandElement.value || '' : '';
        
        const pins = getPinsForProtocol('UART');
        sensorConfig.txPin = pins[0];
        sensorConfig.rxPin = pins[1];
    } else if (protocol === 'One-Wire') {
        const commandElement = document.getElementById('sensor-onewire-command-custom');
        const conversionElement = document.getElementById('sensor-onewire-conversion-time');
        
        sensorConfig.oneWireCommand = commandElement ? commandElement.value || '' : '';
        sensorConfig.oneWireConversionTime = conversionElement ? parseInt(conversionElement.value) || 750 : 750;
        
        const pins = getPinsForProtocol('One-Wire');
        sensorConfig.oneWirePin = pins[0];
    }
    
    // Send poll request to backend
    fetch('/api/sensor/poll', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(sensorConfig)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            pollStatus.className = 'poll-status success';
            pollStatus.textContent = 'Poll completed successfully';
            
            // Display raw response
            if (data.rawHex) {
                rawResponse.textContent = `Raw Hex: ${data.rawHex}\nRaw ASCII: "${data.rawAscii || ''}"`;
            } else {
                rawResponse.textContent = data.response || 'No response data';
            }
            
            // Display parsed data if available
            if (data.parsedValue !== undefined) {
                parsedData.textContent = `Parsed Value: ${data.parsedValue}`;
            } else {
                parsedData.textContent = 'No parsing applied - raw data only';
            }
            
        } else {
            pollStatus.className = 'poll-status error';
            pollStatus.textContent = `Poll failed: ${data.error || 'Unknown error'}`;
            rawResponse.textContent = data.details || 'No additional details';
        }
    })
    .catch(error => {
        pollStatus.className = 'poll-status error';
        pollStatus.textContent = `Network error: ${error.message}`;
        rawResponse.textContent = 'Failed to communicate with device';
    });
};

// Helper function to parse I2C address from string (hex or decimal)
function parseI2CAddress(addressStr) {
    if (!addressStr) return 0x44;
    const cleanAddr = addressStr.trim();
    if (cleanAddr.startsWith('0x') || cleanAddr.startsWith('0X')) {
        return parseInt(cleanAddr, 16);
    }
    return parseInt(cleanAddr, 10);
}

// Helper function to get pins for current protocol selection
function getPinsForProtocol(protocol) {
    const pinSelectId = `sensor-${protocol.toLowerCase()}-pins`;
    const pinSelect = document.getElementById(pinSelectId);
    if (pinSelect && pinSelect.value) {
        return pinSelect.value.split(',').map(p => parseInt(p));
    }
    // Default pins
    if (protocol === 'I2C') return [4, 5];
    if (protocol === 'UART') return [0, 1];
    if (protocol === 'One-Wire') return [2];
    return [];
}

// Auto-configure sensor settings based on type
window.autoConfigureSensorType = function autoConfigureSensorType() {
    const sensorType = document.getElementById('sensor-type').value;
    const protocol = document.getElementById('sensor-protocol').value;
    
    // Define sensor configurations
    const sensorConfigs = {
        'DS18B20': {
            protocol: 'One-Wire',
            oneWireCommand: '0x44',
            oneWireInterval: 5,
            oneWireConversionTime: 750,
            oneWireAutoMode: true,
            units: '°C',
            calibrationSlope: 1.0,
            calibrationOffset: 0.0
        },
        'DS18S20': {
            protocol: 'One-Wire',
            oneWireCommand: '0x44',
            oneWireInterval: 5,
            oneWireConversionTime: 750,
            oneWireAutoMode: true,
            units: '°C',
            calibrationSlope: 1.0,
            calibrationOffset: 0.0
        },
        'SHT30': {
            protocol: 'I2C',
            i2cAddress: '0x44',
            units: ['°C', '%RH'],
            multiValue: true,
            values: [
                { name: 'Temperature', register: 'auto', units: '°C' },
                { name: 'Humidity', register: 'auto+1', units: '%RH' }
            ]
        },
        'BME280': {
            protocol: 'I2C',
            i2cAddress: '0x76',
            units: ['°C', '%RH', 'hPa'],
            multiValue: true,
            values: [
                { name: 'Temperature', register: 'auto', units: '°C' },
                { name: 'Humidity', register: 'auto+1', units: '%RH' },
                { name: 'Pressure', register: 'auto+2', units: 'hPa' }
            ]
        }
    };
    
    const config = sensorConfigs[sensorType];
    if (!config) {
        // No auto-config for this sensor type (e.g., GENERIC_* sensors)
        // Ensure single register field is visible and multi-value is disabled
        setTimeout(() => {
            const multiValueCheckbox = document.getElementById('sensor-multi-value');
            if (multiValueCheckbox) {
                multiValueCheckbox.checked = false;
                toggleMultiValueConfig();
            }
            
            // Always show single register field for generic sensors
            const singleRegisterGroup = document.getElementById('sensor-modbus-register')?.parentElement;
            if (singleRegisterGroup) {
                singleRegisterGroup.style.display = 'block';
            }
        }, 100);
        return;
    }
    
    // Apply protocol if different
    if (config.protocol !== protocol) {
        document.getElementById('sensor-protocol').value = config.protocol;
        updateSensorProtocolFields();
    }
    
    // Apply One-Wire specific settings
    if (config.protocol === 'One-Wire') {
        setTimeout(() => { // Wait for protocol fields to load
            if (document.getElementById('sensor-onewire-command')) {
                if (config.oneWireCommand === '0x44') {
                    document.getElementById('sensor-onewire-command').value = '0x44';
                } else {
                    document.getElementById('sensor-onewire-command').value = 'custom';
                    document.getElementById('sensor-onewire-command-custom').value = config.oneWireCommand;
                    document.getElementById('sensor-onewire-command-custom').style.display = 'block';
                }
                document.getElementById('sensor-onewire-interval').value = config.oneWireInterval;
                document.getElementById('sensor-onewire-conversion-time').value = config.oneWireConversionTime;
                document.getElementById('sensor-onewire-auto').checked = config.oneWireAutoMode;
            }
        }, 100);
    }
    
    // Apply I2C address
    if (config.i2cAddress) {
        setTimeout(() => {
            const i2cField = document.getElementById('sensor-i2c-address');
            if (i2cField) {
                i2cField.value = config.i2cAddress;
            }
        }, 100);
    }
    
    // Show engineering units in calibration section
    if (config.units) {
        setTimeout(() => {
            const unitsDisplay = document.getElementById('engineering-units-display');
            if (unitsDisplay) {
                if (Array.isArray(config.units)) {
                    unitsDisplay.textContent = `Units: ${config.units.join(', ')}`;
                } else {
                    unitsDisplay.textContent = `Units: ${config.units}`;
                }
                unitsDisplay.style.display = 'block';
            }
        }, 100);
    }
    
    // Show multi-value configuration if applicable
    if (config.multiValue) {
        setTimeout(() => {
            // Enable multi-value checkbox
            const multiValueCheckbox = document.getElementById('sensor-multi-value');
            if (multiValueCheckbox) {
                multiValueCheckbox.checked = true;
                toggleMultiValueConfig(); // This will show the multi-value section
            }
            
            // Populate the multi-value fields
            populateMultiValueFields(config.values);
            
            // Hide single register field since we're using multi-value
            const singleRegisterGroup = document.getElementById('sensor-modbus-register')?.parentElement;
            if (singleRegisterGroup) {
                singleRegisterGroup.style.display = 'none';
            }
        }, 100);
    } else {
        // For single-value sensors, ensure multi-value is disabled and single register is visible
        setTimeout(() => {
            const multiValueCheckbox = document.getElementById('sensor-multi-value');
            if (multiValueCheckbox) {
                multiValueCheckbox.checked = false;
                toggleMultiValueConfig();
            }
            
            // Ensure single register field is visible for single-value sensors
            const singleRegisterGroup = document.getElementById('sensor-modbus-register')?.parentElement;
            if (singleRegisterGroup) {
                singleRegisterGroup.style.display = 'block';
            }
        }, 100);
    }
    
    showToast(`Auto-configured ${sensorType} settings`, 'success');
};

// Populate multi-value fields for sensors like SHT30, BME280
window.populateMultiValueFields = function populateMultiValueFields(values) {
    const container = document.getElementById('multi-value-fields');
    if (!container) return;
    
    container.innerHTML = '';
    
    values.forEach((value, index) => {
        // Get base register from single register field - only auto-assign if field is empty
        let baseRegister = parseInt(document.getElementById('sensor-modbus-register')?.value);
        const regField = document.getElementById('sensor-modbus-register');
        if (isNaN(baseRegister) && regField && !regField.hasAttribute('data-user-set')) {
            baseRegister = getNextAvailableRegister();
            // Update the single register field for reference
            if (regField) {
                regField.value = baseRegister;
            }
        }
        
        const register = value.register === 'auto' ? baseRegister : 
                        value.register.includes('+') ? baseRegister + parseInt(value.register.split('+')[1]) : 
                        parseInt(value.register);
        
        const item = document.createElement('div');
        item.className = 'multi-value-item';
        item.innerHTML = `
            <h5>${value.name}</h5>
            <div class="multi-value-row">
                <div class="form-group">
                    <label>Modbus Register</label>
                    <input type="number" 
                           id="multi-register-${index}" 
                           value="${register}" 
                           min="3" max="65535">
                </div>
                <div class="form-group">
                    <label>Scale Factor</label>
                    <input type="number" 
                           id="multi-scale-${index}" 
                           value="1.0" 
                           step="0.001" 
                           min="0.001">
                </div>
                <div class="form-group">
                    <label>Offset</label>
                    <input type="number" 
                           id="multi-offset-${index}" 
                           value="0.0" 
                           step="0.01">
                </div>
                <div class="multi-value-units">${value.units}</div>
            </div>
        `;
        container.appendChild(item);
    });
};

// Handle data parsing method selection
window.updateDataParsingFields = function updateDataParsingFields() {
    const parsingMethod = document.getElementById('sensor-data-parsing').value;
    
    // Hide all parsing config sections
    const configSections = document.querySelectorAll('.parsing-config');
    configSections.forEach(section => {
        section.style.display = 'none';
    });
    
    // Show relevant config section
    const configMap = {
        'custom_bits': 'custom-bits-config',
        'bit_field': 'bit-field-config', 
        'status_register': 'status-register-config',
        'json_path': 'json-path-config',
        'csv_column': 'csv-column-config'
    };
    
    if (configMap[parsingMethod]) {
        document.getElementById(configMap[parsingMethod]).style.display = 'block';
    }
}

// Helper function to get the next available modbus register
window.getNextAvailableRegister = function getNextAvailableRegister() {
    let maxRegister = 2; // System reserves 0-2
    sensorConfigData.forEach(sensor => {
        if (sensor.modbusRegister > maxRegister) {
            maxRegister = sensor.modbusRegister;
        }
    });
    return maxRegister + 1;
}// Show the edit sensor modal
window.editSensor = function editSensor(index) {
    if (index < 0 || index >= sensorConfigData.length) {
        showToast('Invalid sensor index', 'error');
        return;
    }

    const sensor = sensorConfigData[index];
    editingSensorIndex = index;

    document.getElementById('sensor-modal-title').textContent = 'Edit Sensor';
    document.getElementById('sensor-modal-overlay').querySelector('button[onclick="saveSensor()"]').textContent = 'Update';
    document.getElementById('sensor-name').value = sensor.name;
    document.getElementById('sensor-protocol').value = sensor.protocol || 'I2C';
    document.getElementById('sensor-type').value = sensor.type;
    
    // Trigger protocol change to update form fields
    updateSensorProtocolFields();
    
    // Load bus polling frequency if it exists
    switch (sensor.protocol) {
        case 'I2C':
            document.getElementById('sensor-i2c-polling').value = sensor.pollingFrequency || 1000;
            break;
        case 'UART':
            document.getElementById('sensor-uart-polling').value = sensor.pollingFrequency || 1000;
            break;
        case 'One-Wire':
            document.getElementById('sensor-onewire-polling').value = sensor.pollingFrequency || 1000;
            break;
    }

    // Load sensor command configuration if it exists
    const sensorCommandSection = document.getElementById('sensor-command-section');
    if (sensorCommandSection) {
        if (isGenericSensor(sensor.type) && sensor.command) {
            sensorCommandSection.style.display = 'block';
            document.getElementById('sensor-command').value = sensor.command.command || '';
            document.getElementById('sensor-command-wait').value = sensor.command.waitTime || 750;
        } else {
            sensorCommandSection.style.display = 'none';
            document.getElementById('sensor-command').value = '';
            document.getElementById('sensor-command-wait').value = 750;
        }
    }

    // Load pin assignments if they exist
    if (sensor.protocol === 'I2C' && sensor.sdaPin !== undefined && sensor.sclPin !== undefined) {
        document.getElementById('sensor-i2c-pins').value = `${sensor.sdaPin},${sensor.sclPin}`;
    } else if (sensor.protocol === 'UART' && sensor.txPin !== undefined && sensor.rxPin !== undefined) {
        document.getElementById('sensor-uart-pins').value = `${sensor.txPin},${sensor.rxPin}`;
    } else if (sensor.protocol === 'Analog Voltage' && sensor.analogPin !== undefined) {
        document.getElementById('sensor-analog-pin').value = sensor.analogPin.toString();
    } else if (sensor.protocol === 'One-Wire' && sensor.oneWirePin !== undefined) {
        document.getElementById('sensor-onewire-pin').value = sensor.oneWirePin.toString();
        
        // Load One-Wire specific settings
        setTimeout(() => {
            if (sensor.oneWireCommand) {
                const commandSelect = document.getElementById('sensor-onewire-command');
                if (commandSelect) {
                    if (['0x44', '0x48', '0x14'].includes(sensor.oneWireCommand)) {
                        commandSelect.value = sensor.oneWireCommand;
                    } else {
                        commandSelect.value = 'custom';
                        const customField = document.getElementById('sensor-onewire-command-custom');
                        if (customField) {
                            customField.value = sensor.oneWireCommand;
                            customField.style.display = 'block';
                        }
                    }
                }
            }
            if (sensor.oneWireInterval !== undefined) {
                const intervalField = document.getElementById('sensor-onewire-interval');
                if (intervalField) intervalField.value = sensor.oneWireInterval;
            }
            if (sensor.oneWireConversionTime !== undefined) {
                const conversionField = document.getElementById('sensor-onewire-conversion-time');
                if (conversionField) conversionField.value = sensor.oneWireConversionTime;
            }
            if (sensor.oneWireAutoMode !== undefined) {
                const autoField = document.getElementById('sensor-onewire-auto');
                if (autoField) autoField.checked = sensor.oneWireAutoMode;
            }
        }, 100);
    } else if (sensor.protocol === 'Digital Counter' && sensor.digitalPin !== undefined) {
        document.getElementById('sensor-digital-pin').value = sensor.digitalPin.toString();
    }
    document.getElementById('sensor-i2c-address').value = sensor.i2cAddress ? `0x${sensor.i2cAddress.toString(16).toUpperCase().padStart(2, '0')}` : '';
    document.getElementById('sensor-modbus-register').value = sensor.modbusRegister || '';
    
    // Mark register field as user-set since it's pre-filled with existing data
    const modbusRegField = document.getElementById('sensor-modbus-register');
    if (modbusRegField) {
        modbusRegField.setAttribute('data-user-set', 'true');
    }
    
    document.getElementById('sensor-enabled').checked = sensor.enabled;

    // Setup sensor calibration method listeners
    setupSensorCalibrationMethodListeners();
    
    // Setup sensor type change listener
    document.getElementById('sensor-type').addEventListener('change', updateSensorFormFields);
    
    // Update form fields based on sensor type
    updateSensorFormFields();

    // Load calibration data and determine method
    if (sensor.calibration) {
        if (sensor.calibration.expression && sensor.calibration.expression.trim() !== '') {
            // Expression calibration
            document.getElementById('sensor-method-expression').checked = true;
            document.getElementById('sensor-calibration-expression').value = sensor.calibration.expression;
            showSensorCalibrationMethod('expression');
        } else if (sensor.calibration.polynomialStr && sensor.calibration.polynomialStr.trim() !== '') {
            // Polynomial calibration
            document.getElementById('sensor-method-polynomial').checked = true;
            document.getElementById('sensor-calibration-polynomial').value = sensor.calibration.polynomialStr;
            showSensorCalibrationMethod('polynomial');
        } else {
            // Linear calibration
            document.getElementById('sensor-method-linear').checked = true;
            document.getElementById('sensor-calibration-offset').value = sensor.calibration.offset || 0;
            document.getElementById('sensor-calibration-scale').value = sensor.calibration.scale || 1;
            showSensorCalibrationMethod('linear');
        }
    } else {
        // Default to linear calibration
        document.getElementById('sensor-method-linear').checked = true;
        document.getElementById('sensor-calibration-offset').value = 0;
        document.getElementById('sensor-calibration-scale').value = 1;
        document.getElementById('sensor-calibration-polynomial').value = '';
        document.getElementById('sensor-calibration-expression').value = '';
        showSensorCalibrationMethod('linear');
    }

    // Load data parsing configuration
    if (sensor.dataParsing) {
        document.getElementById('sensor-data-parsing').value = sensor.dataParsing.method || 'raw';
        updateDataParsingFields();
        
        // Load specific parsing configuration
        switch (sensor.dataParsing.method) {
            case 'custom_bits':
                if (sensor.dataParsing.bitPositions) {
                    document.getElementById('sensor-bit-positions').value = sensor.dataParsing.bitPositions;
                }
                break;
                
            case 'bit_field':
                if (sensor.dataParsing.bitStart !== undefined) {
                    document.getElementById('sensor-bit-start').value = sensor.dataParsing.bitStart;
                }
                if (sensor.dataParsing.bitLength !== undefined) {
                    document.getElementById('sensor-bit-length').value = sensor.dataParsing.bitLength;
                }
                break;
                
            case 'status_register':
                if (sensor.dataParsing.statusBits) {
                    document.getElementById('sensor-status-bits').value = sensor.dataParsing.statusBits;
                }
                break;
                
            case 'json_path':
                if (sensor.dataParsing.jsonPath) {
                    document.getElementById('sensor-json-path').value = sensor.dataParsing.jsonPath;
                }
                break;
                
            case 'csv_column':
                if (sensor.dataParsing.csvColumn !== undefined) {
                    document.getElementById('sensor-csv-column').value = sensor.dataParsing.csvColumn;
                }
                if (sensor.dataParsing.csvDelimiter) {
                    document.getElementById('sensor-csv-delimiter').value = sensor.dataParsing.csvDelimiter;
                }
                break;
        }
    } else {
        // Default to raw parsing
        document.getElementById('sensor-data-parsing').value = 'raw';
        updateDataParsingFields();
    }
    
    // Show example data if available from sensor's raw data string
    const exampleSection = document.getElementById('example-data-section');
    const exampleTextarea = document.getElementById('example-data-string');
    
    if (sensor.rawDataString && sensor.rawDataString.trim() !== '') {
        exampleSection.style.display = 'block';
        exampleTextarea.value = sensor.rawDataString;
    } else {
        exampleSection.style.display = 'none';
        exampleTextarea.value = '';
    }
    
    // Show multi-value section if sensor has multiple values configured
    if (sensor.multiValues && sensor.multiValues.length > 0) {
        document.getElementById('sensor-multi-value').checked = true;
        toggleMultiValueConfig();
        
        // Populate existing multi-value fields
        const container = document.getElementById('multi-value-fields');
        container.innerHTML = '';
        
        sensor.multiValues.forEach((value, index) => {
            addMultiValueField();
            document.getElementById(`multi-name-${index}`).value = value.name || `Value ${index + 1}`;
            document.getElementById(`multi-position-${index}`).value = value.position || '';
            document.getElementById(`multi-register-${index}`).value = value.register || (sensor.modbusRegister + index);
            document.getElementById(`multi-scale-${index}`).value = value.scale || 1.0;
            document.getElementById(`multi-offset-${index}`).value = value.offset || 0.0;
            document.getElementById(`multi-units-${index}`).value = value.units || '';
        });
    } else {
        document.getElementById('sensor-multi-value').checked = false;
        toggleMultiValueConfig();
    }

    document.getElementById('sensor-modal-overlay').classList.add('show');
}

// Setup sensor calibration method radio button listeners
window.setupSensorCalibrationMethodListeners = function setupSensorCalibrationMethodListeners() {
    const methodRadios = document.querySelectorAll('input[name="sensor-calibration-method"]');
    methodRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.checked) {
                showSensorCalibrationMethod(this.value);
            }
        });
    });
}

// Show the appropriate sensor calibration method section
window.showSensorCalibrationMethod = function showSensorCalibrationMethod(method) {
    // Hide all sensor calibration sections
    document.getElementById('sensor-linear-calibration').style.display = 'none';
    document.getElementById('sensor-polynomial-calibration').style.display = 'none';
    document.getElementById('sensor-expression-calibration').style.display = 'none';
    
    // Show the selected method
    switch (method) {
        case 'linear':
            document.getElementById('sensor-linear-calibration').style.display = 'block';
            break;
        case 'polynomial':
            document.getElementById('sensor-polynomial-calibration').style.display = 'block';
            break;
        case 'expression':
            document.getElementById('sensor-expression-calibration').style.display = 'block';
            break;
    }
}

// Hide the sensor modal
window.hideSensorModal = function hideSensorModal() {
    document.getElementById('sensor-modal-overlay').classList.remove('show');
    editingSensorIndex = -1;
}

// Parse I2C address from input (supports 0x48, 48, etc.)
window.parseI2CAddress = function parseI2CAddress(addressStr) {
    if (!addressStr) return 0;
    
    const cleanStr = addressStr.trim();
    if (cleanStr.toLowerCase().startsWith('0x')) {
        return parseInt(cleanStr, 16);
    } else {
        return parseInt(cleanStr, 16);
    }
}

// Save sensor (add or update)
window.saveSensor = function saveSensor() {    
    const form = document.getElementById('sensor-form');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const name = document.getElementById('sensor-name').value.trim();
    const protocol = document.getElementById('sensor-protocol').value;
    const type = document.getElementById('sensor-type').value;
    const i2cAddressStr = document.getElementById('sensor-i2c-address').value.trim();
    const modbusRegister = parseInt(document.getElementById('sensor-modbus-register').value);
    const enabled = document.getElementById('sensor-enabled').checked;
    
    // Validate inputs
    if (!name || !protocol || !type || isNaN(modbusRegister)) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    // For I2C sensors, validate I2C address
    let i2cAddress = 0;
    if (protocol === 'I2C') {
        const i2cAddressStr = document.getElementById('sensor-i2c-address').value.trim();
        if (!i2cAddressStr) {
            showToast('I2C address is required for I2C sensors', 'error');
            return;
        }
        
        i2cAddress = parseI2CAddress(i2cAddressStr);
        
        // For simulated sensors, allow address 0x00, for real sensors validate range
        if (type.startsWith('SIM_')) {
            // Simulated sensors can use 0x00 as placeholder
            if (i2cAddress < 0 || i2cAddress > 127) {
                showToast('I2C address must be between 0x00 and 0x7F (0-127) for simulated sensors', 'error');
                return;
            }
        } else {
            // Real sensors need valid I2C addresses (1-127)
            if (i2cAddress < 1 || i2cAddress > 127) {
                showToast('I2C address must be between 0x01 and 0x7F (1-127) for real sensors', 'error');
                return;
            }
        }
    }
    
    // Validate Modbus register range
    if (modbusRegister < 0) {
        showToast('Modbus register must be 0 or higher', 'error');
        return;
    }
    
    if (modbusRegister > 65535) {
        showToast('Modbus register must be 65535 or lower', 'error');
        return;
    }
    
    // Validate pin assignments based on protocol
    switch (protocol) {
        case 'I2C':
            const i2cPinPair = document.getElementById('sensor-i2c-pins').value;
            if (!i2cPinPair) {
                showToast('Please select I2C pin pair', 'error');
                return;
            }
            break;
            
        case 'UART':
            const uartPinPair = document.getElementById('sensor-uart-pins').value;
            if (!uartPinPair) {
                showToast('Please select UART pin pair', 'error');
                return;
            }
            break;
            
        case 'Analog Voltage':
            const analogPin = document.getElementById('sensor-analog-pin').value;
            if (!analogPin) {
                showToast('Please select analog pin', 'error');
                return;
            }
            break;
            
        case 'One-Wire':
            const oneWirePin = document.getElementById('sensor-onewire-pin').value;
            if (!oneWirePin) {
                showToast('Please select one-wire pin', 'error');
                return;
            }
            break;
            
        case 'Digital Counter':
            const digitalPin = document.getElementById('sensor-digital-pin').value;
            if (!digitalPin) {
                showToast('Please select digital pin', 'error');
                return;
            }
            break;
    }
    
    // Check for duplicate I2C addresses (excluding the sensor being edited)
    // Only check for I2C protocol sensors and skip simulated sensors using 0x00
    if (protocol === 'I2C' && !(type.startsWith('SIM_') && i2cAddress === 0)) {
        const duplicateI2C = sensorConfigData.some((sensor, index) => 
            index !== editingSensorIndex && 
            sensor.protocol === 'I2C' && 
            sensor.i2cAddress === i2cAddress
        );
        if (duplicateI2C) {
            showToast('I2C address already in use by another I2C sensor', 'error');
            return;
        }
    }
    
    // Check for modbus register conflicts (including multi-output sensors)
    const conflictingSensor = sensorConfigData.find((sensor, index) => {
        if (index === editingSensorIndex) return false; // Skip self when editing
        
        // Check if the new register conflicts with existing sensor's primary register
        if (sensor.modbusRegister === modbusRegister) {
            return true;
        }
        
        // Check if the new register conflicts with multi-output sensor's secondary registers
        if (sensor.multiValues && Array.isArray(sensor.multiValues)) {
            for (const value of sensor.multiValues) {
                if (value.register === modbusRegister) {
                    return true;
                }
            }
        }
        
        // Check if current sensor's multi-output registers conflict with existing sensor
        const isMultiValue = document.getElementById('sensor-multi-value').checked;
        if (isMultiValue) {
            // Get the actual number of multi-value fields configured
            const multiValueContainer = document.getElementById('multi-value-fields');
            const outputCount = multiValueContainer ? multiValueContainer.children.length : 1;
            for (let i = 0; i < outputCount; i++) {
                const registerValue = modbusRegister + i;
                if (sensor.modbusRegister === registerValue || 
                    (sensor.multiValues && sensor.multiValues.some(mv => mv.register === registerValue))) {
                    return true;
                }
            }
        }
        
        return false;
    });
    
    if (conflictingSensor) {
        showToast(`Modbus register conflict with sensor "${conflictingSensor.name}"`, 'error');
        return;
    }
    
    // Get calibration data based on selected method
    const selectedCalibrationMethod = document.querySelector('input[name="sensor-calibration-method"]:checked').value;
    let calibration = {};
    
    try {
        switch (selectedCalibrationMethod) {
            case 'linear':
                const offset = parseFloat(document.getElementById('sensor-calibration-offset').value) || 0;
                const scale = parseFloat(document.getElementById('sensor-calibration-scale').value) || 1;
                
                if (scale === 0) {
                    showToast('Scale factor cannot be zero', 'error');
                    return;
                }
                
                calibration = {
                    offset: offset,
                    scale: scale,
                    expression: '',
                    polynomialStr: ''
                };
                break;
                
            case 'polynomial':
                const polynomial = document.getElementById('sensor-calibration-polynomial').value.trim();
                const polyValidation = validatePolynomial(polynomial);
                
                if (!polyValidation.valid) {
                    showToast(polyValidation.error, 'error');
                    return;
                }
                
                calibration = {
                    polynomialStr: polynomial,
                    offset: 0,
                    scale: 1,
                    expression: ''
                };
                break;
                
            case 'expression':
                const expression = document.getElementById('sensor-calibration-expression').value.trim();
                const exprValidation = validateExpression(expression);
                
                if (!exprValidation.valid) {
                    showToast(exprValidation.error, 'error');
                    return;
                }
                
                calibration = {
                    expression: expression,
                    offset: 0,
                    scale: 1,
                    polynomialStr: ''
                };
                break;
                
            default:
                showToast('Invalid calibration method selected', 'error');
                return;
        }
        
    } catch (error) {
        console.error('Error processing calibration:', error);
        showToast('Error processing calibration: ' + error.message, 'error');
        return;
    }
    
    // Capture pin assignments based on protocol
    let pinAssignments = {};
    
    switch (protocol) {
        case 'I2C':
            const i2cPinPair = document.getElementById('sensor-i2c-pins').value;
            if (i2cPinPair) {
                const [sdaPin, sclPin] = i2cPinPair.split(',').map(p => parseInt(p));
                pinAssignments.sdaPin = sdaPin;
                pinAssignments.sclPin = sclPin;
            }
            break;
            
        case 'UART':
            const uartPinPair = document.getElementById('sensor-uart-pins').value;
            if (uartPinPair) {
                const [txPin, rxPin] = uartPinPair.split(',').map(p => parseInt(p));
                pinAssignments.uartTxPin = txPin;
                pinAssignments.uartRxPin = rxPin;
            }
            break;
            
        case 'Analog Voltage':
            const analogPin = document.getElementById('sensor-analog-pin').value;
            if (analogPin) {
                pinAssignments.analogPin = parseInt(analogPin);
            }
            break;
            
        case 'One-Wire':
            const oneWirePin = document.getElementById('sensor-onewire-pin').value;
            if (oneWirePin) {
                pinAssignments.oneWirePin = parseInt(oneWirePin);
            }
            
            // Add One-Wire specific configuration
            const oneWireAuto = document.getElementById('sensor-onewire-auto').checked;
            const oneWireCommand = document.getElementById('sensor-onewire-command').value === 'custom' 
                ? document.getElementById('sensor-onewire-command-custom').value 
                : document.getElementById('sensor-onewire-command').value;
            const oneWireInterval = parseInt(document.getElementById('sensor-onewire-interval').value) || 5;
            const oneWireConversionTime = parseInt(document.getElementById('sensor-onewire-conversion-time').value) || 750;
            
            pinAssignments.oneWireAutoMode = oneWireAuto;
            pinAssignments.oneWireCommand = oneWireCommand;
            pinAssignments.oneWireInterval = oneWireInterval;
            pinAssignments.oneWireConversionTime = oneWireConversionTime;
            break;
            
        case 'Digital Counter':
            const digitalPin = document.getElementById('sensor-digital-pin').value;
            if (digitalPin) {
                pinAssignments.digitalPin = parseInt(digitalPin);
            }
            break;
    }

    // Collect data parsing configuration
    let dataParsing = null;
    const dataParsingSection = document.getElementById('data-parsing-section');
    if (dataParsingSection.style.display !== 'none') {
        const parsingMethod = document.getElementById('sensor-data-parsing').value;
        
        if (parsingMethod !== 'raw') {
            dataParsing = { method: parsingMethod };
            
            switch (parsingMethod) {
                case 'custom_bits':
                    const bitPositions = document.getElementById('sensor-bit-positions').value.trim();
                    if (bitPositions) {
                        dataParsing.bitPositions = bitPositions;
                    }
                    break;
                    
                case 'bit_field':
                    const bitStart = document.getElementById('sensor-bit-start').value;
                    const bitLength = document.getElementById('sensor-bit-length').value;
                    if (bitStart !== '' && bitLength !== '') {
                        dataParsing.bitStart = parseInt(bitStart);
                        dataParsing.bitLength = parseInt(bitLength);
                    }
                    break;
                    
                case 'status_register':
                    const statusBits = document.getElementById('sensor-status-bits').value.trim();
                    if (statusBits) {
                        dataParsing.statusBits = statusBits;
                    }
                    break;
                    
                case 'json_path':
                    const jsonPath = document.getElementById('sensor-json-path').value.trim();
                    if (jsonPath) {
                        dataParsing.jsonPath = jsonPath;
                    }
                    break;
                    
                case 'csv_column':
                    const csvColumn = document.getElementById('sensor-csv-column').value;
                    const csvDelimiter = document.getElementById('sensor-csv-delimiter').value;
                    if (csvColumn !== '') {
                        dataParsing.csvColumn = parseInt(csvColumn);
                        dataParsing.csvDelimiter = csvDelimiter || ',';
                    }
                    break;
            }
        }
    }

    // Collect multi-value sensor configuration
    let multiValues = null;
    if (document.getElementById('sensor-multi-value').checked) {
        const multiValueFields = document.querySelectorAll('.multi-value-item');
        if (multiValueFields.length > 0) {
            multiValues = [];
            multiValueFields.forEach((field, index) => {
                const name = document.getElementById(`multi-name-${index}`)?.value?.trim() || `Value ${index + 1}`;
                const position = document.getElementById(`multi-position-${index}`)?.value?.trim() || '';
                const register = parseInt(document.getElementById(`multi-register-${index}`)?.value) || (modbusRegister + index);
                const scale = parseFloat(document.getElementById(`multi-scale-${index}`)?.value) || 1.0;
                const offset = parseFloat(document.getElementById(`multi-offset-${index}`)?.value) || 0.0;
                const units = document.getElementById(`multi-units-${index}`)?.value?.trim() || '';

                multiValues.push({
                    name: name,
                    position: position,
                    register: register,
                    scale: scale,
                    offset: offset,
                    units: units
                });
            });
        }
    }

    // Get bus polling frequency based on protocol
    let pollingFrequency = 1000; // Default 1 second
    switch (protocol) {
        case 'I2C':
            pollingFrequency = parseInt(document.getElementById('sensor-i2c-polling').value) || 1000;
            break;
        case 'UART':
            pollingFrequency = parseInt(document.getElementById('sensor-uart-polling').value) || 1000;
            break;
        case 'One-Wire':
            pollingFrequency = parseInt(document.getElementById('sensor-onewire-polling').value) || 1000;
            break;
    }

    // Get sensor command configuration for generic sensors
    let sensorCommand = null;
    if (isGenericSensor(type)) {
        const command = document.getElementById('sensor-command').value.trim();
        const commandWait = parseInt(document.getElementById('sensor-command-wait').value) || 750;
        if (command) {
            sensorCommand = {
                command: command,
                waitTime: commandWait
            };
        }
    }

    const sensor = {
        enabled: enabled,
        name: name,
        protocol: protocol,
        type: type,
        i2cAddress: i2cAddress,
        modbusRegister: modbusRegister,
        calibration: calibration,
        pollingFrequency: pollingFrequency,
        ...pinAssignments,
        ...(sensorCommand && { command: sensorCommand })
    };
    
    // Add multi-value config if it exists
    if (multiValues && multiValues.length > 0) {
        sensor.multiValues = multiValues;
    }
    
    // Add data parsing config if it exists
    if (dataParsing) {
        sensor.dataParsing = dataParsing;
    }
    
    if (editingSensorIndex === -1) {
        // Adding new sensor
        if (sensorConfigData.length >= 10) { // MAX_SENSORS from backend
            showToast('Maximum number of sensors (10) reached', 'error');
            return;
        }
        sensorConfigData.push(sensor);
        console.log('Sensor added to array:', sensor);
        console.log('Current sensor array:', sensorConfigData);
        showToast('Sensor added successfully', 'success');
    } else {
        // Updating existing sensor
        sensorConfigData[editingSensorIndex] = sensor;
        console.log('Sensor updated:', sensor);
        showToast('Sensor updated successfully', 'success');
    }
    
    console.log('About to render table...');
    updateSensorTableBody();
    console.log('Table rendered, hiding modal...');
    hideSensorModal();
}

// Show calibration modal for a specific sensor
window.calibrateSensor = function calibrateSensor(index) {
    if (index < 0 || index >= sensorConfigData.length) {
        showToast('Invalid sensor index', 'error');
        return;
    }
    
    const sensor = sensorConfigData[index];
    editingSensorIndex = index;
    
    document.getElementById('calibration-modal-title').textContent = `Calibrate ${sensor.name}`;
    document.getElementById('calibration-sensor-name').textContent = sensor.name;
    document.getElementById('calibration-sensor-type').textContent = sensor.type;
    
    // Setup calibration method listeners
    setupCalibrationMethodListeners();
    
    // Load current calibration values and determine method
    if (sensor.calibration) {
        if (sensor.calibration.expression && sensor.calibration.expression.trim() !== '') {
            // Expression calibration
            document.getElementById('method-expression').checked = true;
            document.getElementById('calibration-expression').value = sensor.calibration.expression;
            showCalibrationMethod('expression');
        } else if (sensor.calibration.polynomialStr && sensor.calibration.polynomialStr.trim() !== '') {
            // Polynomial calibration
            document.getElementById('method-polynomial').checked = true;
            document.getElementById('calibration-polynomial').value = sensor.calibration.polynomialStr;
            showCalibrationMethod('polynomial');
        } else {
            // Linear calibration
            document.getElementById('method-linear').checked = true;
            document.getElementById('calibration-offset').value = sensor.calibration.offset || 0;
            document.getElementById('calibration-scale').value = sensor.calibration.scale || 1;
            showCalibrationMethod('linear');
        }
    } else {
        // Default to linear calibration
        document.getElementById('method-linear').checked = true;
        document.getElementById('calibration-offset').value = 0;
        document.getElementById('calibration-scale').value = 1;
        document.getElementById('calibration-polynomial').value = '';
        document.getElementById('calibration-expression').value = '';
        showCalibrationMethod('linear');
    }
    
    document.getElementById('calibration-modal-overlay').classList.add('show');
}

// Setup calibration method radio button listeners
window.setupCalibrationMethodListeners = function setupCalibrationMethodListeners() {
    const methodRadios = document.querySelectorAll('input[name="calibration-method"]');
    methodRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.checked) {
                showCalibrationMethod(this.value);
            }
        });
    });
}

// Show the appropriate calibration method section
window.showCalibrationMethod = function showCalibrationMethod(method) {
    // Hide all calibration sections
    document.getElementById('linear-calibration').style.display = 'none';
    document.getElementById('polynomial-calibration').style.display = 'none';
    document.getElementById('expression-calibration').style.display = 'none';
    
    // Show the selected method
    switch (method) {
        case 'linear':
            document.getElementById('linear-calibration').style.display = 'block';
            break;
        case 'polynomial':
            document.getElementById('polynomial-calibration').style.display = 'block';
            break;
        case 'expression':
            document.getElementById('expression-calibration').style.display = 'block';
            break;
    }
}

// Preset tab management
window.showPresetTab = function showPresetTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.preset-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Show corresponding preset content
    document.querySelectorAll('.preset-content').forEach(content => {
        content.style.display = 'none';
    });
    document.getElementById(tabName + '-presets').style.display = 'block';
}

// Preset functions
window.setLinearPreset = function setLinearPreset(offset, scale) {
    document.getElementById('method-linear').checked = true;
    document.getElementById('calibration-offset').value = offset;
    document.getElementById('calibration-scale').value = scale;
    showCalibrationMethod('linear');
}

window.setPolynomialPreset = function setPolynomialPreset(polynomial) {
    document.getElementById('method-polynomial').checked = true;
    document.getElementById('calibration-polynomial').value = polynomial;
    showCalibrationMethod('polynomial');
}

window.setExpressionPreset = function setExpressionPreset(expression) {
    document.getElementById('method-expression').checked = true;
    document.getElementById('calibration-expression').value = expression;
    showCalibrationMethod('expression');
}

// Client-side validation for expressions and polynomials
window.validateExpression = function validateExpression(expression) {
    if (!expression || expression.trim() === '') {
        return { valid: false, error: 'Expression cannot be empty' };
    }
    
    // Check for allowed characters only
    const allowedChars = /^[0-9+\-*/.()x\s]+$/;
    if (!allowedChars.test(expression)) {
        return { valid: false, error: 'Expression contains invalid characters. Only +, -, *, /, (), x, and numbers are allowed.' };
    }
    
    // Check for balanced parentheses
    let openCount = 0;
    let closeCount = 0;
    for (let char of expression) {
        if (char === '(') openCount++;
        if (char === ')') closeCount++;
    }
    if (openCount !== closeCount) {
        return { valid: false, error: 'Unbalanced parentheses in expression' };
    }
    
    // Check for dangerous patterns
    if (expression.includes('..') || expression.includes('//')) {
        return { valid: false, error: 'Invalid pattern in expression' };
    }
    
    return { valid: true };
}

window.validatePolynomial = function validatePolynomial(polynomial) {
    if (!polynomial || polynomial.trim() === '') {
        return { valid: false, error: 'Polynomial cannot be empty' };
    }
    
    // Basic validation for polynomial format
    const polynomialPattern = /^[+\-]?\s*\d*\.?\d*\s*\*?\s*x?(\^\d+)?\s*([+\-]\s*\d*\.?\d*\s*\*?\s*x?(\^\d+)?\s*)*$/;
    if (!polynomialPattern.test(polynomial.replace(/\s/g, ''))) {
        return { valid: false, error: 'Invalid polynomial format. Use format like: 2x^2 + 3x + 1' };
    }
    
    return { valid: true };
}

// Hide calibration modal
window.hideCalibrationModal = function hideCalibrationModal() {
    document.getElementById('calibration-modal-overlay').classList.remove('show');
    document.getElementById('calibration-modal-overlay').style.display = 'none';
    editingSensorIndex = -1;
    window.currentCalibrationSensor = null;
}

// Save calibration data
window.saveCalibration = function saveCalibration() {
    // Check if we're using the new data flow interface
    if (window.currentCalibraSensor) {
        return saveDataFlowCalibration();
    }
    
    // Legacy sensor config mode
    if (editingSensorIndex < 0 || editingSensorIndex >= sensorConfigData.length) {
        showToast('Invalid sensor selected', 'error');
        return;
    }
    
    // Get selected calibration method
    const selectedMethod = document.querySelector('input[name="calibration-method"]:checked').value;
    
    // Initialize calibration object
    const calibration = {};
    
    try {
        switch (selectedMethod) {
            case 'linear':
                const offset = parseFloat(document.getElementById('calibration-offset').value) || 0;
                const scale = parseFloat(document.getElementById('calibration-scale').value) || 1;
                
                if (scale === 0) {
                    showToast('Scale factor cannot be zero', 'error');
                    return;
                }
                
                calibration.offset = offset;
                calibration.scale = scale;
                // Clear other calibration methods
                calibration.expression = '';
                calibration.polynomialStr = '';
                break;
                
            case 'polynomial':
                const polynomial = document.getElementById('calibration-polynomial').value.trim();
                const polyValidation = validatePolynomial(polynomial);
                
                if (!polyValidation.valid) {
                    showToast(polyValidation.error, 'error');
                    return;
                }
                
                calibration.polynomialStr = polynomial;
                // Clear other calibration methods
                calibration.offset = 0;
                calibration.scale = 1;
                calibration.expression = '';
                break;
                
            case 'expression':
                const expression = document.getElementById('calibration-expression').value.trim();
                const exprValidation = validateExpression(expression);
                
                if (!exprValidation.valid) {
                    showToast(exprValidation.error, 'error');
                    return;
                }
                
                calibration.expression = expression;
                // Clear other calibration methods
                calibration.offset = 0;
                calibration.scale = 1;
                calibration.polynomialStr = '';
                break;
                
            default:
                showToast('Invalid calibration method selected', 'error');
                return;
        }
        
        // Update sensor calibration
        sensorConfigData[editingSensorIndex].calibration = calibration;
        
        // Update UI
        updateSensorTableBody();
        hideCalibrationModal();
        
        showToast(`Calibration updated successfully (${selectedMethod})`, 'success');
        
    } catch (error) {
        console.error('Error saving calibration:', error);
        showToast('Error saving calibration: ' + error.message, 'error');
    }
}

// Reset calibration to defaults
window.resetCalibration = function resetCalibration() {
    // Reset linear calibration
    document.getElementById('calibration-offset').value = 0;
    document.getElementById('calibration-scale').value = 1;
    
    // Clear polynomial and expression
    document.getElementById('calibration-polynomial').value = '';
    document.getElementById('calibration-expression').value = '';
    
    // Set to linear method
    document.getElementById('method-linear').checked = true;
    showCalibrationMethod('linear');
}

// Delete sensor
window.deleteSensor = function deleteSensor(index) {
    if (index < 0 || index >= sensorConfigData.length) {
        showToast('Invalid sensor index', 'error');
        return;
    }
    
    const sensor = sensorConfigData[index];
    if (confirm(`Are you sure you want to delete sensor "${sensor.name}"?`)) {
        sensorConfigData.splice(index, 1);
        updateSensorTableBody();
        showToast('Sensor deleted successfully', 'success');
    }
}

// Update IO Status data and refresh displays
let consecutiveErrors = 0;
let lastSuccessfulUpdate = Date.now();

window.updateIOStatus = function updateIOStatus() {
    // Don't spam requests if we're having connection issues
    if (consecutiveErrors > 3) {
        const timeSinceLastSuccess = Date.now() - lastSuccessfulUpdate;
        if (timeSinceLastSuccess < 10000) { // Wait 10 seconds before retrying
            console.log('Skipping update due to recent errors');
            return;
        }
        consecutiveErrors = 0; // Reset counter and try again
    }

    fetch('/iostatus')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            consecutiveErrors = 0; // Reset error counter on success
            lastSuccessfulUpdate = Date.now();
            currentIOStatus = data;
            
            // Update sensor dataflow display
            updateSensorDataFlow(data.configured_sensors || []);
            
            // Clear any previous error messages
            const errorDiv = document.getElementById('connection-error');
            if (errorDiv) {
                errorDiv.style.display = 'none';
            }
        })
        .catch(error => {
            consecutiveErrors++;
            console.error('Error fetching IO status:', error);
            
            // Only show toast on first error
            if (consecutiveErrors === 1) {
                showToast('Connection issue detected', 'warning');
            }
            
            // Show persistent error message if we've had multiple failures
            if (consecutiveErrors > 2) {
                const errorDiv = document.getElementById('connection-error') || createErrorDiv();
                errorDiv.textContent = 'Connection lost - will keep retrying...';
                errorDiv.style.display = 'block';
            }
        });
};

function createErrorDiv() {
    const div = document.createElement('div');
    div.id = 'connection-error';
    div.style.cssText = 'position: fixed; top: 10px; right: 10px; background: #ff6b6b; color: white; padding: 10px; border-radius: 4px; display: none;';
    document.body.appendChild(div);
    return div;
}

// Function to update sensor dataflow display
function updateSensorDataFlow(sensors) {
    // Clear all sensor flow containers
    const containers = [
        'i2c-sensors-flow', 
        'uart-sensors-flow', 
        'analog-sensors-flow', 
        'onewire-sensors-flow', 
        'digital-sensors-flow'
    ];
    
    containers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '';
        }
    });
    
    // Group sensors by protocol
    const sensorsByProtocol = {
        'I2C': [],
        'UART': [],
        'Analog Voltage': [],
        'One-Wire': [],
        'Digital Counter': []
    };
    
    sensors.forEach(sensor => {
        const protocol = sensor.protocol || 'Unknown';
        if (sensorsByProtocol[protocol]) {
            sensorsByProtocol[protocol].push(sensor);
        }
    });
    
    // Update each protocol section
    updateProtocolSensorFlow('I2C', sensorsByProtocol['I2C'], 'i2c-sensors-flow');
    updateProtocolSensorFlow('UART', sensorsByProtocol['UART'], 'uart-sensors-flow');
    updateProtocolSensorFlow('Analog Voltage', sensorsByProtocol['Analog Voltage'], 'analog-sensors-flow');
    updateProtocolSensorFlow('One-Wire', sensorsByProtocol['One-Wire'], 'onewire-sensors-flow');
    updateProtocolSensorFlow('Digital Counter', sensorsByProtocol['Digital Counter'], 'digital-sensors-flow');
}

// Function to update sensor flow for a specific protocol
function updateProtocolSensorFlow(protocol, sensors, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (sensors.length === 0) {
        container.innerHTML = '<div class="no-sensors">No ' + protocol + ' sensors configured</div>';
        return;
    }
    
    sensors.forEach(sensor => {
        const sensorDiv = document.createElement('div');
        sensorDiv.className = 'sensor-dataflow-item';
        
        const now = Date.now();
        const lastRead = sensor.last_read_time || 0;
        const staleData = (now - lastRead) > 10000; // More than 10 seconds old
        
        let rawDataDisplay = '';
        if (sensor.raw_i2c_data && sensor.raw_i2c_data.length > 0) {
            rawDataDisplay = `<div class="raw-data-string">Raw Data: ${sensor.raw_i2c_data}</div>`;
        }
        
        // Check if this is a multi-value sensor (either configured multiValues or has secondary values like SHT30)
        const isMultiValue = (sensor.multiValues && sensor.multiValues.length > 0) || 
                           sensor.raw_value_b !== undefined || 
                           sensor.type === 'SHT30';
        
        let dataflowHTML = '';
        
        if (isMultiValue && sensor.type === 'SHT30') {
            // Special handling for SHT30 dual output (temperature + humidity)
            dataflowHTML = `<div class="multi-value-dataflow">`;
            
            // Temperature (primary value)
            dataflowHTML += `
                <div class="value-dataflow ${staleData ? 'stale-data' : ''}">
                    <div class="value-label">Temperature (°C)</div>
                    <div class="dataflow-chain">
                        <div class="dataflow-step raw-step">
                            <div class="step-label">Raw</div>
                            <div class="step-value">${sensor.raw_value !== undefined ? sensor.raw_value.toFixed(2) : 'N/A'}</div>
                        </div>
                        <div class="dataflow-arrow">→</div>
                        <div class="dataflow-step calibrated-step">
                            <div class="step-label">Calibrated</div>
                            <div class="step-value">${sensor.calibrated_value !== undefined ? sensor.calibrated_value.toFixed(2) : 'N/A'}</div>
                            <div class="calibration-info">
                                <small>×${sensor.calibration_slope || 1} + ${sensor.calibration_offset || 0}</small>
                            </div>
                        </div>
                        <div class="dataflow-arrow">→</div>
                        <div class="dataflow-step modbus-step">
                            <div class="step-label">Modbus Reg ${sensor.modbus_register}</div>
                            <div class="step-value">${sensor.modbus_value !== undefined ? sensor.modbus_value : 'N/A'}</div>
                        </div>
                    </div>
                </div>`;
            
            // Humidity (secondary value)
            if (sensor.raw_value_b !== undefined) {
                dataflowHTML += `
                    <div class="value-dataflow ${staleData ? 'stale-data' : ''}">
                        <div class="value-label">Humidity (%RH)</div>
                        <div class="dataflow-chain">
                            <div class="dataflow-step raw-step">
                                <div class="step-label">Raw</div>
                                <div class="step-value">${sensor.raw_value_b.toFixed(2)}</div>
                            </div>
                            <div class="dataflow-arrow">→</div>
                            <div class="dataflow-step calibrated-step">
                                <div class="step-label">Calibrated</div>
                                <div class="step-value">${sensor.calibrated_value_b !== undefined ? sensor.calibrated_value_b.toFixed(2) : 'N/A'}</div>
                                <div class="calibration-info">
                                    <small>×${sensor.calibration_slope_b || 1} + ${sensor.calibration_offset_b || 0}</small>
                                </div>
                            </div>
                            <div class="dataflow-arrow">→</div>
                            <div class="dataflow-step modbus-step">
                                <div class="step-label">Modbus Reg ${sensor.modbus_register_b || (sensor.modbus_register + 1)}</div>
                                <div class="step-value">${sensor.modbus_value_b !== undefined ? sensor.modbus_value_b : 'N/A'}</div>
                            </div>
                        </div>
                    </div>`;
            }
            
            dataflowHTML += `</div>`;
            
        } else if (isMultiValue) {
            // Multi-value sensor: show each value's dataflow
            dataflowHTML = `<div class="multi-value-dataflow">`;
            sensor.multiValues.forEach((valueConfig, index) => {
                const valueKey = `value_${index}`;
                const rawValue = sensor[`raw_${valueKey}`] || sensor.raw_value;
                const calibratedValue = sensor[`calibrated_${valueKey}`] || sensor.calibrated_value;
                const modbusValue = sensor[`modbus_${valueKey}`] || sensor.modbus_value;
                
                dataflowHTML += `
                    <div class="value-dataflow ${staleData ? 'stale-data' : ''}">
                        <div class="value-label">${valueConfig.name} ${valueConfig.units ? '(' + valueConfig.units + ')' : ''}</div>
                        <div class="dataflow-chain">
                            <div class="dataflow-step raw-step">
                                <div class="step-label">Raw</div>
                                <div class="step-value">${rawValue !== undefined ? rawValue.toFixed(2) : 'N/A'}</div>
                            </div>
                            <div class="dataflow-arrow">→</div>
                            <div class="dataflow-step calibrated-step">
                                <div class="step-label">Calibrated</div>
                                <div class="step-value">${calibratedValue !== undefined ? calibratedValue.toFixed(2) : 'N/A'}</div>
                                <div class="calibration-info">
                                    Offset: ${valueConfig.offset || 0}, 
                                    Scale: ${valueConfig.scale || 1}
                                </div>
                            </div>
                            <div class="dataflow-arrow">→</div>
                            <div class="dataflow-step modbus-step">
                                <div class="step-label">Modbus Reg ${valueConfig.register}</div>
                                <div class="step-value">${modbusValue !== undefined ? modbusValue : 'N/A'}</div>
                            </div>
                        </div>
                    </div>
                `;
            });
            dataflowHTML += `</div>`;
        } else {
            // Single-value sensor: show standard dataflow
            dataflowHTML = `
                <div class="dataflow-chain ${staleData ? 'stale-data' : ''}">
                    <div class="dataflow-step raw-step">
                        <div class="step-label">Raw Value</div>
                        <div class="step-value">${sensor.raw_value !== undefined ? sensor.raw_value.toFixed(2) : 'N/A'}</div>
                    </div>
                    <div class="dataflow-arrow">→</div>
                    <div class="dataflow-step calibrated-step">
                        <div class="step-label">Calibrated</div>
                        <div class="step-value">${sensor.calibrated_value !== undefined ? sensor.calibrated_value.toFixed(2) : 'N/A'}</div>
                        <div class="calibration-info">
                            Offset: ${sensor.calibration_offset || 0}, 
                            Slope: ${sensor.calibration_slope || 1}
                        </div>
                    </div>
                    <div class="dataflow-arrow">→</div>
                    <div class="dataflow-step modbus-step">
                        <div class="step-label">Modbus Reg ${sensor.modbus_register}</div>
                        <div class="step-value">${sensor.modbus_value !== undefined ? sensor.modbus_value : 'N/A'}</div>
                    </div>
                </div>
            `;
        }
        
        sensorDiv.innerHTML = `
            <div class="sensor-name">${sensor.name} (${sensor.type}) ${isMultiValue ? '<span class="multi-value-badge">Multi-Value</span>' : ''}</div>
            <div class="sensor-details">
                ${protocol === 'I2C' ? `Address: 0x${sensor.i2c_address.toString(16).toUpperCase().padStart(2, '0')}` : ''}
                ${sensor.sda_pin !== undefined ? `SDA: GP${sensor.sda_pin}, SCL: GP${sensor.scl_pin}` : ''}
                ${sensor.analog_pin !== undefined ? `Pin: ${sensor.analog_pin}` : ''}
                ${sensor.digital_pin !== undefined ? `Pin: ${sensor.digital_pin}` : ''}
                ${sensor.onewire_pin !== undefined ? `Pin: ${sensor.onewire_pin}` : ''}
                ${sensor.uart_tx_pin !== undefined ? `TX: ${sensor.uart_tx_pin}, RX: ${sensor.uart_rx_pin}` : ''}
            </div>
            ${rawDataDisplay}
            ${dataflowHTML}
            ${staleData ? '<div class="stale-warning">⚠️ Data may be stale</div>' : ''}
        `;
        
        container.appendChild(sensorDiv);
    });
}

// Load sensor configuration from device
window.loadSensorConfig = function loadSensorConfig() {
    fetch('/sensors/config')
        .then(response => response.json())
        .then(data => {
            if (data.sensors && Array.isArray(data.sensors)) {
                window.sensorConfigData = data.sensors;
                updateSensorTableBody();
                console.log('Sensor configuration loaded:', data.sensors);
            } else {
                window.sensorConfigData = [];
                updateSensorTableBody();
                console.log('No sensor configuration found, initialized empty array');
            }
        })
        .catch(error => {
            console.error('Error loading sensor configuration:', error);
            window.sensorConfigData = [];
            updateSensorTableBody();
            showToast('Failed to load sensor configuration', 'error');
        });
};

// Save sensor configuration to the device
window.saveSensorConfig = function saveSensorConfig() {
    console.log("Saving sensor configuration:", sensorConfigData);
    
    // Show loading toast
    const loadingToast = showToast('Saving sensor configuration...', 'info');
    
    const configData = {
        sensors: sensorConfigData
    };
    
    fetch('/sensors/config', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(configData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        // Remove loading toast
        document.getElementById('toast-container').removeChild(loadingToast);
        
        if (data.success) {
            // Show success message and immediately refresh sensor data
            showToast('Sensor configuration saved successfully!', 'success');
            
            // Close the sensor config modal
            const modal = document.getElementById('sensor-config-modal');
            if (modal) {
                modal.style.display = 'none';
            }
            
            // Immediately refresh the Status IO to show new sensors
            setTimeout(() => {
                updateIOStatus();
                loadSensorConfig(); // Refresh the sensor config list too
            }, 500); // Quick delay to ensure backend has processed
        } else {
            showToast('Failed to save sensor configuration: ' + (data.message || 'Unknown error'), 'error', false, 5000);
        }
    })
    .catch(error => {
        // Remove loading toast if it exists
        if (document.getElementById('toast-container').contains(loadingToast)) {
            document.getElementById('toast-container').removeChild(loadingToast);
        }
        
        // Show actual error since we're not rebooting anymore
        showToast('Error saving sensor configuration: ' + error.message, 'error', false, 5000);
    });
}

// EZO Calibration Functions

window.showEzoCalibrationModal = function showEzoCalibrationModal(index) {
    if (index < 0 || index >= sensorConfigData.length) {
        showToast('Invalid sensor index', 'error');
        return;
    }
    
    const sensor = sensorConfigData[index];
    if (!sensor.type.startsWith('EZO_')) {
        showToast('This sensor is not an EZO sensor', 'error');
        return;
    }
    
    currentEzoSensorIndex = index;
    
    // Update modal title and sensor info
    document.getElementById('ezo-calibration-modal-title').textContent = `EZO Calibration - ${sensor.name}`;
    document.getElementById('ezo-calibration-sensor-name').textContent = sensor.name;
    document.getElementById('ezo-calibration-sensor-type').textContent = sensor.type;
    document.getElementById('ezo-calibration-sensor-address').textContent = `0x${sensor.i2cAddress.toString(16).toUpperCase().padStart(2, '0')}`;
    
    // Clear previous response
    document.getElementById('ezo-sensor-response').textContent = 'No response yet';
    
    // Get calibration config for this sensor type
    const calibrationConfig = EZO_CALIBRATION_CONFIG[sensor.type];
    if (!calibrationConfig) {
        showToast(`Calibration not supported for sensor type: ${sensor.type}`, 'error');
        return;
    }
    
    // Populate calibration buttons
    const buttonsContainer = document.getElementById('ezo-calibration-buttons');
    buttonsContainer.innerHTML = calibrationConfig.buttons.map(button => {
        const buttonClass = `calibration-btn ${button.type}`;
        const onclick = button.needsValue ? 
            `sendEzoCalibrationCommandWithValue('${button.command}', '${button.label}')` :
            `sendEzoCalibrationCommand('${button.command}')`;
        
        return `<button class="${buttonClass}" onclick="${onclick}" title="${button.description}">
            ${button.label}
        </button>`;
    }).join('');
    
    // Populate calibration notes
    const notesContainer = document.getElementById('ezo-calibration-notes');
    notesContainer.innerHTML = '<ul>' + calibrationConfig.notes.map(note => `<li>${note}</li>`).join('') + '</ul>';
    
    // Show the modal
    document.getElementById('ezo-calibration-modal-overlay').classList.add('show');
}

window.hideEzoCalibrationModal = function hideEzoCalibrationModal() {
    document.getElementById('ezo-calibration-modal-overlay').classList.remove('show');
    currentEzoSensorIndex = -1;
}

window.sendEzoCalibrationCommand = function sendEzoCalibrationCommand(command) {
    if (currentEzoSensorIndex < 0) {
        showToast('No sensor selected for calibration', 'error');
        return;
    }
    
    const sensor = sensorConfigData[currentEzoSensorIndex];
    console.log(`Sending EZO calibration command '${command}' to sensor ${sensor.name}`);
    
    fetch('/api/sensor/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            sensorIndex: currentEzoSensorIndex, 
            command: command 
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showToast(`Command '${command}' sent successfully`, 'success');
            // Clear the response display and show "Waiting..."
            document.getElementById('ezo-sensor-response').textContent = 'Waiting for response...';
        } else {
            showToast(`Failed to send command: ${data.message}`, 'error');
        }
    })
    .catch(error => {
        showToast(`Error sending command: ${error.message}`, 'error');
    });
}

window.sendEzoCalibrationCommandWithValue = function sendEzoCalibrationCommandWithValue(commandTemplate, buttonLabel) {
    const value = prompt(`Enter the value for ${buttonLabel}:`);
    if (value === null) return; // User cancelled
    
    if (!value.trim()) {
        showToast('Please enter a valid value', 'error');
        return;
    }
    
    // Replace {value} placeholder with the entered value
    const command = commandTemplate.replace('{value}', value.trim());
    sendEzoCalibrationCommand(command);
}

// ==================== TERMINAL FUNCTIONALITY ====================

let watchInterval = null;
let isWatching = false;
let displayedLogs = new Set(); // Track displayed terminal logs to avoid duplicates

// Update the terminal interface based on selected protocol
window.updateTerminalInterface = function updateTerminalInterface() {
    const protocol = document.getElementById('terminal-protocol').value;
    const pinSelector = document.getElementById('terminal-pin');
    const i2cAddressGroup = document.getElementById('i2c-address-group');
    const commandInput = document.getElementById('terminal-command');
    
    // Clear current options
    pinSelector.innerHTML = '<option value="">Select pin/port...</option>';
    
    // Hide/show I2C address field
    i2cAddressGroup.style.display = protocol === 'i2c' ? 'block' : 'none';
    
    // Populate pin/port options based on protocol and configured sensors
    switch (protocol) {
        case 'digital':
            for (let i = 0; i < 8; i++) {
                pinSelector.innerHTML += `<option value="DI${i}">DI${i} - Digital Input ${i}</option>`;
                pinSelector.innerHTML += `<option value="DO${i}">DO${i} - Digital Output ${i}</option>`;
            }
            commandInput.placeholder = 'Commands: read, write 1/0, config pullup/invert/latch';
            break;
        
        case 'analog':
            for (let i = 0; i < 3; i++) {
                pinSelector.innerHTML += `<option value="AI${i}">AI${i} - Analog Input ${i} (Pin ${26 + i})</option>`;
            }
            commandInput.placeholder = 'Commands: read, config';
            break;
            
        case 'i2c':
            // Add scan option for all pins
            pinSelector.innerHTML += '<option value="all">All I2C Pins (Scan Mode)</option>';
            
            // Add all possible I2C pin pairs (for bus-level monitoring)
            pinSelector.innerHTML += '<option value="4">GP4/GP5 (SDA/SCL)</option>';
            pinSelector.innerHTML += '<option value="6">GP6/GP7 (SDA/SCL)</option>';
            pinSelector.innerHTML += '<option value="8">GP8/GP9 (SDA/SCL)</option>';
            pinSelector.innerHTML += '<option value="10">GP10/GP11 (SDA/SCL)</option>';
            pinSelector.innerHTML += '<option value="12">GP12/GP13 (SDA/SCL)</option>';
            pinSelector.innerHTML += '<option value="14">GP14/GP15 (SDA/SCL)</option>';
            pinSelector.innerHTML += '<option value="16">GP16/GP17 (SDA/SCL)</option>';
            pinSelector.innerHTML += '<option value="18">GP18/GP19 (SDA/SCL)</option>';
            pinSelector.innerHTML += '<option value="20">GP20/GP21 (SDA/SCL)</option>';
            pinSelector.innerHTML += '<option value="26">GP26/GP27 (SDA/SCL)</option>';
            
            // Add all configured sensors (both generic and auto-configured)
            if (sensorConfigData && sensorConfigData.length > 0) {
                sensorConfigData.forEach((sensor, index) => {
                    if (sensor.protocol === 'I2C' && sensor.enabled && sensor.name) {
                        const address = sensor.i2cAddress ? `0x${sensor.i2cAddress.toString(16).toUpperCase()}` : 'Unknown';
                        pinSelector.innerHTML += `<option value="${sensor.name}">${sensor.name} (${sensor.type}) - ${address}</option>`;
                    }
                });
            }
            commandInput.placeholder = 'Commands: scan, probe [address], read [reg], write [reg] [data]';
            break;
            
        case 'uart':
            // Always provide independent UART access
            pinSelector.innerHTML += '<option value="UART0">UART0 - TX: GP0 (Pin 1), RX: GP1 (Pin 2)</option>';
            pinSelector.innerHTML += '<option value="UART1">UART1 - TX: GP4 (Pin 6), RX: GP5 (Pin 7)</option>';
            
            // Add configured UART sensors as additional options
            if (sensorConfigData && sensorConfigData.length > 0) {
                sensorConfigData.forEach((sensor, index) => {
                    if (sensor.protocol === 'UART' && sensor.enabled) {
                        pinSelector.innerHTML += `<option value="${sensor.name}">${sensor.name} (TX:${sensor.uartTxPin || 0}, RX:${sensor.uartRxPin || 1})</option>`;
                    }
                });
            }
            commandInput.placeholder = 'Commands: init, send [data], read, baudrate [rate], status';
            break;
            
        case 'onewire':
            // Provide common One-Wire pin options
            pinSelector.innerHTML += '<option value="GP0">One-Wire GP0 (Pin 1)</option>';
            pinSelector.innerHTML += '<option value="GP1">One-Wire GP1 (Pin 2)</option>';
            pinSelector.innerHTML += '<option value="GP2">One-Wire GP2 (Pin 4)</option>';
            pinSelector.innerHTML += '<option value="GP3">One-Wire GP3 (Pin 5)</option>';
            pinSelector.innerHTML += '<option value="GP6">One-Wire GP6 (Pin 9)</option>';
            pinSelector.innerHTML += '<option value="GP7">One-Wire GP7 (Pin 10)</option>';
            pinSelector.innerHTML += '<option value="GP8">One-Wire GP8 (Pin 11)</option>';
            pinSelector.innerHTML += '<option value="GP9">One-Wire GP9 (Pin 12)</option>';
            pinSelector.innerHTML += '<option value="GP10">One-Wire GP10 (Pin 14)</option>';
            pinSelector.innerHTML += '<option value="GP11">One-Wire GP11 (Pin 15)</option>';
            pinSelector.innerHTML += '<option value="GP12">One-Wire GP12 (Pin 16)</option>';
            pinSelector.innerHTML += '<option value="GP13">One-Wire GP13 (Pin 17)</option>';
            pinSelector.innerHTML += '<option value="GP14">One-Wire GP14 (Pin 19)</option>';
            pinSelector.innerHTML += '<option value="GP15">One-Wire GP15 (Pin 20)</option>';
            pinSelector.innerHTML += '<option value="GP22">One-Wire GP22 (Pin 29)</option>';
            pinSelector.innerHTML += '<option value="GP26">One-Wire GP26 (Pin 31)</option>';
            pinSelector.innerHTML += '<option value="GP27">One-Wire GP27 (Pin 32)</option>';
            pinSelector.innerHTML += '<option value="GP28">One-Wire GP28 (Pin 34)</option>';
            
            // Add configured One-Wire sensors
            if (sensorConfigData && sensorConfigData.length > 0) {
                sensorConfigData.forEach((sensor, index) => {
                    if (sensor.protocol === 'One-Wire' && sensor.enabled) {
                        pinSelector.innerHTML += `<option value="${sensor.name}">${sensor.name} (GP${sensor.oneWirePin || 2})</option>`;
                    }
                });
            }
            commandInput.placeholder = 'Commands: scan, search, read, convert, power, reset, crc, info';
            break;
            
        case 'system':
            pinSelector.innerHTML += '<option value="System">System Information</option>';
            commandInput.placeholder = 'Commands: status, info, sensors';
            break;
            
        case 'network':
            pinSelector.innerHTML += '<option value="Ethernet Interface">Ethernet Interface</option>';
            pinSelector.innerHTML += '<option value="Modbus TCP Server">Modbus TCP Server</option>';
            pinSelector.innerHTML += '<option value="Connected Modbus Clients">Connected Modbus Clients</option>';
            commandInput.placeholder = 'Commands: status, clients, link, stats';
            break;
            
        default:
            pinSelector.innerHTML += '<option value="Any">Any</option>';
            commandInput.placeholder = 'Enter command...';
            break;
    }
}

// Handle Enter key in terminal command input
window.handleTerminalKeypress = function handleTerminalKeypress(event) {
    if (event.key === 'Enter') {
        sendTerminalCommand();
    }
}

// Send a terminal command
function sendTerminalCommand() {
    const protocol = document.getElementById('terminal-protocol').value;
    const pin = document.getElementById('terminal-pin').value;
    const command = document.getElementById('terminal-command').value.trim();
    const i2cAddress = document.getElementById('terminal-i2c-address').value;
    
    if (!command) {
        addTerminalOutput('Error: No command entered', 'error');
        return;
    }
    
    if (!pin && protocol !== 'system' && protocol !== 'network') {
        addTerminalOutput('Error: No pin/port selected', 'error');
        return;
    }
    
    // Check for I2C address - but not required for scan command or when using "Any"
    if (protocol === 'i2c' && !i2cAddress && command.toLowerCase() !== 'scan' && pin !== 'Any') {
        addTerminalOutput('Error: I2C address required (except for scan command)', 'error');
        return;
    }
    
    // Display the command in terminal
    addTerminalOutput(`> ${command}`, 'command');
    
    // Handle special commands locally
    if (command.toLowerCase() === 'help') {
        showTerminalHelp();
        return;
    }
    
    if (command.toLowerCase() === 'clear') {
        clearTerminalOutput();
        return;
    }
    
    // Send command to backend
    const payload = {
        protocol: protocol,
        pin: pin,
        command: command,
        i2cAddress: i2cAddress
    };
    
    fetch('/terminal/command', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            addTerminalOutput(data.response || 'Command executed successfully', 'success');
            
            // Show "Send to Config" button if response contains sensor data
            const response = data.response || '';
            if (response.includes('Raw Data:') || response.includes('OneWire:') || 
                response.includes('I2C:') || response.includes('Temperature:') ||
                response.includes('Humidity:') || response.includes('Pressure:')) {
                
                const sendToConfigBtn = document.getElementById('send-to-config-btn');
                sendToConfigBtn.style.display = 'inline-block';
                
                // Auto-hide after 30 seconds
                setTimeout(() => {
                    sendToConfigBtn.style.display = 'none';
                }, 30000);
            }
        } else {
            addTerminalOutput(data.error || 'Command failed', 'error');
        }
    })
    .catch(error => {
        addTerminalOutput(`Network error: ${error.message}`, 'error');
    });
    
    // Clear command input
    document.getElementById('terminal-command').value = '';
}

// Toggle watch mode
function toggleWatch() {
    const watchBtn = document.getElementById('watch-btn');
    const watchStatus = document.getElementById('watch-status');
    const protocol = document.getElementById('terminal-protocol').value;
    const pin = document.getElementById('terminal-pin').value;
    
    if (!pin && protocol !== 'system') {
        addTerminalOutput('Error: No pin/port selected for watching', 'error');
        return;
    }
    
    if (isWatching) {
        // Stop watching
        fetch('/terminal/stop-watch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'stopped') {
                clearInterval(watchInterval);
                isWatching = false;
                watchBtn.textContent = 'Start Watch';
                watchBtn.classList.remove('watching');
                watchStatus.textContent = '';
                watchStatus.classList.remove('watching');
                addTerminalOutput('Watch mode stopped', 'success');
            }
        })
        .catch(error => {
            console.error('Error stopping watch:', error);
            addTerminalOutput('Error stopping watch: ' + error.message, 'error');
        });
    } else {
        // Start watching
        const payload = {
            protocol: protocol,
            pin: pin
        };
        
        fetch('/terminal/start-watch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'started') {
                isWatching = true;
                watchBtn.textContent = 'Stop Watch';
                watchBtn.classList.add('watching');
                watchStatus.textContent = `Watching ${protocol} on ${pin}`;
                watchStatus.classList.add('watching');
                addTerminalOutput(`Started watching ${protocol} on pin ${pin}`, 'success');
                
                // Start polling for terminal logs
                watchInterval = setInterval(() => {
                    fetch('/terminal/logs')
                    .then(response => response.json())
                    .then(logs => {
                        // Show new logs that weren't displayed yet
                        logs.slice(-10).forEach(log => {
                            if (!displayedLogs.has(log)) {
                                addTerminalOutput(log, 'bus-traffic');
                                displayedLogs.add(log);
                            }
                        });
                        
                        // Keep only recent logs in memory to prevent memory leak
                        if (displayedLogs.size > 100) {
                            const logsArray = Array.from(displayedLogs);
                            displayedLogs.clear();
                            logsArray.slice(-50).forEach(log => displayedLogs.add(log));
                        }
                    })
                    .catch(error => {
                        console.error('Watch polling error:', error);
                    });
                }, 500); // Poll every 500ms for real-time feel
            } else {
                addTerminalOutput('Failed to start watch mode', 'error');
            }
        })
        .catch(error => {
            console.error('Error starting watch:', error);
            addTerminalOutput('Error starting watch: ' + error.message, 'error');
        });
    }
}

// Add output to terminal
function addTerminalOutput(text, type = 'response') {
    const terminal = document.getElementById('terminal-content');
    const div = document.createElement('div');
    div.className = `terminal-${type}`;
    div.textContent = text;
    
    terminal.appendChild(div);
    terminal.scrollTop = terminal.scrollHeight;
}

// Clear terminal output
function clearTerminalOutput() {
    const terminal = document.getElementById('terminal-content');
    terminal.innerHTML = `
        <div class="terminal-welcome">
            Modbus IO Terminal - Ready<br>
            Type 'help' for available commands<br>
            > 
        </div>
    `;
}

// Show terminal help
function showTerminalHelp() {
    const helpText = `
Available Commands:

DIGITAL I/O:
  read           - Read current pin state
  write 1/0      - Set output pin state
  config pullup  - Enable/disable pullup
  config invert  - Enable/disable inversion
  config latch   - Enable/disable latching

ANALOG I/O:
  read           - Read analog value (mV)
  config         - Show pin configuration

I2C:
  scan           - Scan for I2C devices
  read [reg]     - Read from register
  write [reg] [data] - Write to register
  probe          - Test device presence

UART:
  send [data]    - Send data
  read           - Read available data
  config [baud]  - Set baud rate

NETWORK:
  status         - Show connection status
  clients        - List connected clients
  reset          - Reset connections

SYSTEM:
  status         - System information
  sensors        - List all sensors
  reset          - Restart system
  info           - Hardware details

General:
  help           - Show this help
  clear          - Clear terminal
    `;
    
    addTerminalOutput(helpText, 'success');
}

// Initialize terminal on page load
document.addEventListener('DOMContentLoaded', function() {
    // Load initial sensor configuration
    loadSensorConfig();
    
    updateTerminalInterface();
    
    // Add event listeners for byte extraction controls
    const startByteInput = document.getElementById('data-start-byte');
    const lengthInput = document.getElementById('data-length');
    const formatSelect = document.getElementById('data-format');
    
    if (startByteInput) {
        startByteInput.addEventListener('input', function() {
            if (window.currentCalibrationSensor && window.currentCalibrationSensor.raw_i2c_data) {
                updateByteVisualization(window.currentCalibrationSensor.raw_i2c_data);
            }
        });
    }
    
    if (lengthInput) {
        lengthInput.addEventListener('input', function() {
            if (window.currentCalibrationSensor && window.currentCalibrationSensor.raw_i2c_data) {
                updateByteVisualization(window.currentCalibrationSensor.raw_i2c_data);
            }
        });
    }
    
    if (formatSelect) {
        formatSelect.addEventListener('change', function() {
            if (window.currentCalibrationSensor && window.currentCalibrationSensor.raw_i2c_data) {
                updateByteVisualization(window.currentCalibrationSensor.raw_i2c_data);
            }
        });
    }
});

// Data Flow Interface Functions

// Show calibration modal for a specific sensor
function showCalibrationModal(sensorName) {
    console.log('Opening calibration modal for sensor:', sensorName);
    
    // Find the sensor in the current iostatus data
    if (!currentIOStatus || !currentIOStatus.configured_sensors) {
        console.error('No IO status data available');
        return;
    }
    
    const sensor = currentIOStatus.configured_sensors.find(s => s.name === sensorName);
    if (!sensor) {
        console.error('Sensor not found:', sensorName);
        return;
    }
    
    // Set up the modal with sensor info
    document.getElementById('calibration-sensor-name').textContent = sensor.name;
    document.getElementById('calibration-sensor-type').textContent = sensor.type;
    document.getElementById('calibration-sensor-address').textContent = sensor.i2c_address ? `0x${sensor.i2c_address.toString(16).toUpperCase()}` : 'N/A';
    
    // Display current raw data and value
    document.getElementById('calibration-raw-data').textContent = sensor.raw_i2c_data || sensor.raw_value || 'No data';
    document.getElementById('calibration-current-value').textContent = sensor.current_value || 'No data';
    
    // Set up byte extraction for I2C sensors
    const byteExtractionSection = document.getElementById('byte-extraction-section');
    if (sensor.protocol === 'I2C' && sensor.raw_i2c_data) {
        byteExtractionSection.style.display = 'block';
        
        // Load current I2C parsing settings if available
        if (sensor.i2c_parsing) {
            document.getElementById('data-start-byte').value = sensor.i2c_parsing.data_offset || 0;
            document.getElementById('data-length').value = sensor.i2c_parsing.data_length || 2;
            document.getElementById('data-format').value = sensor.i2c_parsing.data_format || 'uint16_le';
        }
        
        // Update the byte visualization
        updateByteVisualization(sensor.raw_i2c_data);
    } else {
        byteExtractionSection.style.display = 'none';
    }
    
    // Load current calibration settings
    if (sensor.calibration) {
        if (sensor.calibration.method) {
            const methodRadio = document.querySelector(`input[name="calibration-method"][value="${sensor.calibration.method}"]`);
            if (methodRadio) {
                methodRadio.checked = true;
                showCalibrationMethod(sensor.calibration.method);
            }
        }
        
        // Set values based on calibration method
        if (sensor.calibration.offset !== undefined) {
            document.getElementById('calibration-offset').value = sensor.calibration.offset;
        }
        if (sensor.calibration.scale !== undefined) {
            document.getElementById('calibration-scale').value = sensor.calibration.scale;
        }
        if (sensor.calibration.polynomial !== undefined) {
            document.getElementById('calibration-polynomial').value = sensor.calibration.polynomial;
        }
        if (sensor.calibration.expression !== undefined) {
            document.getElementById('calibration-expression').value = sensor.calibration.expression;
        }
    } else {
        // Reset to defaults
        document.getElementById('calibration-offset').value = 0;
        document.getElementById('calibration-scale').value = 1;
        document.getElementById('calibration-polynomial').value = '';
        document.getElementById('calibration-expression').value = '';
        document.querySelector('input[name="calibration-method"][value="linear"]').checked = true;
        showCalibrationMethod('linear');
    }
    
    // Store current sensor for saving
    window.currentCalibrationSensor = sensor;
    
    // Show the modal
    document.getElementById('calibration-modal-overlay').style.display = 'flex';
    document.getElementById('calibration-modal-overlay').classList.add('show');
}

// Refresh sensor data
function refreshSensorData(sensorName) {
    console.log('Refreshing sensor data for:', sensorName);
    
    // Trigger a data update by calling updateIOStatus
    updateIOStatus();
    
    // Show feedback
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = '🔄 Refreshing...';
    button.disabled = true;
    
    setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
    }, 1000);
}

// Test sensor communication
function testSensorRead(sensorName) {
    console.log('Testing sensor communication for:', sensorName);
    
    // Find the sensor in the current config
    if (!currentSensorConfig || !currentSensorConfig.sensors) {
        console.error('No sensor config available');
        return;
    }
    
    const sensor = currentSensorConfig.sensors.find(s => s.name === sensorName);
    if (!sensor) {
        console.error('Sensor not found:', sensorName);
        return;
    }
    
    // Show feedback
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = '🔍 Testing...';
    button.disabled = true;
    
    // Send a terminal command to test the sensor
    if (sensor.type && sensor.type.includes('I2C')) {
        const address = sensor.i2c_address || sensor.address;
        if (address) {
            // Use terminal command to test I2C sensor
            executeTerminalCommand(`i2c probe 0x${address.toString(16).padStart(2, '0')}`);
        }
    }
    
    setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
    }, 1500);
}

// Update byte visualization display
function updateByteVisualization(rawDataHex) {
    if (!rawDataHex) {
        document.getElementById('raw-bytes-display').textContent = 'No raw data available';
        document.getElementById('extracted-value-display').textContent = 'Extracted: No data';
        return;
    }
    
    // Parse hex string into bytes
    const bytes = [];
    const cleanHex = rawDataHex.replace(/[^0-9A-Fa-f]/g, '');
    for (let i = 0; i < cleanHex.length; i += 2) {
        if (i + 1 < cleanHex.length) {
            bytes.push(parseInt(cleanHex.substr(i, 2), 16));
        }
    }
    
    // Display bytes with highlighting
    const startByte = parseInt(document.getElementById('data-start-byte').value) || 0;
    const length = parseInt(document.getElementById('data-length').value) || 2;
    
    let bytesHtml = '';
    for (let i = 0; i < bytes.length; i++) {
        const isSelected = i >= startByte && i < startByte + length;
        const byteClass = isSelected ? 'byte-highlight' : '';
        bytesHtml += `<span class="${byteClass}">${bytes[i].toString(16).padStart(2, '0').toUpperCase()}</span> `;
    }
    
    document.getElementById('raw-bytes-display').innerHTML = bytesHtml;
    
    // Calculate extracted value
    testByteExtraction();
}

// Test byte extraction with current settings
function testByteExtraction() {
    const sensor = window.currentCalibrationSensor;
    if (!sensor || !sensor.raw_i2c_data) {
        document.getElementById('extracted-value-display').textContent = 'Extracted: No data';
        return;
    }
    
    const rawDataHex = sensor.raw_i2c_data;
    const startByte = parseInt(document.getElementById('data-start-byte').value) || 0;
    const length = parseInt(document.getElementById('data-length').value) || 2;
    const format = document.getElementById('data-format').value;
    
    // Parse hex string into bytes
    const bytes = [];
    const cleanHex = rawDataHex.replace(/[^0-9A-Fa-f]/g, '');
    for (let i = 0; i < cleanHex.length; i += 2) {
        if (i + 1 < cleanHex.length) {
            bytes.push(parseInt(cleanHex.substr(i, 2), 16));
        }
    }
    
    // Extract bytes
    if (startByte >= bytes.length || startByte + length > bytes.length) {
        document.getElementById('extracted-value-display').textContent = 'Extracted: Invalid range';
        return;
    }
    
    const extractedBytes = bytes.slice(startByte, startByte + length);
    let value = 0;
    
    try {
        switch (format) {
            case 'uint8':
                value = extractedBytes[0] || 0;
                break;
            case 'uint16_be':
                value = (extractedBytes[0] << 8) | extractedBytes[1];
                break;
            case 'uint16_le':
                value = (extractedBytes[1] << 8) | extractedBytes[0];
                break;
            case 'uint32_be':
                value = (extractedBytes[0] << 24) | (extractedBytes[1] << 16) | (extractedBytes[2] << 8) | extractedBytes[3];
                break;
            case 'uint32_le':
                value = (extractedBytes[3] << 24) | (extractedBytes[2] << 16) | (extractedBytes[1] << 8) | extractedBytes[0];
                break;
            case 'float32':
                // Convert 4 bytes to IEEE 754 float
                if (extractedBytes.length >= 4) {
                    const buffer = new ArrayBuffer(4);
                    const view = new DataView(buffer);
                    view.setUint8(0, extractedBytes[0]);
                    view.setUint8(1, extractedBytes[1]);
                    view.setUint8(2, extractedBytes[2]);
                    view.setUint8(3, extractedBytes[3]);
                    value = view.getFloat32(0, false); // Big endian
                }
                break;
        }
        
        document.getElementById('extracted-value-display').textContent = `Extracted: ${value}`;
    } catch (error) {
        document.getElementById('extracted-value-display').textContent = 'Extracted: Error';
    }
}

// Enhanced calibration save function for data flow
window.saveDataFlowCalibration = function saveDataFlowCalibration() {
    if (!window.currentCalibrationSensor) {
        console.error('No sensor selected for calibration');
        return;
    }
    
    const sensor = window.currentCalibrationSensor;
    const method = document.querySelector('input[name="calibration-method"]:checked').value;
    
    // Prepare calibration data
    const calibrationData = {
        name: sensor.name,
        method: method
    };
    
    // Add I2C parsing settings for I2C sensors
    if (sensor.protocol === 'I2C') {
        calibrationData.i2c_parsing = {
            data_offset: parseInt(document.getElementById('data-start-byte').value) || 0,
            data_length: parseInt(document.getElementById('data-length').value) || 2,
            data_format: document.getElementById('data-format').value || 'uint16_le'
        };
    }
    
    switch(method) {
        case 'linear':
            calibrationData.offset = parseFloat(document.getElementById('calibration-offset').value) || 0;
            calibrationData.scale = parseFloat(document.getElementById('calibration-scale').value) || 1;
            break;
        case 'polynomial':
            calibrationData.polynomial = document.getElementById('calibration-polynomial').value || '';
            break;
        case 'expression':
            calibrationData.expression = document.getElementById('calibration-expression').value || '';
            break;
    }
    
    // Send calibration to backend
    fetch('/api/sensor/calibration', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(calibrationData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('Calibration saved successfully');
            hideCalibrationModal();
            // Refresh the data to show updated calibration
            updateIOStatus();
        } else {
            console.error('Failed to save calibration:', data.error);
            alert('Failed to save calibration: ' + (data.error || 'Unknown error'));
        }
    })
    .catch(error => {
        console.error('Error saving calibration:', error);
        alert('Error saving calibration: ' + error.message);
    });
}
// --- Digital IO Config Table and Controls ---

window.renderIOConfigTable = function renderIOConfigTable(ioConfig) {
    const table = document.getElementById('io-config-table');
    if (!table) return;

    let html = `
        <tr>
            <th>Pin</th>
            <th>State</th>
            <th>Latched</th>
            <th>Pull-up</th>
            <th>Invert</th>
            <th>Latch</th>
            <th>Actions</th>
        </tr>
    `;

    for (let i = 0; i < 8; i++) {
        html += `
            <tr>
                <td>DI${i}</td>
                <td>${ioConfig.diState[i] ? 'HIGH' : 'LOW'}</td>
                <td>${ioConfig.diLatched[i] ? 'Latched' : '-'}</td>
                <td>
                    <input type="checkbox" ${ioConfig.diPullup[i] ? 'checked' : ''} onchange="togglePullup(${i}, this.checked)">
                </td>
                <td>
                    <input type="checkbox" ${ioConfig.diInvert[i] ? 'checked' : ''} onchange="toggleInvert(${i}, this.checked)">
                </td>
                <td>
                    <input type="checkbox" ${ioConfig.diLatch[i] ? 'checked' : ''} onchange="toggleLatch(${i}, this.checked)">
                </td>
                <td>
                    <button onclick="resetLatch(${i})">Unlatch</button>
                </td>
            </tr>
        `;
    }

    table.innerHTML = html;
};

window.togglePullup = function togglePullup(index, state) {
    fetch('/ioconfig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: index, pullup: state })
    }).then(() => window.loadIOConfig());
};

window.toggleInvert = function toggleInvert(index, state) {
    fetch('/ioconfig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: index, invert: state })
    }).then(() => window.loadIOConfig());
};

window.toggleLatch = function toggleLatch(index, state) {
    fetch('/ioconfig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: index, latch: state })
    }).then(() => window.loadIOConfig());
};

window.resetLatch = function resetLatch(index) {
    fetch('/reset-latch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: index })
    }).then(() => window.loadIOConfig());
};

window.loadIOConfig = function loadIOConfig() {
    fetch('/ioconfig')
        .then(response => response.json())
        .then(data => {
            window.renderIOConfigTable(data);
        })
        .catch(error => {
            console.error('Error loading IO config:', error);
        });
};

// On page load, ensure IO config table is rendered
document.addEventListener('DOMContentLoaded', function() {
    window.loadIOConfig();
});


// Initialize periodic updates when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Initial load
    updateIOStatus();
    loadSensorConfig();
    loadIOConfig();
    
    // Add One-Wire command dropdown handler
    const oneWireCommandSelect = document.getElementById('sensor-onewire-command');
    const oneWireCommandCustom = document.getElementById('sensor-onewire-command-custom');
    
    if (oneWireCommandSelect && oneWireCommandCustom) {
        oneWireCommandSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                oneWireCommandCustom.style.display = 'block';
                oneWireCommandCustom.required = true;
            } else {
                oneWireCommandCustom.style.display = 'none';
                oneWireCommandCustom.required = false;
            }
        });
    }
    
    // Add sensor type change listener for auto-configuration
    const sensorTypeSelect = document.getElementById('sensor-type');
    if (sensorTypeSelect) {
        sensorTypeSelect.addEventListener('change', function() {
            if (this.value) {
                autoConfigureSensorType();
            }
        });
    }
    
    // Set up a single periodic update for IO status and sensor dataflow
    setInterval(function() {
        updateIOStatus(); // Update all IO status every 2 seconds
    }, 2000);
    
    console.log('Periodic updates initialized');
});

// Toggle multi-value configuration visibility
window.toggleMultiValueConfig = function toggleMultiValueConfig() {
    const checkbox = document.getElementById('sensor-multi-value');
    const section = document.getElementById('multi-value-section');
    
    if (checkbox.checked) {
        section.style.display = 'block';
        // Add default value field if none exist
        if (document.getElementById('multi-value-fields').children.length === 0) {
            addMultiValueField();
        }
    } else {
        section.style.display = 'none';
    }
};

// Add a new multi-value field
window.addMultiValueField = function addMultiValueField() {
    const container = document.getElementById('multi-value-fields');
    const index = container.children.length;
    const regField = document.getElementById('sensor-modbus-register');
    const baseRegister = !isNaN(parseInt(regField.value)) ? parseInt(regField.value) : 
                        (!regField.hasAttribute('data-user-set') ? getNextAvailableRegister() : 0);
    
    const item = document.createElement('div');
    item.className = 'multi-value-item';
    item.innerHTML = `
        <button type="button" class="multi-value-remove" onclick="removeMultiValueField(this)" title="Remove this value">×</button>
        <h5>Value ${index + 1}</h5>
        <div class="multi-value-row">
            <div class="form-group">
                <label>Name</label>
                <input type="text" 
                       id="multi-name-${index}" 
                       placeholder="e.g., Temperature"
                       value="Value ${index + 1}">
            </div>
            <div class="form-group">
                <label>Data Position</label>
                <input type="text" 
                       id="multi-position-${index}" 
                       placeholder="e.g., bytes 0-1, bit 5, CSV col 2">
            </div>
        </div>
        <div class="multi-value-row">
            <div class="form-group">
                <label>Modbus Register</label>
                <input type="number" 
                       id="multi-register-${index}" 
                       value="${baseRegister + index}" 
                       min="3" max="65535">
            </div>
            <div class="form-group">
                <label>Scale Factor</label>
                <input type="number" 
                       id="multi-scale-${index}" 
                       value="1.0" 
                       step="0.001" 
                       min="0.001">
            </div>
            <div class="form-group">
                <label>Offset</label>
                <input type="number" 
                       id="multi-offset-${index}" 
                       value="0.0" 
                       step="0.01">
            </div>
            <div class="form-group">
                <label>Units</label>
                <input type="text" 
                       id="multi-units-${index}" 
                       placeholder="°C, %, mV">
            </div>
        </div>
    `;
    container.appendChild(item);
};

// Remove a multi-value field
window.removeMultiValueField = function removeMultiValueField(button) {
    button.parentElement.remove();
    
    // Re-index remaining fields
    const container = document.getElementById('multi-value-fields');
    Array.from(container.children).forEach((item, index) => {
        const h5 = item.querySelector('h5');
        if (h5) h5.textContent = `Value ${index + 1}`;
        
        // Update field IDs and default name
        const nameField = item.querySelector('input[id^="multi-name-"]');
        if (nameField && nameField.value.startsWith('Value ')) {
            nameField.value = `Value ${index + 1}`;
        }
    });
};

// Send terminal data to sensor config
window.sendDataToConfig = function sendDataToConfig() {
    const terminalContent = document.getElementById('terminal-content');
    if (!terminalContent) {
        showToast('Terminal content not found', 'error');
        return;
    }
    
    const output = terminalContent.textContent;
    const lines = output.split('\n');
    
    // Find the most recent sensor data line
    let lastDataLine = '';
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if (line.includes('Raw Data:') || line.includes('OneWire:') || line.includes('I2C:') || line.includes('UART:')) {
            lastDataLine = line;
            break;
        }
    }
    
    if (!lastDataLine) {
        showToast('No sensor data found in terminal output', 'error');
        return;
    }
    
    // Extract sensor info from terminal command/response
    const protocol = document.getElementById('terminal-protocol').value;
    const pin = document.getElementById('terminal-pin').value;
    
    // Open sensor modal in edit mode
    showSensorModal();
    
    // Pre-fill protocol and show example data
    document.getElementById('sensor-protocol').value = protocol;
    updateSensorProtocolFields();
    
    // Show and populate example data section
    setTimeout(() => {
        const exampleSection = document.getElementById('example-data-section');
        const exampleTextarea = document.getElementById('example-data-string');
        
        exampleSection.style.display = 'block';
        exampleTextarea.value = lastDataLine;
        
        // Auto-suggest sensor name based on pin
        const nameField = document.getElementById('sensor-name');
        if (!nameField.value) {
            nameField.value = `${protocol}_${pin}`;
        }
        
        // Show data parsing section
        const dataParsingSection = document.getElementById('data-parsing-section');
        dataParsingSection.style.display = 'block';
        
        showToast('Data imported from terminal - configure parsing below', 'success');
    }, 100);
}

// Add event listener to track manual register field changes
document.addEventListener('DOMContentLoaded', function() {
    const modbusRegField = document.getElementById('sensor-modbus-register');
    if (modbusRegField) {
        // Mark field as user-set when user manually types or changes value
        modbusRegField.addEventListener('input', function() {
            this.setAttribute('data-user-set', 'true');
        });
        
        // Also mark as user-set when field gains focus and user interacts
        modbusRegField.addEventListener('focus', function() {
            this.setAttribute('data-user-set', 'true');
        });
    }
});

// Clear user-set flag when opening new sensor modal
const originalShowSensorModal = window.showSensorModal;
if (typeof originalShowSensorModal === 'function') {
    window.showSensorModal = function() {
        // Call original function
        originalShowSensorModal.apply(this, arguments);
        
        // Clear the user-set flag for new sensors
        const modbusRegField = document.getElementById('sensor-modbus-register');
        if (modbusRegField && !arguments[0]) { // Only for new sensors (no index passed)
            modbusRegField.removeAttribute('data-user-set');
        }
    };
};
