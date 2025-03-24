const mysql = require('mysql2');
const { pool } = require('../server');

describe('Database Operations', () => {
  let connection;

  beforeAll(async () => {
    connection = await pool.getConnection();
  });

  afterAll(async () => {
    await connection.release();
    await pool.end();
  });

  beforeEach(async () => {
    await connection.query('START TRANSACTION');
  });

  afterEach(async () => {
    await connection.query('ROLLBACK');
  });

  test('should insert sensor reading', async () => {
    const reading = {
      sensorId: 1,
      temperature: 22.5,
      humidity: 45,
      timestamp: new Date()
    };

    const [result] = await connection.query(
      'INSERT INTO SensorReadings (sensorId, temperature, humidity, timestamp) VALUES (?, ?, ?, ?)',
      [reading.sensorId, reading.temperature, reading.humidity, reading.timestamp]
    );

    expect(result.affectedRows).toBe(1);
    expect(result.insertId).toBeDefined();
  });

  test('should retrieve sensor readings', async () => {
    const [rows] = await connection.query(
      'SELECT * FROM SensorReadings WHERE sensorId = ? ORDER BY timestamp DESC LIMIT 10',
      [1]
    );

    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeLessThanOrEqual(10);
  });

  test('should update sensor status', async () => {
    const [result] = await connection.query(
      'UPDATE Sensors SET status = ? WHERE id = ?',
      ['ACTIVE', 1]
    );

    expect(result.affectedRows).toBe(1);
  });

  test('should handle invalid sensor data', async () => {
    await expect(connection.query(
      'INSERT INTO SensorReadings (sensorId, temperature, humidity, timestamp) VALUES (?, ?, ?, ?)',
      [1, 'invalid', 45, new Date()]
    )).rejects.toThrow();
  });

  test('should clean up old readings', async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [result] = await connection.query(
      'DELETE FROM SensorReadings WHERE timestamp < ?',
      [thirtyDaysAgo]
    );

    expect(result.affectedRows).toBeDefined();
  });
}); 