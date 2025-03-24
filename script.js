// Global variables
let temperatureChart;
let ws;
let currentSettings = {
    updateInterval: 60,
    tempUnit: 'C',
    dbHost: '',
    dbName: '',
    dbUser: '',
    dbPass: ''
};

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Initialize sidebar toggle
    document.getElementById('sidebarCollapse').addEventListener('click', function() {
        document.getElementById('sidebar').classList.toggle('active');
    });

    // Initialize page navigation
    document.querySelectorAll('#sidebar a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            showPage(page);
        });
    });

    // Initialize modals
    const addSensorBtn = document.getElementById('addSensorBtn');
    const addRoomBtn = document.getElementById('addRoomBtn');
    const addSensorModal = new bootstrap.Modal(document.getElementById('addSensorModal'));
    const addRoomModal = new bootstrap.Modal(document.getElementById('addRoomModal'));

    addSensorBtn.addEventListener('click', () => addSensorModal.show());
    addRoomBtn.addEventListener('click', () => addRoomModal.show());

    // Initialize forms
    document.getElementById('addSensorForm').addEventListener('submit', handleAddSensor);
    document.getElementById('addRoomForm').addEventListener('submit', handleAddRoom);
    document.getElementById('generalSettings').addEventListener('submit', handleGeneralSettings);
    document.getElementById('dbSettings').addEventListener('submit', handleDBSettings);

    // Initialize chart
    initializeChart();

    // Load initial data
    loadSettings();
    loadSensors();
    loadRooms();
    updateDashboard();

    // Initialize WebSocket connection
    initializeWebSocket();
});

// WebSocket initialization
function initializeWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
        console.log('WebSocket connection established');
        showNotification('Connected to server', 'success');
    };
    
    ws.onclose = () => {
        console.log('WebSocket connection closed');
        showNotification('Disconnected from server', 'error');
        // Attempt to reconnect after 5 seconds
        setTimeout(initializeWebSocket, 5000);
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        showNotification('Connection error', 'error');
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
    };
}

// Handle WebSocket messages
function handleWebSocketMessage(data) {
    switch (data.type) {
        case 'sensor_added':
            loadSensors();
            showNotification('New sensor added', 'success');
            break;
        case 'room_added':
            loadRooms();
            showNotification('New room added', 'success');
            break;
        case 'settings_updated':
            currentSettings = { ...currentSettings, ...data.data };
            updateDashboard();
            showNotification('Settings updated', 'success');
            break;
        case 'db_settings_updated':
            showNotification('Database settings updated', 'success');
            break;
        case 'reading_updated':
            updateDashboard();
            break;
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
    notification.style.zIndex = '9999';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(notification);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Page navigation
function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page-content').forEach(page => {
        page.classList.add('d-none');
    });

    // Show selected page
    document.getElementById(`${pageId}-page`).classList.remove('d-none');

    // Update sidebar active state
    document.querySelectorAll('#sidebar li').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`#sidebar a[data-page="${pageId}"]`).parentElement.classList.add('active');
}

// Chart initialization
function initializeChart() {
    const ctx = document.getElementById('temperatureChart').getContext('2d');
    temperatureChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Temperature (°C)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Time'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Temperature Trends'
                }
            }
        }
    });
}

// Data loading functions with error handling
async function loadSettings() {
    try {
        const response = await fetch('/api/settings');
        if (!response.ok) throw new Error('Failed to load settings');
        currentSettings = await response.json();
        updateSettingsForm();
    } catch (error) {
        console.error('Error loading settings:', error);
        showNotification('Failed to load settings', 'error');
    }
}

async function loadSensors() {
    try {
        const response = await fetch('/api/sensors');
        if (!response.ok) throw new Error('Failed to load sensors');
        const sensors = await response.json();
        updateSensorsTable(sensors);
        updateSensorLocationSelect(sensors);
    } catch (error) {
        console.error('Error loading sensors:', error);
        showNotification('Failed to load sensors', 'error');
    }
}

async function loadRooms() {
    try {
        const response = await fetch('/api/rooms');
        if (!response.ok) throw new Error('Failed to load rooms');
        const rooms = await response.json();
        updateRoomsTable(rooms);
        updateRoomSelects(rooms);
    } catch (error) {
        console.error('Error loading rooms:', error);
        showNotification('Failed to load rooms', 'error');
    }
}

async function updateDashboard() {
    try {
        const response = await fetch('/api/readings');
        if (!response.ok) throw new Error('Failed to load readings');
        const data = await response.json();
        updateTemperatureChart(data);
        updateCurrentReadings(data);
        document.getElementById('lastUpdate').textContent = new Date().toLocaleString();
    } catch (error) {
        console.error('Error updating dashboard:', error);
        showNotification('Failed to update dashboard', 'error');
    }
}

// UI update functions
function updateSettingsForm() {
    document.getElementById('updateInterval').value = currentSettings.updateInterval;
    document.getElementById('tempUnit').value = currentSettings.tempUnit;
    document.getElementById('dbHost').value = currentSettings.dbHost;
    document.getElementById('dbName').value = currentSettings.dbName;
    document.getElementById('dbUser').value = currentSettings.dbUser;
}

