const request = require('supertest');
const app = require('../index');
const User = require('../models/userModel'); // Import User model for cleanup

describe('Auth API', () => {
  let testUserId; // Variable to hold the created user's ID for cleanup

  // Use a unique username and email for each test run to avoid conflicts.
  const uniqueId = new Date().getTime();
  const testUser = {
    username: `auth_test_user_${uniqueId}`,
    email: `testuser_${uniqueId}@example.com`,
    password: 'StrongPassword123'
  };

  // After all tests are done, delete the created user
  afterAll(async () => {
    if (testUserId) {
      try {
        await User.delete(testUserId);
      } catch (error) {
        console.error(`Error during auth test cleanup for ID ${testUserId}:`, error);
      }
    }
  });

  describe('POST /api/auth/signup', () => {
    it('should register a new user and return a token', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send(testUser)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.username).toBe(testUser.username);
      expect(res.body.user.email).toBe(testUser.email);
      
      // Store the user ID for cleanup
      testUserId = res.body.user.user_id;
    });

    it('should fail to register a user with an existing email', async () => {
      // Attempt to register the same user again
      const res = await request(app)
        .post('/api/auth/signup')
        .send(testUser)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(res.body.error).toBe('User already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should log in an existing user and return a token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: testUser.email, // Log in with the email of the user we created
          password: testUser.password
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe(testUser.email);
    });

    it('should fail to log in with incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: testUser.email,
          password: 'WrongPassword'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(res.body.error).toBe('Invalid credentials');
    });

    it('should fail to log in with a non-existent user', async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({
            identifier: 'nonexistent@user.com',
            password: 'anypassword'
          })
          .expect('Content-Type', /json/)
          .expect(400);
  
        expect(res.body.error).toBe('Invalid credentials');
      });
  });

});
