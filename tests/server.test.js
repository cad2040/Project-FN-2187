const request = require('supertest');
const app = require('../server');

describe('Server Setup', () => {
  test('should have CORS enabled', async () => {
    const response = await request(app)
      .get('/')
      .set('Origin', 'http://localhost:3000');
    
    expect(response.headers['access-control-allow-origin']).toBe('*');
  });

  test('should have compression enabled', async () => {
    const response = await request(app)
      .get('/')
      .set('Accept-Encoding', 'gzip');
    
    expect(response.headers['content-encoding']).toBe('gzip');
  });

  test('should have rate limiting enabled', async () => {
    const requests = Array(100).fill().map(() => 
      request(app).get('/')
    );
    
    const responses = await Promise.all(requests);
    const tooManyRequests = responses.filter(r => r.status === 429);
    
    expect(tooManyRequests.length).toBeGreaterThan(0);
  });

  test('should have security headers enabled', async () => {
    const response = await request(app).get('/');
    
    expect(response.headers['x-frame-options']).toBeDefined();
    expect(response.headers['x-content-type-options']).toBeDefined();
    expect(response.headers['x-xss-protection']).toBeDefined();
  });
}); 