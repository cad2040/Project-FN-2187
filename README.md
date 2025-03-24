# Baby Monitor Dashboard

A comprehensive baby monitoring system using ESP8266 microcontrollers and temperature sensors to track environmental conditions.

## Features

- Temperature monitoring using DHT22 or DS18B20 sensors
- Real-time data storage in MySQL database
- Power-efficient operation with deep sleep mode
- LED status indicators
- Failed reading storage and recovery
- Device authentication and security
- Automatic data retention
- System health monitoring

## Hardware Requirements

### Required Components
- ESP8266 microcontroller (NodeMCU or similar)
- DHT22 or DS18B20 temperature sensor
- LED for status indication
- USB cable for programming
- Power supply (USB or battery)

### Optional Components
- Battery pack for portable operation
- Capacitor for power stability
- Enclosure for protection

## Wiring Diagram

### DHT22 Setup
```
ESP8266    DHT22
3.3V   ->  VCC
GND    ->  GND
GPIO5  ->  DATA
```

### DS18B20 Setup
```
ESP8266    DS18B20
3.3V   ->  VCC
GND    ->  GND
GPIO2  ->  DATA
```

### LED Setup
```
ESP8266    LED
GPIO2  ->  Anode (+)
GND    ->  Cathode (-)
```

## Software Setup

### Prerequisites
- Arduino IDE
- ESP8266 board support
- Required libraries:
  - ESP8266WiFi
  - MySQL_Connection
  - MySQL_Cursor
  - DHTStable (for DHT22)
  - OneWire (for DS18B20)
  - DallasTemperature (for DS18B20)
  - ESP8266HTTPClient
  - ArduinoJson

### Library Installation
1. Open Arduino IDE
2. Go to Tools > Manage Libraries
3. Search for and install each required library

### Database Setup
1. Run the MySQL Deploy script to create the database and tables
2. Update the database credentials in the sketch
3. Configure the sensor IDs in the database

### Code Configuration
1. Open the appropriate sketch (DHT22 or DS18B20)
2. Update the following configuration:
   - WiFi credentials
   - MySQL server details
   - Device key
   - Sensor ID
   - Temperature ranges
   - Reading intervals

## LED Status Indicators

- 3 blinks: Successful startup
- 5 blinks: WiFi connection failure
- 6 blinks: Device validation failure
- 7 blinks: MySQL connection failure
- 2 blinks: Reading failure
- 1 blink: Successful reading

## Power Management

The device uses deep sleep mode to conserve power:
- Automatically disconnects WiFi before sleep
- Wakes up at configured intervals
- Can be disabled in configuration

## Security Features

- Device authentication
- Secure mode option
- Device validation against server
- JSON-based communication
- Password protection

## Troubleshooting

### Common Issues
1. WiFi Connection
   - Check credentials
   - Verify network availability
   - Check signal strength

2. Database Connection
   - Verify server IP
   - Check credentials
   - Ensure MySQL is running

3. Sensor Reading
   - Check wiring
   - Verify sensor type
   - Check temperature ranges

### Debug Mode
Enable debug mode in configuration for detailed logging:
- Connection attempts
- Reading results
- Error messages
- System status

## Maintenance

### Data Retention
- Readings are automatically deleted after 30 days
- System events are retained for 90 days
- Failed readings are stored locally

### Device Status
- Devices are marked inactive after 24 hours without communication
- Sensor status is updated based on device status
- System events are logged for monitoring

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
