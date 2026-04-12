const request = require('supertest');
const app = require('../index');
const User = require('../models/userModel');
const Station = require('../models/stationModel');
const Charger = require('../models/chargerModel');
const Session = require('../models/sessionModel');

describe('User Stats API', () => {
  let authToken;
  let testUserId;
  let testStationId;
  let testChargerId;

  // This will run once before all tests in this describe block
  beforeAll(async () => {
    // 1. Create a test user, station, and charger
    const baseUniqueId = new Date().getTime();
    const stationChargerUniqueId = baseUniqueId % 1000000;
    
    const testUserCredentials = {
      username: `stats_user_${baseUniqueId}`,
      email: `stats_user_${baseUniqueId}@example.com`,
      password: 'StatsTestPassword123'
    };

    const userRes = await request(app).post('/api/auth/signup').send(testUserCredentials).expect(201);
    testUserId = userRes.body.user.user_id;

    const loginRes = await request(app).post('/api/auth/login').send({
      identifier: testUserCredentials.email,
      password: testUserCredentials.password
    }).expect(200);
    authToken = loginRes.body.token;

    const stationData = {
      station_id: stationChargerUniqueId,
      station_name: `Stats Test Station ${baseUniqueId}`,
      address: `123 Stats St`,
      longitude: 0,
      latitude: 0,
      postal_code: '12345',
      facilities: 'None',
      google_maps_link: 'http://maps.google.com',
      score: 3.0
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
    
    // 2. Create a test session for the user
    const startTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    const endTime = new Date(Date.now() - 1 * 60 * 60 * 1000);   // 1 hour ago
    await Session.createSession(testChargerId, startTime, endTime, 20, 80, 40, 0.25, testUserId);
  });

  // This runs once after all tests in this describe block
  afterAll(async () => {
    // 3. Clean up all created test data
    try {
      if (testUserId) {
        await Session.deleteByUserId(testUserId);
        await User.delete(testUserId);
      }
      if (testChargerId) await Charger.delete(testChargerId);
      if (testStationId) await Station.delete(testStationId);
    } catch (error) {
      console.error('Error during user stats test cleanup:', error);
    }
  });

  // --- GET /api/userStats/kpis ---
  describe('GET /api/userStats/kpis', () => {
    it('should return KPIs for the authenticated user', async () => {
      const res = await request(app)
        .get('/api/userStats/kpis')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body).toHaveProperty('totalSessions');
      expect(res.body).toHaveProperty('totalEnergy');
      expect(Number(res.body.totalSessions)).toBeGreaterThanOrEqual(1);
      expect(Number(res.body.totalEnergy)).toBeGreaterThanOrEqual(40); // Based on created session
    });

    it('should return 401 Forbidden if no token is provided', async () => {
      await request(app)
        .get('/api/userStats/kpis')
        .expect(401);
    });
  });

  // --- GET /api/userStats/charts ---
  describe('GET /api/userStats/charts', () => {
    it('should return chart data for the authenticated user', async () => {
      const res = await request(app)
        .get('/api/userStats/charts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      const sessionData = res.body[0];
      expect(sessionData).toHaveProperty('session_id');
      expect(sessionData).toHaveProperty('start_time');
      expect(sessionData).toHaveProperty('energy_delivered');
      expect(sessionData).toHaveProperty('price_per_kwh');
      expect(sessionData).toHaveProperty('station_name');
    });

    it('should return 401 Forbidden if no token is provided', async () => {
      await request(app)
        .get('/api/userStats/charts')
        .expect(401);
    });
  });
});
