const request = require('supertest');
const app = require('../index');
const User = require('../models/userModel');
const Station = require('../models/stationModel');
const Charger = require('../models/chargerModel');
const Reservations = require('../models/reservationsModel');

describe('Reservations API', () => {
  let authToken;
  let testUserId;
  let testStationId;
  let testChargerId;
  let testReservationId;

  // This runs once before all tests in this describe block
  beforeAll(async () => {
    // 1. Create a test user and log in to get a token
    const baseUniqueId = new Date().getTime();
    // Generate smaller, unique IDs for station/charger
    const stationChargerUniqueId = baseUniqueId % 1000000; 

    const testUserCredentials = {
      username: `rsv_user_${baseUniqueId}`,
      email: `rsv_user_${baseUniqueId}@example.com`,
      password: 'RsvTestPassword123'
    };

    const userRes = await request(app).post('/api/auth/signup').send(testUserCredentials).expect(201);
    testUserId = userRes.body.user.user_id;

    const loginRes = await request(app).post('/api/auth/login').send({
      identifier: testUserCredentials.email,
      password: testUserCredentials.password
    }).expect(200);

    authToken = loginRes.body.token;

    // 2. Create a test station
    const stationData = {
      station_id: stationChargerUniqueId, // Now a smaller number
      station_name: `Test Station ${baseUniqueId}`,
      address: `123 Test St`,
      longitude: 0,
      latitude: 0,
      postal_code: '12345',
      facilities: 'Restaurant',
      google_maps_link: 'http://maps.google.com',
      score: 4.5
    };
    await Station.create(stationData);
    testStationId = stationData.station_id;

    // 3. Create a test charger at that station
    const chargerData = {
      charger_id: stationChargerUniqueId, // Now a number
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

    // 4. Create an upcoming reservation for the test user
    const startTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    const endTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now

    const reservationResult = await Reservations.create(testUserId, testChargerId, startTime, endTime);
    testReservationId = reservationResult.insertId;

    expect(authToken).toBeDefined();
    expect(testUserId).toBeDefined();
    expect(testStationId).toBeDefined();
    expect(testChargerId).toBeDefined();
    expect(testReservationId).toBeDefined();
  });

  // This runs once after all tests in this describe block
  afterAll(async () => {
    // 5. Clean up all created test data in reverse order of creation
    try {
      if (testReservationId) await Reservations.delete(testReservationId);
      if (testChargerId) await Charger.delete(testChargerId);
      if (testStationId) await Station.delete(testStationId);
      if (testUserId) await User.delete(testUserId);
    } catch (error) {
      console.error('Error during reservations test cleanup:', error);
    }
  });

  // --- GET /api/reservations/upcoming ---
  describe('GET /api/reservations/upcoming', () => {
    it('should return upcoming reservations for the authenticated user', async () => {
      const res = await request(app)
        .get('/api/reservations/upcoming')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      
      const reservation = res.body[0];
      expect(reservation).toHaveProperty('station_name');
      expect(reservation).toHaveProperty('address');
      expect(reservation).toHaveProperty('reservation_end_time');
    });

    it('should return 401 Forbidden if no token is provided', async () => {
      await request(app)
        .get('/api/reservations/upcoming')
        .expect(401);
    });
  });
});
