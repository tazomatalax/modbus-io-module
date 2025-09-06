// Create data structures for the analog input chart
let analogChart;
// Define chart colors for consistency
const chartColors = {
    analog1: 'rgb(255, 99, 132)',  // Pink/Red
    analog2: 'rgb(54, 162, 235)',  // Blue
    analog3: 'rgb(75, 192, 192)'   // Teal
};

let analogChartData = {
    labels: [],
    datasets: [
        {
            label: 'Analog 1',
            data: [],
            borderColor: chartColors.analog1,
            backgroundColor: 'rgba(255, 99, 132, 0.1)',
            tension: 0.2,
            pointRadius: 1,
            borderWidth: 2
        },
        {
            label: 'Analog 2',
            data: [],
            borderColor: chartColors.analog2,
            backgroundColor: 'rgba(54, 162, 235, 0.1)',
            tension: 0.2,
            pointRadius: 1,
            borderWidth: 2
        },
        {
            label: 'Analog 3',
            data: [],
            borderColor: chartColors.analog3,
            backgroundColor: 'rgba(75, 192, 192, 0.1)',
            tension: 0.2,
            pointRadius: 1,
            borderWidth: 2
        }
    ]
};

// Maximum number of data points to show in the chart (1 hour at 1 point per second)
const MAX_DATA_POINTS = 240;

// Initialize the chart once document is ready
document.addEventListener('DOMContentLoaded', function() {
    const ctx = document.getElementById('analog-chart').getContext('2d');
    
    // Initialize the chart
    analogChart = new Chart(ctx, {
        type: 'line',
        data: analogChartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 100
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Time'
                    },
                    ticks: {
                        maxTicksLimit: 10,
                        maxRotation: 0
                    },
                    adapters: {
                        date: {
                            locale: 'en-US'
                        }
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'mV'
                    },
                    suggestedMin: 0,
                    suggestedMax: 3300
                }
            },
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: false  // Hide the legend since we're color-coding the values
                },
                tooltip: {
                    enabled: true
                }
            }
        }
    });
});

// Function to update the chart with new analog input values
function updateAnalogChart(analogValues) {
    if (!analogChart) return;
    
    // Add current timestamp as label
    const now = new Date();
    const timeString = now.getHours().toString().padStart(2, '0') + ':' + 
                      now.getMinutes().toString().padStart(2, '0') + ':' + 
                      now.getSeconds().toString().padStart(2, '0');
    
    // Add new data point with timestamp
    analogChartData.labels.push(timeString);
    
    // Add data for each analog input
    for (let i = 0; i < Math.min(analogValues.length, 3); i++) {
        analogChartData.datasets[i].data.push(analogValues[i]);
    }
    
    // Remove old data points if we exceed the maximum
    if (analogChartData.datasets[0].data.length > MAX_DATA_POINTS) {
        analogChartData.labels.shift();
        analogChartData.datasets.forEach(dataset => {
            dataset.data.shift();
        });
    }
    
    // Update chart
    analogChart.update();
}

// Toast notification functions
function showToast(message, type, countdown = false, duration = 3000) {
    const toastContainer = document.getElementById('toast-container');
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    if (countdown) {
        toast.classList.add('countdown');
    }
    
    // Create message content
    const toastContent = document.createElement('span');
    toastContent.innerHTML = message;
    
    // Create close button
    const closeButton = document.createElement('button');
    closeButton.className = 'toast-close';
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('click', () => {
        toastContainer.removeChild(toast);
    });
    
    // Assemble toast
    toast.appendChild(toastContent);
    toast.appendChild(closeButton);
    
    // Add to container
    toastContainer.appendChild(toast);
    
    // Auto-remove after duration (if not countdown)
    if (!countdown) {
        setTimeout(() => {
            if (toastContainer.contains(toast)) {
                toastContainer.removeChild(toast);
            }
        }, duration);
    }
    
    return toast;
}

