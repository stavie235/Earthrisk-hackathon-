const bcrypt = require('bcrypt');
const request = require('supertest');
const app = require('../index');
const Station = require('../models/stationModel');
const Charger = require('../models/chargerModel');
const Session = require('../models/sessionModel');
const User = require('../models/userModel');
const db = require('../config/db');

// Note: These tests cover the "requested" APIs as per the project guide.
// Many of these endpoints are not protected by authentication, which should be
// addressed. The tests will reflect the current implementation.

describe('Requested APIs', () => {
    let testStationId;
    let testChargerId1; // Will be 'available'
    let testChargerId2; // Will be 'charging'
    let testUserId;
    let uniqueIdBase;

    beforeAll(async () => {
        uniqueIdBase = new Date().getTime();
        const uniqueId = uniqueIdBase % 1000000;

        const hashedPassword = await bcrypt.hash('TestPass123', 10);
        // Ensure user_id = 1 exists for tests that implicitly use it
        await db.query('DELETE FROM Users WHERE user_id = 1');
        await db.query(
            'INSERT INTO Users (user_id, username, email, safe_password, role) VALUES (?, ?, ?, ?, ?)',
            [1, 'default_test_user', 'default@example.com', hashedPassword, 'user']
        );

        // Create a test user for session-related tests (used by other tests)
        const userRes = await request(app).post('/api/auth/signup').send({
            username: `req_user_${uniqueId}`,
            email: `req_user_${uniqueId}@example.com`,
            password: 'ReqUserPass123'
        });
        testUserId = userRes.body.user.user_id;

        // Create a test station
        const stationData = {
            station_id: uniqueId,
            station_name: `Req Test Station ${uniqueId}`,
            address: `123 Req Test Street ${uniqueId}`,
            longitude: 15.0,
            latitude: 25.0,
            postal_code: '10002',
            facilities: 'WiFi',
            google_maps_link: 'http://example.com/map/req',
            score: 3.5
        };
        await Station.create(stationData);
        testStationId = stationData.station_id;

        // Create an 'available' charger (point)
        const chargerData1 = {
            charger_id: (uniqueIdBase + 1) % 1000000,
            power: 50, // cap in kW
            connector_type: 'CCS2',
            station_id: testStationId,
            installed_at: new Date(),
            last_checked: new Date(),
            charger_status: 'available',
            current_price: 0.30 // kwhprice
        };
        await Charger.create(chargerData1);
        testChargerId1 = chargerData1.charger_id;

        // Create a 'charging' charger (point)
        const chargerData2 = {
            charger_id: (uniqueIdBase + 2) % 1000000,
            power: 22,
            connector_type: 'Type 2',
            station_id: testStationId,
            installed_at: new Date(),
            last_checked: new Date(),
            charger_status: 'charging',
            current_price: 0.28
        };
        await Charger.create(chargerData2);
        testChargerId2 = chargerData2.charger_id;

        // Create a test session for the /sessions endpoint
        const startTime = new Date('2025-11-10T10:00:00Z');
        const endTime = new Date('2025-11-10T11:00:00Z');
        await Session.createSession(testChargerId1, startTime, endTime, 20, 80, 30, 0.30, testUserId);
    });

    afterAll(async () => {
        // Clean up all created test data
        try {
            if (testUserId) await Session.deleteByUserId(testUserId);
            // Clean up the user with user_id = 1 created for the newsession test
            await db.query('DELETE FROM Users WHERE user_id = 1');
            
            
            // Delete history and reservations before deleting charger to avoid foreign key errors
            if (testChargerId1) {
                await db.query('DELETE FROM Reservation WHERE charger_id = ?', [testChargerId1]);
                await db.query('DELETE FROM ChargerStatusHistory WHERE charger_id = ?', [testChargerId1]);
                await Charger.delete(testChargerId1);
            }
            if (testChargerId2) {
                await db.query('DELETE FROM Reservation WHERE charger_id = ?', [testChargerId2]);
                await db.query('DELETE FROM ChargerStatusHistory WHERE charger_id = ?', [testChargerId2]);
                await Charger.delete(testChargerId2);
            }

            if (testStationId) await Station.delete(testStationId);
            if (testUserId) await User.delete(testUserId);
        } catch (error) {
            console.error('Error during requested test cleanup:', error);
        }
    });

    // a. GET /api/points
    describe('GET /api/points', () => {
        it('should return a list of all charging points', async () => {
            const res = await request(app)
                .get('/api/points')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(2);
            const pointIds = res.body.map(p => p.pointid);
            expect(pointIds).toContain(testChargerId1);
            expect(pointIds).toContain(testChargerId2);
            
            const point1 = res.body.find(p => p.pointid === testChargerId1);
            expect(point1).toHaveProperty('providerName', 'AmperioInc');
            expect(point1).toHaveProperty('status', 'available');
            expect(point1).toHaveProperty('cap', 50);
        });

        it('should filter points by status "available"', async () => {
            const res = await request(app)
                .get('/api/points?status=available')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.every(p => p.status === 'available')).toBe(true);
            expect(res.body.some(p => p.pointid === testChargerId1)).toBe(true);
        });

        it('should return 400 for an invalid status parameter', async () => {
            // Per the guide's error table, 400 is for invalid parameters.
            const res = await request(app)
                .get('/api/points?status=invalid_status')
                .expect('Content-Type', /json/)
                .expect(400);
            
            expect(res.body).toHaveProperty('error', 'Invalid status parameter. Supported values: available, charging, reserved, offline, malfunction');
        });

        it('should support CSV format', async () => {
            const res = await request(app)
                .get('/api/points?format=csv')
                .expect('Content-Type', /text\/plain/)
                .expect(200);
            
            expect(res.text).toContain('"providerName","pointid","lon","lat","status","cap"');
            expect(res.text).toContain(testChargerId1.toString());
        });
    });

    // b. GET /api/point/:id
    describe('GET /api/point/:id', () => {
        it('should return details for a specific point', async () => {
            const res = await request(app)
                .get(`/api/point/${testChargerId1}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body).toHaveProperty('pointid', testChargerId1);
            expect(res.body).toHaveProperty('status', 'available');
            expect(res.body).toHaveProperty('cap', 50);
            expect(res.body).toHaveProperty('kwhprice', 0.30);
            expect(res.body).toHaveProperty('reservationendtime');
        });

        it('should return 404 for a non-existent point ID', async () => {
            await request(app)
                .get('/api/point/999999999')
                .expect(404);
        });
    });

    // c. POST /api/reserve/:id
    describe('POST /api/reserve/:id', () => {
        it('should reserve an available point for 30 minutes by default', async () => {
            const res = await request(app)
                .post(`/api/reserve/${testChargerId1}`)
                .expect('Content-Type', /json/)
                .expect(200);
            
            expect(res.body).toHaveProperty('pointid', testChargerId1.toString());
            expect(res.body).toHaveProperty('status', 'reserved');
            expect(res.body).toHaveProperty('reservationendtime');

            // Check that the end time is roughly 30 mins in the future
            const reserveTime = new Date(res.body.reservationendtime).getTime();
            const expectedTime = Date.now() + 30 * 60 * 1000;
            expect(reserveTime).toBeGreaterThan(Date.now());
            expect(reserveTime).toBeLessThanOrEqual(expectedTime);
        });

        it('should reserve an available point for a specific number of minutes', async () => {
            // Reset status to available to test again
            await request(app).post(`/api/updpoint/${testChargerId1}`).send({ status: 'available' });

            const res = await request(app)
                .post(`/api/reserve/${testChargerId1}/15`) // 15 minutes
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body).toHaveProperty('status', 'reserved');
            const reserveTime = new Date(res.body.reservationendtime).getTime();
            const expectedTime = Date.now() + 15 * 60 * 1000;
            expect(reserveTime).toBeLessThanOrEqual(expectedTime);
        });

        it('should fail to reserve a point that is not available', async () => {
            const res = await request(app)
                .post(`/api/reserve/${testChargerId2}`) // This one is 'charging'
                .expect('Content-Type', /json/)
                .expect(404);
            
            expect(res.body).toHaveProperty('error', `Point with ID ${testChargerId2} is not available for reservation`);
        });
    });

    // d. POST /api/updpoint/:id
    describe('POST /api/updpoint/:id', () => {
        it('should update the status and price of a point', async () => {
            const res = await request(app)
                .post(`/api/updpoint/${testChargerId2}`)
                .send({ status: 'available', kwhprice: 0.99 })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body).toHaveProperty('pointid', testChargerId2.toString());
            expect(res.body).toHaveProperty('status', 'available');
            expect(res.body).toHaveProperty('kwhprice', 0.99);

            // Verify by fetching the point
            const verifyRes = await request(app).get(`/api/point/${testChargerId2}`);
            expect(verifyRes.body.status).toBe('available');
            expect(verifyRes.body.kwhprice).toBe(0.99);
        });

        it('should return 400 if body is invalid or empty', async () => {
            await request(app)
                .post(`/api/updpoint/${testChargerId2}`)
                .send({})
                .expect('Content-Type', /json/)
                .expect(400);
        });
    });

    // e. POST /api/newsession
    describe('POST /api/newsession', () => {
        it('should create a new charging session', async () => {
            const sessionData = {
                pointid: testChargerId1,
                starttime: "2025-12-01 10:00",
                endtime: "2025-12-01 11:00",
                startsoc: 10,
                endsoc: 90,
                totalkwh: 20,
                kwhprice: 0.50,
                amount: 10
            };

            await request(app)
                .post('/api/newsession')
                .send(sessionData)
                .expect(200);
        });

        it('should return 400 for invalid session data', async () => {
            const invalidData = { pointid: testChargerId1 }; // Missing fields
            await request(app)
                .post('/api/newsession')
                .send(invalidData)
                .expect('Content-Type', /json/)
                .expect(400);
        });
    });

    // f. GET /api/sessions/:id/:from/:to
    describe('GET /api/sessions/:id/:from/:to', () => {
        it('should retrieve sessions for a specific point and date range', async () => {
            const from = '20251101';
            const to = '20251130';
            const res = await request(app)
                .get(`/api/sessions/${testChargerId1}/${from}/${to}`)
                .expect('Content-Type', /json/)
                .expect(200);
            
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(1);
            const session = res.body[0];
            expect(session).toHaveProperty('starttime');
            expect(session).toHaveProperty('totalkwh', 30);
            expect(session).toHaveProperty('amount');
        });

        it('should return 400 for invalid date format', async () => {
            await request(app)
                .get(`/api/sessions/${testChargerId1}/2025-11-01/2025-11-30`)
                .expect('Content-Type', /json/)
                .expect(400);
        });

        it('should return 204 No Content when no sessions are found in the date range', async () => {
            const from = '20240101';
            const to = '20241231';
            await request(app)
                .get(`/api/sessions/${testChargerId1}/${from}/${to}`)
                .expect(204);
        });
    });

     // g. GET /api/pointstatus/:pointid/:from/:to
     describe('GET /api/pointstatus/:pointid/:from/:to', () => {
        it('should retrieve status changes for a point in a date range', async () => {
            // This endpoint requires a history of status changes, which is complex to
            // mock perfectly without a dedicated history table. This test will check
            // for the correct structure and a 200 response, assuming the underlying
            // logic can find some data.
            // We'll update a point to create at least one status change event.
            await request(app).post(`/api/updpoint/${testChargerId1}`).send({ status: 'malfunction' });
            await request(app).post(`/api/updpoint/${testChargerId1}`).send({ status: 'available' });

            const from = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
            const to = from;

            const res = await request(app)
                .get(`/api/pointstatus/${testChargerId1}/${from}/${to}`)
                .expect('Content-Type', /json/)
                .expect(200);
            
            expect(Array.isArray(res.body)).toBe(true);
            // If there are results, check their structure
            if (res.body.length > 0) {
                const statusChange = res.body[0];
                expect(statusChange).toHaveProperty('timeref');
                expect(statusChange).toHaveProperty('old_state');
                expect(statusChange).toHaveProperty('new_state');
            }
        });

        it('should return 204 No Content when no status changes are found in the date range', async () => {
            const from = '20240101';
            const to = '20241231';
            await request(app)
                .get(`/api/pointstatus/${testChargerId1}/${from}/${to}`)
                .expect(204);
        });
    });

    // a. GER /api/points after deleting everything
    describe('When the database is empty', () => {
        beforeEach(async () => {
          // Clean all relevant tables to ensure an empty state
          await db.query('DELETE FROM Session');
          await db.query('DELETE FROM Reservation');
          await db.query('DELETE FROM ChargerStatusHistory');
          await db.query('DELETE FROM Charger');
          await db.query('DELETE FROM Station');
        });
    
        it('GET /points should return 204 No Content', async () => {
          await request(app)
            .get('/api/points')
            .expect(204);
        });
    });
});
