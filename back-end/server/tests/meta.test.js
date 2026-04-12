const request = require('supertest');
const app = require('../index');

describe('Meta API', () => {
  describe('GET /api/meta/filters', () => {
    it('should return available filter options with status 200', async () => {
      const res = await request(app)
        .get('/api/meta/filters')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body).toHaveProperty('connectors');
      expect(res.body).toHaveProperty('powers');
      expect(res.body).toHaveProperty('facilities');
      expect(res.body).toHaveProperty('score');
    });
  });
});