function showCountdownToast(message, type, countdownDuration, onComplete) {
    const toast = showToast(message, type, true);
    
    let countdown = countdownDuration;
    const updateMessage = (seconds) => {
        toast.firstChild.innerHTML = `${message} Page will reload in ${seconds} seconds`;
    };
    
    updateMessage(countdown);
    
    const countdownInterval = setInterval(() => {
        countdown--;
        updateMessage(countdown);
        
        if (countdown <= 0) {
            clearInterval(countdownInterval);
            if (onComplete) {
                onComplete();
            }
        }
    }, 1000);
    
    return toast;
}

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
            
            // Detect device type and store device info
            isSimulator = data.is_simulator || false;
            deviceInfo = {
                isSimulator: isSimulator,
                firmwareVersion: data.firmware_version || "Unknown",
                deviceType: data.device_type || "Modbus IO Module"
            };
            
            // Update device info display
            updateDeviceInfoDisplay();
            
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
            diDiv.innerHTML = data.di.map((value, index) => {
                const isInverted = ioConfigState.di_invert[index];
                const isLatched = data.di_latched && data.di_latched[index];
                const isLatchEnabled = ioConfigState.di_latch[index];
                const rawValue = data.di_raw && data.di_raw[index];
                
                // Create status text that includes raw value and latched information when relevant
                let statusText = value ? 'ON' : 'OFF';
                let indicators = '';
                
                if (isInverted) {
                    indicators += '<span class="inverted-indicator" title="This input is inverted"></span>';
                }
                
                if (isLatchEnabled) {
                    indicators += '<span class="latch-enabled-indicator" title="Latching enabled"></span>';
                }
                
                if (isLatched) {
                    indicators += '<span class="latched-indicator" title="Input is currently latched">L</span>';
                    // If latched and raw value is different, show both states
                    if (value !== rawValue) {
                        statusText = `ON`;
                    }
                }
                
                // Add click handler for latched inputs to reset them individually
                const clickHandler = isLatched ? 
                    `onclick="resetSingleLatch(${index})"` : '';
                const clickableClass = isLatched ? 'latched-clickable' : '';
                
                return `<div class="io-item ${value ? 'io-on' : 'io-off'} ${clickableClass}" ${clickHandler}>
                    <span><strong>DI${index + 1}</strong>${indicators}</span>
                    <span>${statusText}</span>
                </div>`;
            }).join('');

            // Update digital outputs with click handlers
            const doDiv = document.getElementById('digital-outputs');
            doDiv.innerHTML = data.do.map((value, index) => {
                const isInverted = ioConfigState.do_invert[index];
                return `<div class="io-item output-item ${value ? 'io-on' : 'io-off'}" 
                      onclick="toggleOutput(${index}, ${value})">
                    <span><strong>DO${index + 1}</strong>${isInverted ? ' <span class="inverted-indicator" title="This output is inverted"></span>' : ''}</span>
                    <span>${value ? 'ON' : 'OFF'}</span>
                </div>`;
            }).join('');

            // Update analog inputs with matching colors from chart
            const aiDiv = document.getElementById('analog-inputs');
            aiDiv.innerHTML = data.ai.map((value, index) => {
                const analogClass = `analog${index + 1}`;
                return `<div class="io-item analog-value ${analogClass}">
                    <span><strong>AI${index + 1}</strong></span>
                    <span>${value} mV</span>
                </div>`;
            }).join('');
            
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
            
            // Update analog chart with new values
            updateAnalogChart(data.ai);
            
            // Update I2C sensors with dynamic display
            const i2cContainer = document.getElementById('i2c-sensors-container');
            if (data.i2c_sensors && Object.keys(data.i2c_sensors).length > 0) {
                let sensorHtml = '';
                
                // Display all configured sensor values
                for (const [sensorKey, sensorValue] of Object.entries(data.i2c_sensors)) {
                    const displayName = getSensorDisplayName(sensorKey);
                    const unit = getSensorUnit(sensorKey);
                    
                    sensorHtml += `
                        <div class="io-item analog-value">
                            <span><strong>${displayName}</strong></span>
                            <span>${sensorValue} ${unit}</span>
                        </div>
                    `;
                }
                
                i2cContainer.innerHTML = sensorHtml;
            } else {
                // Show message when no sensor data is available
                const messageText = isSimulator 
                    ? 'No sensors configured or sensor simulation disabled' 
                    : 'No sensors configured';
                
                i2cContainer.innerHTML = `
                    <div class="io-item" style="color: #666; font-style: italic;">
                        <span>${messageText}</span>
                    </div>
                `;
            }
            
            // Reset attempts counter on success
            ioStatusLoadAttempts = 0;
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

// Function to reset a single latched input
function resetSingleLatch(inputIndex) {
    console.log(`Resetting latched input ${inputIndex}...`);
    
    // Show loading toast
    const loadingToast = showToast(`Resetting input ${inputIndex + 1}...`, 'info');
    
    // Send request to server
    fetch('/reset-latch', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ input: inputIndex })
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
            showToast(`Input ${inputIndex + 1} has been reset`, 'success');
            // Update IO status immediately to show the changes
            updateIOStatus();
        } else {
            showToast(`Failed to reset input ${inputIndex + 1}. Please try again.`, 'error', false, 5000);
        }
    })
    .catch(error => {
        // Remove loading toast if it exists
        if (document.getElementById('toast-container').contains(loadingToast)) {
            document.getElementById('toast-container').removeChild(loadingToast);
        }
        showToast('Error resetting latched input: ' + error.message, 'error', false, 5000);
    });
}

