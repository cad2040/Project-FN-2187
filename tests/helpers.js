const mysql = require('mysql2/promise');

// Database helper functions
const createTestDatabase = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  });

  await connection.query(`DROP DATABASE IF EXISTS ${process.env.DB_NAME}`);
  await connection.query(`CREATE DATABASE ${process.env.DB_NAME}`);
  await connection.end();
};

const setupTestData = async (pool) => {
  const connection = await pool.getConnection();
  
  // Insert test sensors
  await connection.query(`
    INSERT INTO Sensors (name, location, minTemp, maxTemp, status)
    VALUES 
      ('Test Sensor 1', 'Test Room 1', 18, 25, 'ACTIVE'),
      ('Test Sensor 2', 'Test Room 2', 19, 24, 'ACTIVE')
  `);

  // Insert test readings
  await connection.query(`
    INSERT INTO SensorReadings (sensorId, temperature, humidity, timestamp)
    VALUES 
      (1, 22.5, 45, NOW()),
      (1, 23.0, 46, DATE_SUB(NOW(), INTERVAL 1 HOUR)),
      (2, 21.5, 44, NOW())
  `);

  await connection.release();
};

// WebSocket helper functions
const createTestWebSocket = (server) => {
  return new Promise((resolve) => {
    const ws = new WebSocket(`ws://localhost:${server.address().port}`);
    ws.on('open', () => resolve(ws));
  });
};

const waitForWebSocketMessage = (ws, expectedType, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('WebSocket message timeout'));
    }, timeout);

    ws.on('message', (data) => {
      const message = JSON.parse(data);
      if (message.type === expectedType) {
        clearTimeout(timer);
        resolve(message);
      }
    });
  });
};

// API helper functions
const createTestSensor = async (app, sensorData) => {
  const response = await request(app)
    .post('/api/sensors')
    .send(sensorData)
    .set('Accept', 'application/json');
  
  return response.body;
};

const createTestReading = async (app, readingData) => {
  const response = await request(app)
    .post('/api/readings')
    .send(readingData)
    .set('Accept', 'application/json');
  
  return response.body;
};

// Validation helper functions
const isValidSensorData = (data) => {
  return (
    typeof data.id === 'number' &&
    typeof data.name === 'string' &&
    typeof data.location === 'string' &&
    typeof data.minTemp === 'number' &&
    typeof data.maxTemp === 'number' &&
    typeof data.status === 'string'
  );
};

const isValidReadingData = (data) => {
  return (
    typeof data.id === 'number' &&
    typeof data.sensorId === 'number' &&
    typeof data.temperature === 'number' &&
    typeof data.humidity === 'number' &&
    data.timestamp instanceof Date
  );
};

module.exports = {
  createTestDatabase,
  setupTestData,
  createTestWebSocket,
  waitForWebSocketMessage,
  createTestSensor,
  createTestReading,
  isValidSensorData,
  isValidReadingData
}; 