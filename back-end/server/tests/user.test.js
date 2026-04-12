const request = require('supertest');
const app = require('../index');
const User = require('../models/userModel'); // Import the User model for cleanup

describe('User API', () => {
  let authToken;
  let testUserId;
  let testUserCredentials;

  // This will run once before all tests in this describe block
  beforeAll(async () => {
    // 1. Generate unique test user credentials
    const uniqueId = new Date().getTime();
    testUserCredentials = {
      username: `user_test_${uniqueId}`,
      email: `user_${uniqueId}@example.com`,
      password: 'UserTestPassword123'
    };

    // 2. Sign up the test user
    const userRes = await request(app)
      .post('/api/auth/signup')
      .send(testUserCredentials)
      .expect(201);
    testUserId = userRes.body.user.user_id;


    // 3. Log in the test user to get a token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: testUserCredentials.email,
        password: testUserCredentials.password
      })
      .expect(200);

    authToken = loginRes.body.token;

    expect(authToken).toBeDefined();
    expect(testUserId).toBeDefined();
  });

  // This will run once after all tests in this describe block
  afterAll(async () => {
    // 4. Delete the test user from the database for cleanup
    if (testUserId) {
      try {
        await User.delete(testUserId);
      } catch (error) {
        console.error(`Error during user cleanup for ID ${testUserId}:`, error);
      }
    }
  });

  // --- GET /api/users/profile ---
  describe('GET /api/users/profile', () => {
    it('should return the authenticated user\'s profile with status 200', async () => {
      const res = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body).toHaveProperty('user_id', testUserId);
      expect(res.body).toHaveProperty('username', testUserCredentials.username);
      expect(res.body).toHaveProperty('email', testUserCredentials.email);
      expect(res.body).toHaveProperty('role', 'user');
      // default_charger_power and default_connector_type can be null initially
      expect(res.body).toHaveProperty('default_charger_power');
      expect(res.body).toHaveProperty('default_connector_type');
    });

    it('should return 401 Forbidden if no token is provided', async () => {
      await request(app)
        .get('/api/users/profile')
        .expect(401);
    });
  });

  // --- GET /api/users/userdata ---
  describe('GET /api/users/userdata', () => {
    it('should return the authenticated user\'s data without default_charger_power', async () => {
      const res = await request(app)
        .get('/api/users/userdata')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body).toHaveProperty('user_id', testUserId);
      expect(res.body).toHaveProperty('username', testUserCredentials.username);
      expect(res.body).toHaveProperty('email', testUserCredentials.email);
      expect(res.body).toHaveProperty('role', 'user');
      expect(res.body).not.toHaveProperty('default_charger_power');
      expect(res.body).toHaveProperty('default_connector_type');
    });

    it('should return 401 Forbidden if no token is provided', async () => {
      await request(app)
        .get('/api/users/userdata')
        .expect(401);
    });
  });

  // --- PUT /api/users/profile ---
  describe('PUT /api/users/profile', () => {
    it('should update the authenticated user\'s username', async () => {
      const newUsername = `updated_user_${new Date().getTime()}`;
      const updatePayload = { username: newUsername };

      const res = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatePayload)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body.message).toBe('Profile updated successfully');

      // Verify the update by fetching the profile again
      const profileRes = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(profileRes.body.username).toBe(newUsername);
    });

    it('should update the authenticated user\'s email', async () => {
      const newEmail = `updated_${new Date().getTime()}@example.com`;
      const updatePayload = { email: newEmail };

      const res = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatePayload)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body.message).toBe('Profile updated successfully');

      // Verify the update
      const profileRes = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(profileRes.body.email).toBe(newEmail);

      // Update testUserCredentials for subsequent tests if email is used for login
      testUserCredentials.email = newEmail;
    });

    it('should update the authenticated user\'s password', async () => {
      const newPassword = 'NewStrongPassword123!';
      const updatePayload = { password: newPassword };

      const res = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatePayload)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body.message).toBe('Profile updated successfully');

      // Verify the password change by trying to log in with the new password
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: testUserCredentials.email, // Use updated email
          password: newPassword
        })
        .expect(200);

      expect(loginRes.body).toHaveProperty('token');
      expect(loginRes.body.user.user_id).toBe(testUserId);
      authToken = loginRes.body.token; // Update token as new login occurred
      testUserCredentials.password = newPassword; // Update for future tests
    });

    it('should update the authenticated user\'s charger preferences', async () => {
      const newChargerPower = 50;
      const newConnectorType = 'CCS2';
      const updatePayload = {
        default_charger_power: newChargerPower,
        default_connector_type: newConnectorType
      };

      const res = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatePayload)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body.message).toBe('Profile updated successfully');

      // Verify the update
      const profileRes = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(profileRes.body.default_charger_power).toBe(newChargerPower);
      expect(profileRes.body.default_connector_type).toBe(newConnectorType);
    });
    
    it('should handle null values for charger preferences', async () => {
      const updatePayload = {
        default_charger_power: null,
        default_connector_type: null
      };

      const res = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatePayload)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body.message).toBe('Profile updated successfully');

      // Verify the update
      const profileRes = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(profileRes.body.default_charger_power).toBeNull();
      expect(profileRes.body.default_connector_type).toBeNull();
    });

    it('should return 400 Bad Request if no changes are provided', async () => {
      const res = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({}) // Empty payload
        .expect('Content-Type', /json/)
        .expect(400);

      expect(res.body.error).toBe('No changes provided');
    });

    it('should return 401 Forbidden if no token is provided', async () => {
      await request(app)
        .put('/api/users/profile')
        .send({ username: 'unauthorized_user' })
        .expect(401);
    });
  });
});
