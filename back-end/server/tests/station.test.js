const request = require('supertest');
const app = require('../index');
const Station = require('../models/stationModel');
const Charger = require('../models/chargerModel');

describe('Station API', () => {
  let testStationId;
  let testChargerId1;
  let testChargerId2;
  let uniqueIdBase;

  beforeAll(async () => {
    uniqueIdBase = new Date().getTime();
    const uniqueId = uniqueIdBase % 1000000;

    // Create a test station
    const stationData = {
      station_id: uniqueId,
      station_name: `Test Station ${uniqueId}`,
      address: `123 Test Street ${uniqueId}`,
      longitude: 10.0,
      latitude: 20.0,
      postal_code: '10001',
      facilities: 'Restaurant, WiFi',
      google_maps_link: 'http://example.com/map',
      score: 4.0
    };
    await Station.create(stationData);
    testStationId = stationData.station_id;

    // Create a first test charger for the station
    const chargerData1 = {
      charger_id: (uniqueIdBase + 1) % 1000000,
      power: 50,
      connector_type: 'CCS2',
      station_id: testStationId,
      installed_at: new Date(),
      last_checked: new Date(),
      charger_status: 'available',
      current_price: 0.25
    };
    await Charger.create(chargerData1);
    testChargerId1 = chargerData1.charger_id;

    // Create a second test charger for the station
    const chargerData2 = {
      charger_id: (uniqueIdBase + 2) % 1000000,
      power: 22,
      connector_type: 'Type 2',
      station_id: testStationId,
      installed_at: new Date(),
      last_checked: new Date(),
      charger_status: 'charging',
      current_price: 0.20
    };
    await Charger.create(chargerData2);
    testChargerId2 = chargerData2.charger_id;
  });

  afterAll(async () => {
    // Clean up created chargers and station
    try {
      if (testChargerId1) await Charger.delete(testChargerId1);
      if (testChargerId2) await Charger.delete(testChargerId2);
      if (testStationId) await Station.delete(testStationId);
    } catch (error) {
      console.error('Error during station test cleanup:', error);
    }
  });

  // --- GET /api/station/ ---
  describe('GET /api/station/', () => {
    it('should return all stations', async () => {
      const res = await request(app)
        .get('/api/station/')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body.some(s => s.station_id === testStationId)).toBe(true);
    });
  });

  // --- GET /api/station/:id ---
  describe('GET /api/station/:id', () => {
    it('should return a specific station by ID', async () => {
      const res = await request(app)
        .get(`/api/station/${testStationId}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body).toHaveProperty('station_id', testStationId);
      expect(res.body).toHaveProperty('station_name', `Test Station ${uniqueIdBase % 1000000}`);
      expect(res.body).toHaveProperty('chargers');
      expect(Array.isArray(res.body.chargers)).toBe(true);
      expect(res.body.chargers.length).toBe(2);
      expect(res.body.chargers.some(c => c.charger_id === testChargerId1)).toBe(true);
    });

    it('should return 404 Not Found for a non-existent station ID', async () => {
      await request(app)
        .get('/api/station/999999999') // Assuming this ID won't exist
        .expect(404);
    });
  });

  // --- GET /api/station/search ---
  describe('GET /api/station/search', () => {
    it('should search stations by query (q)', async () => {
      const res = await request(app)
        .get(`/api/station/search?q=${encodeURIComponent(uniqueIdBase % 1000000)}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body.some(s => s.station_id === testStationId)).toBe(true);
    });

    it('should filter stations by power', async () => {
      const res = await request(app)
        .get('/api/station/search?power=50')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some(s => s.station_id === testStationId)).toBe(true);
      // More specific checks could be added to ensure only power=50 are returned
    });

    it('should filter stations by connector type', async () => {
      const res = await request(app)
        .get('/api/station/search?connector=CCS2')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some(s => s.station_id === testStationId)).toBe(true);
    });

    it('should filter stations by availability', async () => {
      const res = await request(app)
        .get('/api/station/search?available=true')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some(s => s.station_id === testStationId)).toBe(true);
    });

    it('should filter stations by facilities', async () => {
      const res = await request(app)
        .get('/api/station/search?facilities=Restaurant')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some(s => s.station_id === testStationId)).toBe(true);
    });

    it('should filter stations by score', async () => {
      const res = await request(app)
        .get('/api/station/search?score=4')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some(s => s.station_id === testStationId)).toBe(true);
    });

    it('should filter stations by a combination of filters (power, connector, available)', async () => {
      const res = await request(app)
        .get('/api/station/search?power=50&connector=CCS2&available=true')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some(s => s.station_id === testStationId)).toBe(true);
      // Further assertions can be added to ensure only matching chargers contributed to availability
    });
  });
});