// Global configuration state
let ioConfigState = {
    di_pullup: Array(8).fill(false),
    di_invert: Array(8).fill(false),
    di_latch: Array(8).fill(false),
    do_invert: Array(8).fill(false),
    do_initial_state: Array(8).fill(false)
};

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
            
            // Store the configuration state globally
            ioConfigState = {
                di_pullup: [...data.di_pullup],
                di_invert: [...data.di_invert],
                di_latch: [...data.di_latch],
                do_invert: [...data.do_invert],
                do_initial_state: [...data.do_initial_state]
            };
            
            // Digital Inputs configuration
            const diConfigDiv = document.getElementById('di-config');
            let diConfigHtml = '<table class="io-config-table">';
            diConfigHtml += `
                <thead>
                    <tr>
                        <th>Input</th>
                        <th>Pullup</th>
                        <th>Invert</th>
                        <th>Latch</th>
                    </tr>
                </thead>
                <tbody>
            `;
            
            for (let i = 0; i < data.di_pullup.length; i++) {
                diConfigHtml += `
                    <tr>
                        <td>DI${i + 1}</td>
                        <td>
                            <label class="switch-label">
                                <input type="checkbox" id="di-pullup-${i}" ${data.di_pullup[i] ? 'checked' : ''}>
                                <span class="switch-text">Pullup</span>
                            </label>
                        </td>
                        <td>
                            <label class="switch-label">
                                <input type="checkbox" id="di-invert-${i}" ${data.di_invert[i] ? 'checked' : ''}>
                                <span class="switch-text">Invert</span>
                            </label>
                        </td>
                        <td>
                            <label class="switch-label" title="When enabled, the input will latch in the ON state until it is read via Modbus or manually reset">
                                <input type="checkbox" id="di-latch-${i}" ${data.di_latch[i] ? 'checked' : ''}>
                                <span class="switch-text">Latch</span>
                            </label>
                        </td>
                    </tr>
                `;
            }
            diConfigHtml += '</tbody></table>';
            diConfigDiv.innerHTML = diConfigHtml;
            
            // Digital Outputs configuration
            const doConfigDiv = document.getElementById('do-config');
            let doConfigHtml = '<table class="io-config-table">';
            doConfigHtml += `
                <thead>
                    <tr>
                        <th>Output</th>
                        <th>Initial</th>
                        <th>Invert</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
            `;
            
            for (let i = 0; i < data.do_invert.length; i++) {
                doConfigHtml += `
                    <tr>
                        <td>DO${i + 1}</td>
                        <td>
                            <label class="switch-label">
                                <input type="checkbox" id="do-initial-${i}" ${data.do_initial_state[i] ? 'checked' : ''}>
                                <span class="switch-text">Initial ON</span>
                            </label>
                        </td>
                        <td>
                            <label class="switch-label">
                                <input type="checkbox" id="do-invert-${i}" ${data.do_invert[i] ? 'checked' : ''}>
                                <span class="switch-text">Invert</span>
                            </label>
                        </td>
                        <td></td>
                    </tr>
                `;
            }
            doConfigHtml += '</tbody></table>';
            doConfigDiv.innerHTML = doConfigHtml;
            
            // Analog Input Configuration section removed as analog values are always in mV
            
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

let ioConfigLoadAttempts = 0;
const MAX_IO_CONFIG_LOAD_ATTEMPTS = 5;

function saveIOConfig() {
    // Gather all configuration data
    const ioConfig = {
        di_pullup: [],
        di_invert: [],
        di_latch: [],
        do_invert: [],
        do_initial_state: []
    };
    
    // Get digital input configuration
    for (let i = 0; i < 8; i++) {
        ioConfig.di_pullup.push(document.getElementById(`di-pullup-${i}`).checked);
        ioConfig.di_invert.push(document.getElementById(`di-invert-${i}`).checked);
        ioConfig.di_latch.push(document.getElementById(`di-latch-${i}`).checked);
    }
    
    // Get digital output configuration
    for (let i = 0; i < 8; i++) {
        ioConfig.do_invert.push(document.getElementById(`do-invert-${i}`).checked);
        ioConfig.do_initial_state.push(document.getElementById(`do-initial-${i}`).checked);
    }
    
    // Update the global config state immediately
    ioConfigState = {
        di_pullup: [...ioConfig.di_pullup],
        di_invert: [...ioConfig.di_invert],
        di_latch: [...ioConfig.di_latch],
        do_invert: [...ioConfig.do_invert],
        do_initial_state: [...ioConfig.do_initial_state]
    };
    
    console.log("Saving IO configuration:", ioConfig);
    
    // Show loading toast
    const loadingToast = showToast('Saving IO configuration...', 'info');
    
    // Send configuration to server
    fetch('/ioconfig', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(ioConfig)
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
            if (data.changed) {
                showToast('IO Configuration saved successfully!', 'success');
            } else {
                showToast('No changes detected in IO Configuration.', 'success');
            }
        } else {
            showToast('Failed to save IO Configuration. Please try again.', 'error', false, 5000);
        }
        
        // Update IO status immediately to show the new inversion indicators
        updateIOStatus();
    })
    .catch(error => {
        // Remove loading toast if it exists
        if (document.getElementById('toast-container').contains(loadingToast)) {
            document.getElementById('toast-container').removeChild(loadingToast);
        }
        showToast('Error saving IO configuration: ' + error.message, 'error', false, 5000);
    });
}

