const request = require('supertest');
const app = require('../index');
const path = require('path');
const fs = require('fs');


describe('Admin API', () => {

  // Before each test, reset the database to a known state.
  // This ensures tests are isolated and repeatable.
  beforeEach(async () => {
    await request(app).post('/api/admin/resetpoints').expect(200);
  });

  // --- GET /api/admin/healthcheck ---
  describe('GET /api/admin/healthcheck', () => {
    it('should return healthcheck information with status 200', async () => {
      const res = await request(app)
        .get('/api/admin/healthcheck')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body.status).toBe('OK');
      expect(res.body).toHaveProperty('dbconnection');
      expect(res.body).toHaveProperty('n_charge_points');
      expect(res.body).toHaveProperty('n_charge_points_online');
      expect(res.body).toHaveProperty('n_charge_points_offline');
    });
  });

  // --- POST /api/admin/resetpoints ---
  describe('POST /api/admin/resetpoints', () => {
    it('should reset the database and return a success message', async () => {
      const res = await request(app)
        .post('/api/admin/resetpoints')
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(res.body.status).toBe('OK');
      expect(res.body.message).toBe('Data reset to initial state successfully.');
    });
  });

  // --- POST /api/admin/addpoints ---
  describe('POST /api/admin/addpoints', () => {
    it('should add points from a valid CSV file', async () => {
      const csvData = 'id,name,address,latitude,longitude,outlet_id\n1,Test Station,123 Main,10,20,101';
      const res = await request(app)
        .post('/api/admin/addpoints')
        .attach('file', Buffer.from(csvData), {
          filename: 'points.csv',
          contentType: 'text/csv'
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body.status).toBe('OK');
      expect(res.body.message).toContain('Successfully imported');
    });

    it('should return 400 if no file is uploaded', async () => {
      const res = await request(app)
        .post('/api/admin/addpoints')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(res.body.error).toBe('No file uploaded');
    });

    it('should return 400 if the file type is not CSV', async () => {
      const res = await request(app)
        .post('/api/admin/addpoints')
        .attach('file', Buffer.from('this is not a csv'), {
          filename: 'points.txt',
          contentType: 'text/plain'
        })
        .expect('Content-Type', /json/)
        .expect(400);
      
      expect(res.body.error).toBe("Invalid file type. Only 'text/csv' is supported.");
    });
  });


});
