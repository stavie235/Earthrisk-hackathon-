const request = require('supertest');
const app = require('../index');
const User = require('../models/userModel');
const Station = require('../models/stationModel');
const Charger = require('../models/chargerModel');
const Session = require('../models/sessionModel');
const bcrypt = require('bcryptjs');

describe('Admin Stats API', () => {
  let adminToken;
  let userToken;
  let adminUserId;
  let regularUserId;
  let testStationId;
  let testChargerId;

  beforeAll(async () => {
    const baseUniqueId = new Date().getTime();
    
    // 1. Create Admin User
    const adminCredentials = {
      username: `admin_stats_${baseUniqueId}`,
      email: `admin_stats_${baseUniqueId}@example.com`,
      password: 'AdminPassword123'
    };
    const adminHashedPassword = await bcrypt.hash(adminCredentials.password, 10);
    const adminUserResult = await User.create(adminCredentials.username, adminCredentials.email, adminHashedPassword, 'admin');
    adminUserId = adminUserResult.insertId;

    // 2. Create Regular User
    const regularUserCredentials = {
      username: `reg_stats_${baseUniqueId}`,
      email: `reg_stats_${baseUniqueId}@example.com`,
      password: 'RegularPassword123'
    };
    const regularHashedPassword = await bcrypt.hash(regularUserCredentials.password, 10);
    const regularUserResult = await User.create(regularUserCredentials.username, regularUserCredentials.email, regularHashedPassword, 'user');
    regularUserId = regularUserResult.insertId;

    // 3. Log in both users
    const adminLoginRes = await request(app).post('/api/auth/login').send({ identifier: adminCredentials.email, password: adminCredentials.password });
    adminToken = adminLoginRes.body.token;

    const userLoginRes = await request(app).post('/api/auth/login').send({ identifier: regularUserCredentials.email, password: regularUserCredentials.password });
    userToken = userLoginRes.body.token;

    // 4. Create test data for stats
    const stationChargerUniqueId = baseUniqueId % 1000000;
    const stationData = {
      station_id: stationChargerUniqueId,
      station_name: 'Admin Stats Station',
      address: '123 Admin Way',
      longitude: 1,
      latitude: 1,
      postal_code: '54321',
      facilities: 'None',
      google_maps_link: 'http://example.com',
      score: 4.0
    };
    await Station.create(stationData);
    testStationId = stationData.station_id;

    const chargerData = {
      charger_id: stationChargerUniqueId,
      power: 50,
      connector_type: 'CCS2',
      station_id: testStationId,
      installed_at: new Date(),
      last_checked: new Date(),
      charger_status: 'available',
      current_price: 0.25
    };
    await Charger.create(chargerData);
    testChargerId = chargerData.charger_id;
    
    const startTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    const endTime = new Date(Date.now() - 1 * 60 * 60 * 1000);   // 1 hour ago
    await Session.createSession(testChargerId, startTime, endTime, 20, 80, 40, 0.25, regularUserId);
  });

  afterAll(async () => {
    // 5. Clean up all test data
    try {
      if (regularUserId) await Session.deleteByUserId(regularUserId);
      if (testChargerId) await Charger.delete(testChargerId);
      if (testStationId) await Station.delete(testStationId);
      if (adminUserId) await User.delete(adminUserId);
      if (regularUserId) await User.delete(regularUserId);
    } catch (error) {
      console.error('Error during admin stats test cleanup:', error);
    }
  });

  // --- GET /api/adminStats/charts ---
  describe('GET /api/adminStats/charts', () => {
    it('should return chart data for an admin user', async () => {
      const res = await request(app)
        .get('/api/adminStats/charts')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body.status).toBe('OK');
      expect(res.body.data).toBeDefined();
      expect(res.body.data).toHaveProperty('monthlyFinance');
      expect(res.body.data).toHaveProperty('stationRevenue');
      expect(res.body.data).toHaveProperty('energyHeatmap');
      expect(res.body.data).toHaveProperty('powerEfficiency');
      expect(res.body.data).toHaveProperty('chargerList');
      expect(res.body.data).toHaveProperty('userGrowth');
      expect(res.body.data).toHaveProperty('returningUsers');
    });

    it('should return 403 Bad Request for a regular user', async () => {
      const res = await request(app)
        .get('/api/adminStats/charts')
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(403);
      
      expect(res.body.error).toBe('User is not an admin');
    });

    it('should return 401 Forbidden if no token is provided', async () => {
      await request(app)
        .get('/api/adminStats/charts')
        .expect(401);
    });
  });
});