function saveConfig() {
    // Ensure modbus_port is parsed as a number
    const modbus_port_raw = document.getElementById('modbus_port').value;
    const modbus_port_value = parseInt(modbus_port_raw, 10);
    
    console.log("Modbus port value from form (raw):", modbus_port_raw);
    console.log("Modbus port value from form (parsed):", modbus_port_value);
    
    const config = {
        dhcp: document.getElementById('dhcp').checked,
        ip: document.getElementById('ip').value,
        subnet: document.getElementById('subnet').value,
        gateway: document.getElementById('gateway').value,
        hostname: document.getElementById('hostname').value,
        modbus_port: modbus_port_value
    };
    
    console.log("Config object being sent:", JSON.stringify(config));
    
    // Show loading toast
    const loadingToast = showToast('Saving configuration...', 'info');
    
    fetch('/config', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(config)
    })
    .then(response => response.json())
    .then(data => {
        // Remove loading toast
        document.getElementById('toast-container').removeChild(loadingToast);
        
        if (data.success) {
            // Update current IP display if it changed
            document.getElementById('current-ip').textContent = data.ip;
            
            // Show countdown toast with reload
            showCountdownToast(
                'Configuration saved successfully! Rebooting now...', 
                'success', 
                5, 
                () => window.location.reload()
            );
        } else {
            showToast('Error: ' + data.error, 'error', false, 5000);
        }
    })
    .catch(error => {
        // Remove loading toast
        if (document.getElementById('toast-container').contains(loadingToast)) {
            document.getElementById('toast-container').removeChild(loadingToast);
        }
        showToast('Failed to save configuration: ' + error.message, 'error', false, 5000);
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
    // Update IO status only - removed updateClientStatus() which doesn't exist
    updateIOStatus();
}
setInterval(updateUI, 500);

// Toggle IP fields when DHCP checkbox changes
document.getElementById('dhcp').addEventListener('change', function(e) {
    const disabled = e.target.checked;
    ['ip', 'subnet', 'gateway'].forEach(id => {
        document.getElementById(id).disabled = disabled;
    });
});

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

// Device mode detection
let isSimulator = false;
let deviceInfo = {};

// Global simulation control functions (only used in simulator mode)
let globalSimulationEnabled = false;

function updateDeviceInfoDisplay() {
    console.log("Updating device info display:", deviceInfo);
    
    // Update device info in the UI if elements exist
    const deviceTypeElement = document.getElementById('device-type');
    const firmwareVersionElement = document.getElementById('firmware-version');
    
    if (deviceTypeElement) {
        deviceTypeElement.textContent = deviceInfo.deviceType;
    }
    
    if (firmwareVersionElement) {
        firmwareVersionElement.textContent = deviceInfo.firmwareVersion;
    }
    
    // Show/hide simulator-specific controls
    const simControlsCard = document.getElementById('sim-controls-card');
    const globalSimToggle = document.getElementById('global-simulation-toggle');
    
    if (simControlsCard) {
        simControlsCard.style.display = deviceInfo.isSimulator ? 'block' : 'none';
    }
    
    // Update sensor data display logic
    updateSensorDataDisplayMode();
}

function updateSensorDataDisplayMode() {
    // This function can be used to adjust UI behavior based on hardware vs simulator
    console.log("Sensor data display mode updated for", deviceInfo.isSimulator ? "simulator" : "hardware");
}

function getSensorDisplayName(sensorKey) {
    const displayNames = {
        'temperature': 'Temperature',
        'humidity': 'Humidity',
        'pressure': 'Pressure',
        'light': 'Light Level',
        'ph': 'pH Level',
        'ec': 'Electrical Conductivity',
        'co2': 'CO2 Level'
    };
    
    return displayNames[sensorKey] || sensorKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function getSensorUnit(sensorKey) {
    const units = {
        'temperature': '°C',
        'humidity': '%',
        'pressure': 'hPa',
        'light': 'lux',
        'ph': 'pH',
        'ec': 'µS/cm',
        'co2': 'ppm'
    };
    
    return units[sensorKey] || '';
}

function loadSimulationState() {
    console.log("Loading global simulation state...");
    fetch('/simulate/global')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            globalSimulationEnabled = data.enabled || false;
            if (isSimulator) {
                document.getElementById('global-simulation-toggle').checked = globalSimulationEnabled;
                document.getElementById('simulation-status-text').textContent = globalSimulationEnabled ? 'ON' : 'OFF';
            }
            console.log("Global simulation state:", globalSimulationEnabled ? 'ON' : 'OFF');
        })
        .catch(error => {
            console.error('Error loading simulation state:', error);
            // Default to OFF on error
            globalSimulationEnabled = false;
            if (isSimulator) {
                document.getElementById('global-simulation-toggle').checked = false;
                document.getElementById('simulation-status-text').textContent = 'OFF';
            }
        });
}

function toggleGlobalSimulation() {
    const enabled = document.getElementById('global-simulation-toggle').checked;
    
    console.log("Toggling global simulation to:", enabled ? 'ON' : 'OFF');
    
    fetch('/simulate/global', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled: enabled })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            globalSimulationEnabled = enabled;
            document.getElementById('simulation-status-text').textContent = enabled ? 'ON' : 'OFF';
            showToast(`Sensor simulation ${enabled ? 'enabled' : 'disabled'}`, 'success');
            // Refresh IO status to show/hide simulated sensor data
            updateIOStatus();
        } else {
            // Revert toggle state on failure
            document.getElementById('global-simulation-toggle').checked = !enabled;
            showToast('Failed to update simulation state', 'error');
        }
    })
    .catch(error => {
        console.error('Error toggling simulation:', error);
        // Revert toggle state on error
        document.getElementById('global-simulation-toggle').checked = !enabled;
        document.getElementById('simulation-status-text').textContent = globalSimulationEnabled ? 'ON' : 'OFF';
        showToast('Error updating simulation state: ' + error.message, 'error');
    });
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
    
    // Load sensor configuration after another short delay
    setTimeout(() => {
        loadSensorConfig();
    }, 1000);
    
    // Load simulation state after a short delay
    setTimeout(() => {
        loadSimulationState();
    }, 1500);
}, 500);

