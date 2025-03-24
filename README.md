# Baby Monitor Dashboard

A comprehensive baby monitoring system using ESP8266 microcontrollers and temperature sensors. This project provides real-time temperature monitoring, data visualization, and remote management capabilities.

## Features

- **Real-time Temperature Monitoring**
  - Support for DHT22 and DS18B20 temperature sensors
  - Multiple sensor locations (nursery, living room, bedroom)
  - Temperature range monitoring and alerts
  - Historical data tracking

- **Web Dashboard**
  - Real-time temperature visualization using Chart.js
  - WebSocket-based live updates
  - Responsive design with Bootstrap 5
  - Dark/light theme support
  - Interactive charts and graphs

- **Power Management**
  - Deep sleep mode for energy efficiency
  - Configurable update intervals
  - Battery level monitoring
  - Power-saving LED indicators

- **Security Features**
  - Device authentication
  - Secure WebSocket connections
  - Rate limiting
  - Input validation
  - Helmet.js security headers

- **Data Management**
  - MySQL database storage
  - Automatic data retention
  - Data visualization
  - Export capabilities

## Hardware Requirements

### Required Components
- ESP8266 microcontroller (NodeMCU or similar)
- DHT22 or DS18B20 temperature sensor
- LED indicators (3x)
  - Green: Normal operation
  - Yellow: Warning/Processing
  - Red: Error/Alert
- Power supply (USB or battery)
- Jumper wires
- Breadboard (optional)

### Optional Components
- Battery pack for portable operation
- Enclosure for protection
- External antenna for better WiFi range

## Wiring Diagram

### DHT22 Sensor
```
ESP8266    DHT22
3.3V   --> VCC
GND    --> GND
D4     --> DATA
```

### DS18B20 Sensor
```
ESP8266    DS18B20
3.3V   --> VCC
GND    --> GND
D4     --> DATA
```

### LED Indicators
```
ESP8266    LED
3.3V   --> Green LED (through 220Ω resistor)
D5     --> Yellow LED (through 220Ω resistor)
D6     --> Red LED (through 220Ω resistor)
```

## Software Setup

### Prerequisites
- Node.js (v14 or higher)
- MySQL Server (v5.7 or higher)
- Arduino IDE
- Required Arduino libraries:
  - ESP8266WiFi
  - DHT sensor library
  - OneWire
  - DallasTemperature
  - ESP8266HTTPClient
  - ArduinoJson

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/baby-monitor.git
cd baby-monitor
```

2. Install Node.js dependencies:
```bash
npm install
```

3. Set up the database:
```bash
mysql -u root -p < MySQL\ Deploy
```

4. Configure environment variables:
Create a `.env` file in the project root:
```env
PORT=3000
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=BabyMonitor
NODE_ENV=development
```

5. Start the server:
```bash
npm start
```

### Arduino Setup

1. Open the appropriate sketch in Arduino IDE:
   - `ESP8266 - DHT22 Sketch` for DHT22 sensors
   - `ESP8266 - DS18B20 Sketch` for DS18B20 sensors

2. Install required libraries through Arduino IDE Library Manager

3. Configure WiFi and server settings in the sketch:
```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverUrl = "http://your-server:3000";
```

4. Upload the sketch to your ESP8266

## LED Status Indicators

- **Green LED**
  - Solid: Normal operation
  - Blinking: Data transmission
  - Off: Deep sleep

- **Yellow LED**
  - Solid: Processing
  - Blinking: Warning
  - Off: Normal state

- **Red LED**
  - Solid: Error
  - Blinking: Critical error
  - Off: Normal state

## Power Management

The system uses deep sleep mode to conserve power:
- Wake up every 5 minutes (configurable)
- Read temperature data
- Transmit data to server
- Return to deep sleep

## Security Features

- Device authentication using unique keys
- Secure WebSocket connections
- Rate limiting on API endpoints
- Input validation and sanitization
- Security headers with Helmet.js
- CORS protection
- Error logging and monitoring

## Troubleshooting

### Common Issues

1. **WiFi Connection Issues**
   - Check WiFi credentials
   - Verify signal strength
   - Check router settings

2. **Sensor Reading Errors**
   - Verify wiring
   - Check sensor power supply
   - Verify sensor type configuration

3. **Database Connection Issues**
   - Check database credentials
   - Verify MySQL service is running
   - Check network connectivity

4. **WebSocket Connection Issues**
   - Check server status
   - Verify firewall settings
   - Check browser console for errors

### Debug Mode

Enable debug mode by setting `DEBUG_MODE` to `true` in the sketch:
```cpp
#define DEBUG_MODE true
```

## Maintenance

### Data Retention
- Sensor readings: 30 days
- System events: 90 days
- Automatic cleanup via MySQL events

### Device Status
- Automatic status updates
- Inactive device detection after 24 hours
- Status synchronization with sensors

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- ESP8266 community for hardware support
- Chart.js for data visualization
- Bootstrap for UI components
- All contributors and maintainers
