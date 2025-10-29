const request = require('supertest');
const { createApp } = require('../app');
const { connectAndSync, sequelize, models } = require('../db');

let app, server;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.USE_SQLITE_IN_MEMORY = 'true';
  app = createApp();
  await connectAndSync();
  server = app.listen(0);
});

afterAll(async () => {
  try { await sequelize.close(); } catch (e) {}
  try { server && server.close(); } catch (e) {}
});

test('MPESA initiate -> create payment -> status flow (mock)', async () => {
  // create tenant and user to simulate auth
  const tenant = await models.Tenant.create({ name: 'Test Tenant', email: 't@test.com' });
  const user = await models.User.create({ email: 'u@test.com', password: 'pass', role: 'tenant', refId: tenant.id });
  // generate a JWT for this user (use same secret as app)
  const jwt = require('jsonwebtoken');
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secretkey');

  // Initiate
  const initRes = await request(app)
    .post('/api/payments/mpesa/initiate')
    .set('Authorization', `Bearer ${token}`)
    .send({ amount: 1000, phone: '0712345678' })
    .expect(201);
  expect(initRes.body.paymentId).toBeDefined();
  const paymentId = initRes.body.paymentId;

  // Since our MPESA util returns mock when no credentials, we can complete via mock endpoint
  const completeRes = await request(app)
    .post('/api/payments/mpesa/complete')
    .set('Authorization', `Bearer ${token}`)
    .send({ paymentId, success: true })
    .expect(200);
  expect(completeRes.body.status).toBe('paid');

  // Check status endpoint
  const statusRes = await request(app)
    .get(`/api/payments/${paymentId}/status`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  expect(statusRes.body.status).toBe('paid');
});