// Add event listener for reset latches button
document.getElementById('reset-latches-btn').addEventListener('click', resetLatches);

// Add event listener for global simulation toggle
document.addEventListener('DOMContentLoaded', function() {
    const toggleElement = document.getElementById('global-simulation-toggle');
    if (toggleElement) {
        toggleElement.addEventListener('change', toggleGlobalSimulation);
    }
});

// Function to reset all latched inputs
// Note: Modbus clients can reset individual latches by writing to coils 100-107
function resetLatches() {
    console.log('Resetting all latched inputs...');
    
    // Show loading toast
    const loadingToast = showToast('Resetting latched inputs...', 'info');
    
    // Send request to server
    fetch('/reset-latches', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
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
            showToast('Latched inputs have been reset', 'success');
            // Update IO status immediately to show the changes
            updateIOStatus();
        } else {
            showToast('Failed to reset latched inputs. Please try again.', 'error', false, 5000);
        }
    })
    .catch(error => {
        // Remove loading toast if it exists
        if (document.getElementById('toast-container').contains(loadingToast)) {
            document.getElementById('toast-container').removeChild(loadingToast);
        }
        showToast('Error resetting latched inputs: ' + error.message, 'error', false, 5000);
    });
}

// Function to reset a single latched input
// Note: Modbus clients can reset individual latches by writing to coils 100-107
function resetSingleLatch(inputIndex) {
    console.log(`Resetting latched input ${inputIndex}...`);
    
    // Show loading toast
    const loadingToast = showToast(`Resetting input ${inputIndex + 1}...`, 'info');
    
    // Send request to server
    fetch('/reset-latch', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ input: inputIndex })
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
            showToast(`Input ${inputIndex + 1} has been reset`, 'success');
            // Update IO status immediately to show the changes
            updateIOStatus();
        } else {
            showToast(`Failed to reset input ${inputIndex + 1}. Please try again.`, 'error', false, 5000);
        }
    })
    .catch(error => {
        // Remove loading toast if it exists
        if (document.getElementById('toast-container').contains(loadingToast)) {
            document.getElementById('toast-container').removeChild(loadingToast);
        }
        showToast('Error resetting latched input: ' + error.message, 'error', false, 5000);
    });
}

// Sensor Management Functions
let sensorConfigData = [];
let editingSensorIndex = -1;

// EZO Calibration Management
let currentEzoSensorIndex = -1;

// EZO Sensor calibration configurations
const EZO_CALIBRATION_CONFIG = {
    'EZO_PH': {
        name: 'pH Sensor',
        buttons: [
            { label: 'Mid (7.0)', command: 'Cal,mid,7.00', type: 'primary', description: 'Calibrate mid point (pH 7.0) - Always calibrate this first!' },
            { label: 'Low (4.0)', command: 'Cal,low,4.00', type: 'secondary', description: 'Calibrate low point (pH 4.0)' },
            { label: 'High (10.0)', command: 'Cal,high,10.00', type: 'secondary', description: 'Calibrate high point (pH 10.0)' },
            { label: 'Clear Cal', command: 'Cal,clear', type: 'warning', description: 'Clear all calibration data' },
            { label: 'Check Status', command: 'Cal,?', type: 'info', description: 'Check calibration status' }
        ],
        notes: [
            '• Always calibrate Mid point (pH 7.0) FIRST - this clears previous calibrations',
            '• Rinse probe thoroughly between different calibration solutions',
            '• Allow readings to stabilize before issuing calibration commands',
            '• Use pH buffer solutions at current temperature',
            '• Expected responses: *OK (success), *ER (error), or calibration status'
        ]
    },
    'EZO_EC': {
        name: 'Conductivity Sensor', 
        buttons: [
            { label: 'Dry Cal', command: 'Cal,dry', type: 'primary', description: 'Calibrate dry (probe must be completely dry) - Always do this first!' },
            { label: 'Single Point', command: 'Cal,one,{value}', type: 'secondary', description: 'Single point calibration (enter EC value)', needsValue: true },
            { label: 'Low Point', command: 'Cal,low,{value}', type: 'secondary', description: 'Low point calibration (enter EC value)', needsValue: true },
            { label: 'High Point', command: 'Cal,high,{value}', type: 'secondary', description: 'High point calibration (enter EC value)', needsValue: true },
            { label: 'Clear Cal', command: 'Cal,clear', type: 'warning', description: 'Clear all calibration data' },
            { label: 'Check Status', command: 'Cal,?', type: 'info', description: 'Check calibration status' }
        ],
        notes: [
            '• Always calibrate Dry point FIRST with completely dry probe',
            '• For dual-point calibration: do Dry, then Low, then High',
            '• For single-point: do Dry, then Single Point',
            '• Use certified conductivity standards',
            '• Typical values: Low ~1000 µS/cm, High ~80000 µS/cm',
            '• Expected responses: *OK (success), *ER (error), or calibration status'
        ]
    },
    'EZO_DO': {
        name: 'Dissolved Oxygen Sensor',
        buttons: [
            { label: 'Atmospheric', command: 'Cal,atmospheric', type: 'primary', description: 'Calibrate at atmospheric oxygen levels (probe in air)' },
            { label: 'Zero Point', command: 'Cal,zero', type: 'secondary', description: 'Calibrate zero dissolved oxygen (probe in zero DO solution)' },
            { label: 'Clear Cal', command: 'Cal,clear', type: 'warning', description: 'Clear all calibration data' },
            { label: 'Check Status', command: 'Cal,?', type: 'info', description: 'Check calibration status' }
        ],
        notes: [
            '• For Atmospheric calibration: remove probe cap and expose to air until stable',
            '• Expected reading after atmospheric cal: 9.09-9.1X mg/L',
            '• Zero calibration is optional (only needed for readings under 1 mg/L)',
            '• For zero cal: use zero dissolved oxygen solution, stir to remove air bubbles',
            '• Wait for readings to stabilize before calibrating',
            '• Expected responses: *OK (success), *ER (error), or calibration status'
        ]
    }
};

