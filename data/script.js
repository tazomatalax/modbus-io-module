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
                return `<div class="io-item ${value ? 'io-on' : 'io-off'}">
                    <span><strong>DI${index + 1}</strong>${isInverted ? ' <span class="inverted-indicator" title="This input is inverted"></span>' : ''}</span>
                    <span>${value ? 'ON' : 'OFF'}</span>
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

// Global configuration state
let ioConfigState = {
    di_pullup: Array(8).fill(false),
    di_invert: Array(8).fill(false),
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
                do_invert: [...data.do_invert],
                do_initial_state: [...data.do_initial_state]
            };
            
            // Digital Inputs configuration
            const diConfigDiv = document.getElementById('di-config');
            let diConfigHtml = '';
            
            for (let i = 0; i < data.di_pullup.length; i++) {
                diConfigHtml += `
                    <div class="io-config-item">
                        <div class="io-config-title">DI${i + 1}</div>
                        <div class="io-config-options">
                            <label class="switch-label">
                                <input type="checkbox" id="di-pullup-${i}" ${data.di_pullup[i] ? 'checked' : ''}>
                                <span class="switch-text">Pullup</span>
                            </label>
                            <label class="switch-label">
                                <input type="checkbox" id="di-invert-${i}" ${data.di_invert[i] ? 'checked' : ''}>
                                <span class="switch-text">Invert</span>
                            </label>
                        </div>
                    </div>
                `;
            }
            diConfigDiv.innerHTML = diConfigHtml;
            
            // Digital Outputs configuration
            const doConfigDiv = document.getElementById('do-config');
            let doConfigHtml = '';
            
            for (let i = 0; i < data.do_invert.length; i++) {
                doConfigHtml += `
                    <div class="io-config-item">
                        <div class="io-config-title">DO${i + 1}</div>
                        <div class="io-config-options">
                            <label class="switch-label">
                                <input type="checkbox" id="do-initial-${i}" ${data.do_initial_state[i] ? 'checked' : ''}>
                                <span class="switch-text">Initial ON</span>
                            </label>
                            <label class="switch-label">
                                <input type="checkbox" id="do-invert-${i}" ${data.do_invert[i] ? 'checked' : ''}>
                                <span class="switch-text">Invert</span>
                            </label>
                        </div>
                    </div>
                `;
            }
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
        do_invert: [],
        do_initial_state: []
    };
    
    // Get digital input configuration
    for (let i = 0; i < 8; i++) {
        ioConfig.di_pullup.push(document.getElementById(`di-pullup-${i}`).checked);
        ioConfig.di_invert.push(document.getElementById(`di-invert-${i}`).checked);
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
        do_invert: [...ioConfig.do_invert],
        do_initial_state: [...ioConfig.do_initial_state]
    };
    
    console.log("Saving IO configuration:", ioConfig);
    
    // Show loading toast
    const loadingToast = showToast('Saving IO configuration...', 'success');
    
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
    const loadingToast = showToast('Saving configuration...', 'success');
    
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
}, 500);