function updateSensorsTable(sensors) {
    const tbody = document.querySelector('#sensorsTable tbody');
    tbody.innerHTML = '';

    sensors.forEach(sensor => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${sensor.name}</td>
            <td>${sensor.location}</td>
            <td><span class="status-badge status-${sensor.status.toLowerCase()}">${sensor.status}</span></td>
            <td>${sensor.lastReading ? `${sensor.lastReading}°${currentSettings.tempUnit}` : 'N/A'}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editSensor(${sensor.id})">
                    <i class='bx bx-edit'></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteSensor(${sensor.id})">
                    <i class='bx bx-trash'></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function updateRoomsTable(rooms) {
    const tbody = document.querySelector('#roomsTable tbody');
    tbody.innerHTML = '';

    rooms.forEach(room => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${room.name}</td>
            <td>${room.sensors.join(', ')}</td>
            <td>${room.minTemp}°${currentSettings.tempUnit} - ${room.maxTemp}°${currentSettings.tempUnit}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editRoom(${room.id})">
                    <i class='bx bx-edit'></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteRoom(${room.id})">
                    <i class='bx bx-trash'></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function updateTemperatureChart(data) {
    const datasets = data.map(room => ({
        label: room.name,
        data: room.readings.map(r => r.temperature),
        borderColor: getRandomColor(),
        fill: false
    }));

    temperatureChart.data.labels = data[0]?.readings.map(r => new Date(r.timestamp).toLocaleTimeString()) || [];
    temperatureChart.data.datasets = datasets;
    temperatureChart.update();
}

function updateCurrentReadings(data) {
    const container = document.getElementById('currentReadings');
    container.innerHTML = '';

    data.forEach(room => {
        const reading = room.readings[room.readings.length - 1];
        if (reading) {
            const div = document.createElement('div');
            div.className = 'mb-3';
            div.innerHTML = `
                <div class="temperature-label">${room.name}</div>
                <div class="temperature-reading">${reading.temperature}°${currentSettings.tempUnit}</div>
                <div class="temperature-label">Last updated: ${new Date(reading.timestamp).toLocaleTimeString()}</div>
            `;
            container.appendChild(div);
        }
    });
}

// Form handlers with validation
async function handleAddSensor(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const sensorData = {
        name: formData.get('sensorName'),
        location: formData.get('sensorLocation'),
        type: formData.get('sensorType'),
        minTemp: parseFloat(formData.get('minTemp')),
        maxTemp: parseFloat(formData.get('maxTemp'))
    };

    // Validate input
    if (!sensorData.name || !sensorData.location || !sensorData.type || 
        isNaN(sensorData.minTemp) || isNaN(sensorData.maxTemp)) {
        showNotification('Please fill in all fields', 'error');
        return;
    }

    if (sensorData.minTemp >= sensorData.maxTemp) {
        showNotification('Minimum temperature must be less than maximum temperature', 'error');
        return;
    }

    try {
        const response = await fetch('/api/sensors', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(sensorData)
        });

        if (!response.ok) throw new Error('Failed to add sensor');

        bootstrap.Modal.getInstance(document.getElementById('addSensorModal')).hide();
        e.target.reset();
        loadSensors();
    } catch (error) {
        console.error('Error adding sensor:', error);
        showNotification('Failed to add sensor', 'error');
    }
}

async function handleAddRoom(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const roomData = {
        name: formData.get('roomName'),
        minTemp: parseFloat(formData.get('roomMinTemp')),
        maxTemp: parseFloat(formData.get('roomMaxTemp'))
    };

    // Validate input
    if (!roomData.name || isNaN(roomData.minTemp) || isNaN(roomData.maxTemp)) {
        showNotification('Please fill in all fields', 'error');
        return;
    }

    if (roomData.minTemp >= roomData.maxTemp) {
        showNotification('Minimum temperature must be less than maximum temperature', 'error');
        return;
    }

    try {
        const response = await fetch('/api/rooms', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(roomData)
        });

        if (!response.ok) throw new Error('Failed to add room');

        bootstrap.Modal.getInstance(document.getElementById('addRoomModal')).hide();
        e.target.reset();
        loadRooms();
    } catch (error) {
        console.error('Error adding room:', error);
        showNotification('Failed to add room', 'error');
    }
}

async function handleGeneralSettings(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const settings = {
        updateInterval: parseInt(formData.get('updateInterval')),
        tempUnit: formData.get('tempUnit')
    };

    // Validate input
    if (settings.updateInterval < 30 || settings.updateInterval > 3600) {
        showNotification('Update interval must be between 30 and 3600 seconds', 'error');
        return;
    }

    try {
        const response = await fetch('/api/settings', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });

        if (!response.ok) throw new Error('Failed to update settings');

        currentSettings = { ...currentSettings, ...settings };
        updateDashboard();
        showNotification('Settings updated successfully', 'success');
    } catch (error) {
        console.error('Error updating settings:', error);
        showNotification('Failed to update settings', 'error');
    }
}

async function handleDBSettings(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const settings = {
        dbHost: formData.get('dbHost'),
        dbName: formData.get('dbName'),
        dbUser: formData.get('dbUser'),
        dbPass: formData.get('dbPass')
    };

    // Validate input
    if (!settings.dbHost || !settings.dbName || !settings.dbUser) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    try {
        const response = await fetch('/api/settings/db', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });

        if (!response.ok) throw new Error('Failed to update database settings');

        currentSettings = { ...currentSettings, ...settings };
        showNotification('Database settings updated successfully', 'success');
    } catch (error) {
        console.error('Error updating database settings:', error);
        showNotification('Failed to update database settings', 'error');
    }
}

// Utility functions
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Start periodic updates
setInterval(updateDashboard, currentSettings.updateInterval * 1000); 