// Load sensor configuration from the server
function loadSensorConfig() {
    console.log("Loading sensor configuration...");
    fetch('/sensors/config')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log("Sensor configuration loaded:", data);
            sensorConfigData = data.sensors || [];
            renderSensorTable();
            renderModbusRegisterMap();
        })
        .catch(error => {
            console.error('Error loading sensor configuration:', error);
            showToast('Failed to load sensor configuration: ' + error.message, 'error', false, 5000);
        });
}

// Render the complete Modbus register usage map
function renderModbusRegisterMap() {
    // Get configured sensors to determine the range needed
    const allSensors = sensorConfigData || [];
    const activeSensors = allSensors.filter(sensor => sensor.enabled);
    
    // Find the highest register number used by sensors
    let maxSensorRegister = 31; // Default firmware range
    allSensors.forEach(sensor => {
        if (sensor.modbusRegister !== undefined && sensor.modbusRegister > maxSensorRegister) {
            maxSensorRegister = sensor.modbusRegister;
        }
    });
    
    // Extend range to accommodate all sensors, with some padding
    const inputRegisterRange = Math.max(32, maxSensorRegister + 10);
    
    // Define system register allocations based on the firmware
    const systemMap = {
        discreteInputs: [
            { range: [0, 7], type: 'system', label: 'DI' }
        ],
        coils: [
            { range: [0, 7], type: 'system', label: 'DO' },
            { range: [100, 107], type: 'used', label: 'Latch Reset' }
        ],
        inputRegisters: [
            { range: [0, 2], type: 'system', label: 'AI' },
            { range: [3, 3], type: 'system', label: 'Temp' },
            { range: [4, 4], type: 'system', label: 'Humidity' }
        ],
        holdingRegisters: []
    };
    
    // Render each register type
    renderRegisterSection('discrete-inputs-map', 16, systemMap.discreteInputs, [], 'Discrete Input');
    renderRegisterSection('coils-map', 128, systemMap.coils, [], 'Coil');
    renderRegisterSection('input-registers-map', inputRegisterRange, systemMap.inputRegisters, allSensors, 'Input Reg');
    renderRegisterSection('holding-registers-map', 16, systemMap.holdingRegisters, [], 'Holding Reg');
}

// Helper function to render a register section
function renderRegisterSection(elementId, maxRegisters, systemMappings, sensors, labelPrefix) {
    const container = document.getElementById(elementId);
    const registers = [];
    
    // Initialize all registers as available
    for (let i = 0; i < maxRegisters; i++) {
        registers[i] = {
            number: i,
            type: 'available',
            label: 'Available',
            title: `${labelPrefix} ${i}: Available for use`
        };
    }
    
    // Apply system mappings
    systemMappings.forEach(mapping => {
        const [start, end] = mapping.range;
        for (let i = start; i <= end; i++) {
            if (i < maxRegisters) {
                registers[i] = {
                    number: i,
                    type: mapping.type,
                    label: `${mapping.label}${mapping.range[0] === mapping.range[1] ? '' : (i - start + 1)}`,
                    title: `${labelPrefix} ${i}: ${mapping.label} ${mapping.range[0] === mapping.range[1] ? '' : (i - start + 1)}`
                };
            }
        }
    });
    
    // Apply sensor mappings (only for input registers in this system)
    if (elementId === 'input-registers-map') {
        sensors.forEach(sensor => {
            const reg = sensor.modbusRegister;
            if (reg !== undefined && reg < maxRegisters) {
                const sensorType = sensor.enabled ? 'sensor' : 'sensor-disabled';
                const enabledStatus = sensor.enabled ? 'Enabled' : 'Disabled';
                registers[reg] = {
                    number: reg,
                    type: sensorType,
                    label: sensor.name.length > 8 ? sensor.name.substring(0, 6) + '...' : sensor.name,
                    title: `${labelPrefix} ${reg}: ${sensor.name} (${sensor.type}) - ${enabledStatus}`
                };
            }
        });
    }
    
    // Render the registers
    container.innerHTML = registers.map(reg => `
        <div class="register-item ${reg.type}" title="${reg.title}">
            <div class="register-number">${reg.number}</div>
            <div class="register-label">${reg.label}</div>
        </div>
    `).join('');
}

