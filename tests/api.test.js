const request = require('supertest');
const app = require('../server');

describe('API Endpoints', () => {
  describe('GET /api/sensors', () => {
    test('should return list of sensors', async () => {
      const response = await request(app)
        .get('/api/sensors')
        .set('Accept', 'application/json');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should handle database errors', async () => {
      // Mock database error
      jest.spyOn(app.locals.pool, 'query').mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/sensors')
        .set('Accept', 'application/json');

      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/readings', () => {
    test('should accept valid sensor reading', async () => {
      const reading = {
        sensorId: 1,
        temperature: 22.5,
        humidity: 45,
        timestamp: new Date().toISOString()
      };

      const response = await request(app)
        .post('/api/readings')
        .send(reading)
        .set('Accept', 'application/json');

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
    });

    test('should validate reading data', async () => {
      const invalidReading = {
        sensorId: 'invalid',
        temperature: 'not a number',
        humidity: 45
      };

      const response = await request(app)
        .post('/api/readings')
        .send(invalidReading)
        .set('Accept', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/readings/:sensorId', () => {
    test('should return sensor readings', async () => {
      const response = await request(app)
        .get('/api/readings/1')
        .set('Accept', 'application/json');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should handle invalid sensor ID', async () => {
      const response = await request(app)
        .get('/api/readings/invalid')
        .set('Accept', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('PUT /api/sensors/:id', () => {
    test('should update sensor settings', async () => {
      const update = {
        name: 'Updated Sensor',
        location: 'New Location',
        minTemp: 18,
        maxTemp: 25
      };

      const response = await request(app)
        .put('/api/sensors/1')
        .send(update)
        .set('Accept', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should validate temperature range', async () => {
      const invalidUpdate = {
        minTemp: 25,
        maxTemp: 20
      };

      const response = await request(app)
        .put('/api/sensors/1')
        .send(invalidUpdate)
        .set('Accept', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });
}); 