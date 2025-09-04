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
            
            // Update I2C sensors
            const i2cContainer = document.getElementById('i2c-sensors-container');
            if (data.i2c_sensors) {
                i2cContainer.innerHTML = `
                    <div class="io-item analog-value">
                        <span><strong>Temperature</strong></span>
                        <span>${data.i2c_sensors.temperature} °C</span>
                    </div>
                    <div class="io-item analog-value">
                        <span><strong>Humidity</strong></span>
                        <span>${data.i2c_sensors.humidity} %</span>
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
}, 500);

// Add event listener for reset latches button
document.getElementById('reset-latches-btn').addEventListener('click', resetLatches);

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
        tableBody.innerHTML = '<tr class="no-sensors"><td colspan="6">No sensors configured</td></tr>';
        return;
    }
    
    tableBody.innerHTML = sensorConfigData.map((sensor, index) => {
        const i2cAddress = sensor.i2cAddress ? `0x${sensor.i2cAddress.toString(16).toUpperCase().padStart(2, '0')}` : 'N/A';
        const enabledClass = sensor.enabled ? 'sensor-enabled' : 'sensor-disabled';
        const enabledText = sensor.enabled ? 'Yes' : 'No';
        
        return `
            <tr>
                <td>${sensor.name}</td>
                <td>${sensor.type}</td>
                <td>${i2cAddress}</td>
                <td>${sensor.modbusRegister || 'N/A'}</td>
                <td class="${enabledClass}">${enabledText}</td>
                <td>
                    <div class="sensor-actions">
                        <button class="edit-btn" onclick="editSensor(${index})" title="Edit sensor">Edit</button>
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
    
    document.getElementById('sensor-modal-overlay').classList.add('show');
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
    
    const sensor = {
        enabled: enabled,
        name: name,
        type: type,
        i2cAddress: i2cAddress,
        modbusRegister: modbusRegister
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