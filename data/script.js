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
            diDiv.innerHTML = data.di.map((value, index) => 
                `<div class="io-item ${value ? 'io-on' : 'io-off'}">
                    <span><strong>DI${index + 1}</strong></span>
                    <span>${value ? 'ON' : 'OFF'}</span>
                </div>`
            ).join('');

            // Update digital outputs with click handlers
            const doDiv = document.getElementById('digital-outputs');
            doDiv.innerHTML = data.do.map((value, index) => 
                `<div class="io-item output-item ${value ? 'io-on' : 'io-off'}" 
                      onclick="toggleOutput(${index}, ${value})">
                    <span><strong>DO${index + 1}</strong></span>
                    <span>${value ? 'ON' : 'OFF'}</span>
                </div>`
            ).join('');

            // Update analog inputs
            const aiDiv = document.getElementById('analog-inputs');
            aiDiv.innerHTML = data.ai.map((value, index) => 
                `<div class="io-item analog-value">
                    <span><strong>AI${index + 1}</strong></span>
                    <span>${value} mV</span>
                </div>`
            ).join('');
            
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

// Add the IO configuration handling
let ioConfigLoadAttempts = 0;
const MAX_IO_CONFIG_LOAD_ATTEMPTS = 5;

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
                                <input type="checkbox" id="do-invert-${i}" ${data.do_invert[i] ? 'checked' : ''}>
                                <span class="switch-text">Invert</span>
                            </label>
                        </div>
                    </div>
                `;
            }
            doConfigDiv.innerHTML = doConfigHtml;
            
            // Analog Inputs configuration
            const aiConfigDiv = document.getElementById('ai-config');
            let aiConfigHtml = '';
            
            for (let i = 0; i < data.ai_pulldown.length; i++) {
                aiConfigHtml += `
                    <div class="io-config-item">
                        <div class="io-config-title">AI${i + 1}</div>
                        <div class="io-config-options">
                            <label class="switch-label">
                                <input type="checkbox" id="ai-pulldown-${i}" ${data.ai_pulldown[i] ? 'checked' : ''}>
                                <span class="switch-text">Pulldown</span>
                            </label>
                            <label class="switch-label">
                                <input type="checkbox" id="ai-raw-${i}" ${data.ai_raw_format[i] ? 'checked' : ''}>
                                <span class="switch-text">RAW Format</span>
                            </label>
                        </div>
                    </div>
                `;
            }
            aiConfigDiv.innerHTML = aiConfigHtml;
            
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

function saveIOConfig() {
    // Gather all configuration data
    const ioConfig = {
        di_pullup: [],
        di_invert: [],
        do_invert: [],
        ai_pulldown: [],
        ai_raw_format: []
    };
    
    // Get digital input configuration
    const diLength = document.querySelectorAll('[id^="di-pullup-"]').length;
    for (let i = 0; i < diLength; i++) {
        ioConfig.di_pullup.push(document.getElementById(`di-pullup-${i}`).checked);
        ioConfig.di_invert.push(document.getElementById(`di-invert-${i}`).checked);
    }
    
    // Get digital output configuration
    const doLength = document.querySelectorAll('[id^="do-invert-"]').length;
    for (let i = 0; i < doLength; i++) {
        ioConfig.do_invert.push(document.getElementById(`do-invert-${i}`).checked);
    }
    
    // Get analog input configuration
    const aiLength = document.querySelectorAll('[id^="ai-pulldown-"]').length;
    for (let i = 0; i < aiLength; i++) {
        ioConfig.ai_pulldown.push(document.getElementById(`ai-pulldown-${i}`).checked);
        ioConfig.ai_raw_format.push(document.getElementById(`ai-raw-${i}`).checked);
    }
    
    console.log("Saving IO configuration:", ioConfig);
    
    // Send configuration to server
    fetch('/ioconfig', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(ioConfig)
    })
    .then(response => response.json())
    .then(data => {
        const status = document.getElementById('io-config-status');
        status.style.display = 'block';
        
        if (data.success) {
            status.style.backgroundColor = 'var(--success-color)';
            status.style.color = 'white';
            if (data.changed) {
                status.textContent = 'IO Configuration saved successfully!';
            } else {
                status.textContent = 'No changes detected in IO Configuration.';
            }
            
            // Hide the status message after 3 seconds
            setTimeout(() => {
                status.style.display = 'none';
            }, 3000);
        } else {
            status.style.backgroundColor = 'var(--error-color)';
            status.style.color = 'white';
            status.textContent = 'Failed to save IO Configuration. Please try again.';
        }
    })
    .catch(error => {
        console.error('Error saving IO configuration:', error);
        const status = document.getElementById('io-config-status');
        status.style.display = 'block';
        status.style.backgroundColor = 'var(--error-color)';
        status.style.color = 'white';
        status.textContent = 'Error saving IO Configuration: ' + error.message;
    });
}

// Toggle IP fields when DHCP checkbox changes
document.getElementById('dhcp').addEventListener('change', function(e) {
    const disabled = e.target.checked;
    ['ip', 'subnet', 'gateway'].forEach(id => {
        document.getElementById(id).disabled = disabled;
    });
});

function saveConfig() {
    const config = {
        dhcp: document.getElementById('dhcp').checked,
        ip: document.getElementById('ip').value,
        subnet: document.getElementById('subnet').value,
        gateway: document.getElementById('gateway').value,
        hostname: document.getElementById('hostname').value,
        modbus_port: document.getElementById('modbus_port').value
    };

    fetch('/config', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(config)
    })
    .then(response => response.json())
    .then(data => {
        const status = document.getElementById('status');
        status.style.display = 'block';
        
        if (data.success) {
            status.style.backgroundColor = '#4CAF50';
            status.style.color = 'white';
            status.innerHTML = 'Configuration saved successfully! Rebooting now...';
            document.getElementById('current-ip').textContent = data.ip;
            
            // Set a countdown for reload
            let countdown = 5;
            const countdownInterval = setInterval(() => {
                countdown--;
                status.innerHTML = `Configuration saved successfully! Rebooting now... Page will reload in ${countdown} seconds`;
                if (countdown <= 0) {
                    clearInterval(countdownInterval);
                    window.location.reload();
                }
            }, 1000);
        } else {
            status.style.backgroundColor = '#f44336';
            status.style.color = 'white';
            status.innerHTML = 'Error: ' + data.error;
        }
        
        setTimeout(() => {
            status.style.display = 'none';
        }, 3000);
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