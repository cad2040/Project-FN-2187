const WebSocket = require('ws');
const { createServer } = require('http');
const app = require('../server');

describe('WebSocket Server', () => {
  let server;
  let ws;

  beforeAll((done) => {
    server = createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      ws = new WebSocket(`ws://localhost:${port}`);
      ws.on('open', done);
    });
  });

  afterAll(() => {
    ws.close();
    server.close();
  });

  test('should handle client connection', (done) => {
    ws.on('message', (data) => {
      const message = JSON.parse(data);
      expect(message.type).toBe('connection');
      done();
    });
  });

  test('should broadcast sensor updates to all clients', (done) => {
    const testData = {
      type: 'sensor_update',
      sensorId: 1,
      temperature: 22.5,
      humidity: 45
    };

    ws.on('message', (data) => {
      const message = JSON.parse(data);
      if (message.type === 'sensor_update') {
        expect(message).toEqual(testData);
        done();
      }
    });

    ws.send(JSON.stringify(testData));
  });

  test('should handle client disconnection', (done) => {
    ws.on('close', () => {
      expect(ws.readyState).toBe(WebSocket.CLOSED);
      done();
    });
  });

  test('should validate sensor data format', (done) => {
    const invalidData = {
      type: 'sensor_update',
      sensorId: 'invalid',
      temperature: 'not a number'
    };

    ws.on('message', (data) => {
      const message = JSON.parse(data);
      if (message.type === 'error') {
        expect(message.error).toBe('Invalid sensor data format');
        done();
      }
    });

    ws.send(JSON.stringify(invalidData));
  });
}); 