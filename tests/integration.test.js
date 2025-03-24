const request = require('supertest');
const WebSocket = require('ws');
const { createServer } = require('http');
const app = require('../server');
const { pool } = require('../server');

describe('Integration Tests', () => {
  let server;
  let ws;
  let connection;

  beforeAll(async () => {
    // Start HTTP server
    server = createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      // Connect WebSocket
      ws = new WebSocket(`ws://localhost:${port}`);
    });

    // Get database connection
    connection = await pool.getConnection();
  });

  afterAll(async () => {
    ws.close();
    server.close();
    await connection.release();
    await pool.end();
  });

  beforeEach(async () => {
    await connection.query('START TRANSACTION');
  });

  afterEach(async () => {
    await connection.query('ROLLBACK');
  });

  describe('End-to-End Sensor Reading Flow', () => {
    test('should handle complete sensor reading flow', async () => {
      // 1. Create a new sensor
      const sensorResponse = await request(app)
        .post('/api/sensors')
        .send({
          name: 'Test Sensor',
          location: 'Test Room',
          minTemp: 18,
          maxTemp: 25
        })
        .set('Accept', 'application/json');

      expect(sensorResponse.status).toBe(201);
      const sensorId = sensorResponse.body.id;

      // 2. Send sensor reading via WebSocket
      const reading = {
        type: 'sensor_update',
        sensorId: sensorId,
        temperature: 22.5,
        humidity: 45,
        timestamp: new Date().toISOString()
      };

      ws.send(JSON.stringify(reading));

      // 3. Verify reading was stored in database
      const [rows] = await connection.query(
        'SELECT * FROM SensorReadings WHERE sensorId = ? ORDER BY timestamp DESC LIMIT 1',
        [sensorId]
      );

      expect(rows[0]).toBeDefined();
      expect(rows[0].temperature).toBe(22.5);
      expect(rows[0].humidity).toBe(45);

      // 4. Verify reading is available via API
      const apiResponse = await request(app)
        .get(`/api/readings/${sensorId}`)
        .set('Accept', 'application/json');

      expect(apiResponse.status).toBe(200);
      expect(apiResponse.body[0].temperature).toBe(22.5);
    });
  });

  describe('Real-time Updates Flow', () => {
    test('should broadcast updates to all connected clients', (done) => {
      let receivedUpdates = 0;
      const expectedUpdates = 3;

      ws.on('message', (data) => {
        const message = JSON.parse(data);
        if (message.type === 'sensor_update') {
          receivedUpdates++;
          if (receivedUpdates === expectedUpdates) {
            done();
          }
        }
      });

      // Send multiple updates
      for (let i = 0; i < expectedUpdates; i++) {
        const reading = {
          type: 'sensor_update',
          sensorId: 1,
          temperature: 22 + i,
          humidity: 45 + i,
          timestamp: new Date().toISOString()
        };
        ws.send(JSON.stringify(reading));
      }
    });
  });

  describe('Error Handling Flow', () => {
    test('should handle and recover from database errors', async () => {
      // 1. Force database error
      await connection.query('SET SESSION sql_mode = "STRICT_ALL_TABLES"');
      
      // 2. Try to insert invalid data
      const response = await request(app)
        .post('/api/readings')
        .send({
          sensorId: 999, // Non-existent sensor
          temperature: 'invalid',
          humidity: 45
        })
        .set('Accept', 'application/json');

      expect(response.status).toBe(400);

      // 3. Verify system is still operational
      const healthResponse = await request(app)
        .get('/api/health')
        .set('Accept', 'application/json');

      expect(healthResponse.status).toBe(200);
      expect(healthResponse.body.status).toBe('healthy');
    });
  });

  describe('Data Retention Flow', () => {
    test('should handle data retention policies', async () => {
      // 1. Insert old reading
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31); // 31 days old
      
      await connection.query(
        'INSERT INTO SensorReadings (sensorId, temperature, humidity, timestamp) VALUES (?, ?, ?, ?)',
        [1, 22.5, 45, oldDate]
      );

      // 2. Trigger cleanup
      await connection.query('CALL cleanup_old_readings()');

      // 3. Verify old reading was deleted
      const [rows] = await connection.query(
        'SELECT * FROM SensorReadings WHERE timestamp < DATE_SUB(NOW(), INTERVAL 30 DAY)'
      );

      expect(rows.length).toBe(0);
    });
  });

  describe('Sensor Configuration Flow', () => {
    test('should handle sensor configuration updates', async () => {
      // 1. Update sensor configuration
      const updateResponse = await request(app)
        .put('/api/sensors/1')
        .send({
          name: 'Updated Sensor',
          location: 'New Location',
          minTemp: 19,
          maxTemp: 24
        })
        .set('Accept', 'application/json');

      expect(updateResponse.status).toBe(200);

      // 2. Verify configuration was updated
      const [sensor] = await connection.query(
        'SELECT * FROM Sensors WHERE id = ?',
        [1]
      );

      expect(sensor[0].name).toBe('Updated Sensor');
      expect(sensor[0].minTemp).toBe(19);
      expect(sensor[0].maxTemp).toBe(24);

      // 3. Verify new readings respect new limits
      const readingResponse = await request(app)
        .post('/api/readings')
        .send({
          sensorId: 1,
          temperature: 25, // Above maxTemp
          humidity: 45,
          timestamp: new Date().toISOString()
        })
        .set('Accept', 'application/json');

      expect(readingResponse.status).toBe(400);
      expect(readingResponse.body.error).toContain('temperature range');
    });
  });
}); 