// Render the sensor table
function renderSensorTable() {
    const tableBody = document.getElementById('sensor-table-body');
    
    if (sensorConfigData.length === 0) {
        tableBody.innerHTML = '<tr class="no-sensors"><td colspan="7">No sensors configured</td></tr>';
        return;
    }
    
    tableBody.innerHTML = sensorConfigData.map((sensor, index) => {
        const i2cAddress = sensor.i2cAddress ? `0x${sensor.i2cAddress.toString(16).toUpperCase().padStart(2, '0')}` : 'N/A';
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
                        <button class="calibrate-btn" onclick="calibrateSensor(${index})" title="Calibrate sensor">Calibrate</button>
                        ${sensor.type.startsWith('EZO_') ? '<button class="ezo-calibrate-btn" onclick="showEzoCalibrationModal(' + index + ')" title="EZO Calibration">EZO Cal</button>' : ''}
                        <button class="delete-btn" onclick="deleteSensor(${index})" title="Delete sensor">Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    // Also update the register usage map
    renderModbusRegisterMap();
}

// Show the add sensor modal
function showAddSensorModal() {
    editingSensorIndex = -1;
    document.getElementById('sensor-modal-title').textContent = 'Add Sensor';
    document.getElementById('sensor-form').reset();
    document.getElementById('sensor-enabled').checked = true;
    
    // Setup sensor calibration method listeners
    setupSensorCalibrationMethodListeners();
    
    // Reset calibration to defaults
    document.getElementById('sensor-method-linear').checked = true;
    document.getElementById('sensor-calibration-offset').value = 0;
    document.getElementById('sensor-calibration-scale').value = 1;
    document.getElementById('sensor-calibration-polynomial').value = '';
    document.getElementById('sensor-calibration-expression').value = '';
    showSensorCalibrationMethod('linear');
    
    document.getElementById('sensor-modal-overlay').classList.add('show');
}

// Show the edit sensor modal
function editSensor(index) {
    if (index < 0 || index >= sensorConfigData.length) {
        showToast('Invalid sensor index', 'error');
        return;
    }
    
    const sensor = sensorConfigData[index];
    editingSensorIndex = index;
    
    document.getElementById('sensor-modal-title').textContent = 'Edit Sensor';
    document.getElementById('sensor-name').value = sensor.name;
    document.getElementById('sensor-type').value = sensor.type;
    document.getElementById('sensor-i2c-address').value = sensor.i2cAddress ? `0x${sensor.i2cAddress.toString(16).toUpperCase().padStart(2, '0')}` : '';
    document.getElementById('sensor-modbus-register').value = sensor.modbusRegister || '';
    document.getElementById('sensor-enabled').checked = sensor.enabled;
    
    // Setup sensor calibration method listeners
    setupSensorCalibrationMethodListeners();
    
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
    
    document.getElementById('sensor-modal-overlay').classList.add('show');
}

// Setup sensor calibration method radio button listeners
function setupSensorCalibrationMethodListeners() {
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
function showSensorCalibrationMethod(method) {
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
function hideSensorModal() {
    document.getElementById('sensor-modal-overlay').classList.remove('show');
    editingSensorIndex = -1;
}

// Parse I2C address from input (supports 0x48, 48, etc.)
function parseI2CAddress(addressStr) {
    if (!addressStr) return 0;
    
    const cleanStr = addressStr.trim();
    if (cleanStr.toLowerCase().startsWith('0x')) {
        return parseInt(cleanStr, 16);
    } else {
        return parseInt(cleanStr, 16);
    }
}

// Save sensor (add or update)
function saveSensor() {
    const form = document.getElementById('sensor-form');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const name = document.getElementById('sensor-name').value.trim();
    const type = document.getElementById('sensor-type').value;
    const i2cAddressStr = document.getElementById('sensor-i2c-address').value.trim();
    const modbusRegister = parseInt(document.getElementById('sensor-modbus-register').value);
    const enabled = document.getElementById('sensor-enabled').checked;
    
    // Validate inputs
    if (!name || !type || !i2cAddressStr || isNaN(modbusRegister)) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    const i2cAddress = parseI2CAddress(i2cAddressStr);
    if (i2cAddress < 1 || i2cAddress > 127) {
        showToast('I2C address must be between 0x01 and 0x7F (1-127)', 'error');
        return;
    }
    
    // Validate Modbus register range - system reserves 0-4 for built-in I/O
    if (modbusRegister < 5) {
        showToast('Modbus register must be 5 or higher (0-4 are reserved for system I/O)', 'error');
        return;
    }
    
    if (modbusRegister > 65535) {
        showToast('Modbus register must be 65535 or lower', 'error');
        return;
    }
    
    // Check for duplicate I2C addresses (excluding the sensor being edited)
    const duplicateI2C = sensorConfigData.some((sensor, index) => 
        index !== editingSensorIndex && sensor.i2cAddress === i2cAddress
    );
    if (duplicateI2C) {
        showToast('I2C address already in use by another sensor', 'error');
        return;
    }
    
    // Check for duplicate Modbus registers (excluding the sensor being edited)
    const duplicateModbus = sensorConfigData.some((sensor, index) => 
        index !== editingSensorIndex && sensor.modbusRegister === modbusRegister
    );
    if (duplicateModbus) {
        showToast('Modbus register already in use by another sensor', 'error');
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
    
    const sensor = {
        enabled: enabled,
        name: name,
        type: type,
        i2cAddress: i2cAddress,
        modbusRegister: modbusRegister,
        calibration: calibration
    };
    
    if (editingSensorIndex === -1) {
        // Adding new sensor
        if (sensorConfigData.length >= 10) { // MAX_SENSORS from backend
            showToast('Maximum number of sensors (10) reached', 'error');
            return;
        }
        sensorConfigData.push(sensor);
        showToast('Sensor added successfully', 'success');
    } else {
        // Updating existing sensor
        sensorConfigData[editingSensorIndex] = sensor;
        showToast('Sensor updated successfully', 'success');
    }
    
    renderSensorTable();
    hideSensorModal();
}

// Show calibration modal for a specific sensor
function calibrateSensor(index) {
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
function setupCalibrationMethodListeners() {
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
function showCalibrationMethod(method) {
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
function showPresetTab(tabName) {
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
function setLinearPreset(offset, scale) {
    document.getElementById('method-linear').checked = true;
    document.getElementById('calibration-offset').value = offset;
    document.getElementById('calibration-scale').value = scale;
    showCalibrationMethod('linear');
}

function setPolynomialPreset(polynomial) {
    document.getElementById('method-polynomial').checked = true;
    document.getElementById('calibration-polynomial').value = polynomial;
    showCalibrationMethod('polynomial');
}

function setExpressionPreset(expression) {
    document.getElementById('method-expression').checked = true;
    document.getElementById('calibration-expression').value = expression;
    showCalibrationMethod('expression');
}

// Client-side validation for expressions and polynomials
function validateExpression(expression) {
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

function validatePolynomial(polynomial) {
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
function hideCalibrationModal() {
    document.getElementById('calibration-modal-overlay').classList.remove('show');
    editingSensorIndex = -1;
}

// Save calibration data
function saveCalibration() {
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
        renderSensorTable();
        hideCalibrationModal();
        
        showToast(`Calibration updated successfully (${selectedMethod})`, 'success');
        
    } catch (error) {
        console.error('Error saving calibration:', error);
        showToast('Error saving calibration: ' + error.message, 'error');
    }
}

// Reset calibration to defaults
function resetCalibration() {
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
function deleteSensor(index) {
    if (index < 0 || index >= sensorConfigData.length) {
        showToast('Invalid sensor index', 'error');
        return;
    }
    
    const sensor = sensorConfigData[index];
    if (confirm(`Are you sure you want to delete sensor "${sensor.name}"?`)) {
        sensorConfigData.splice(index, 1);
        renderSensorTable();
        showToast('Sensor deleted successfully', 'success');
    }
}

// Save sensor configuration to the device
function saveSensorConfig() {
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
            // Show countdown toast with reboot message
            showCountdownToast(
                'Sensor configuration saved successfully! Device is rebooting...', 
                'success', 
                5, 
                () => window.location.reload()
            );
        } else {
            showToast('Failed to save sensor configuration: ' + (data.message || 'Unknown error'), 'error', false, 5000);
        }
    })
    .catch(error => {
        // Remove loading toast if it exists
        if (document.getElementById('toast-container').contains(loadingToast)) {
            document.getElementById('toast-container').removeChild(loadingToast);
        }
        showToast('Error saving sensor configuration: ' + error.message, 'error', false, 5000);
    });
}

// EZO Calibration Functions

function showEzoCalibrationModal(index) {
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

function hideEzoCalibrationModal() {
    document.getElementById('ezo-calibration-modal-overlay').classList.remove('show');
    currentEzoSensorIndex = -1;
}

function sendEzoCalibrationCommand(command) {
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

function sendEzoCalibrationCommandWithValue(commandTemplate, buttonLabel) {
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

// Modify updateIOStatus to update EZO calibration response when modal is open
const originalUpdateIOStatus = updateIOStatus;

function updateIOStatus() {
    // Call the original function
    originalUpdateIOStatus();
    
    // Update EZO calibration modal response if it's open
    const ezoModal = document.getElementById('ezo-calibration-modal-overlay');
    if (ezoModal && ezoModal.classList.contains('show') && currentEzoSensorIndex >= 0) {
        // Get the latest sensor data from the iostatus response
        fetch('/iostatus')
            .then(response => response.json())
            .then(data => {
                if (data.ezo_sensors && data.ezo_sensors[currentEzoSensorIndex]) {
                    const sensorData = data.ezo_sensors[currentEzoSensorIndex];
                    const responseElement = document.getElementById('ezo-sensor-response');
                    if (sensorData.response && sensorData.response.trim() !== '') {
                        responseElement.textContent = sensorData.response;
                    }
                }
            })
            .catch(error => {
                console.log('Could not update EZO sensor response:', error);
            });
    }
}