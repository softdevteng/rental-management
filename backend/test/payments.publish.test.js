const request = require('supertest');
const { createApp, createServer } = require('../app');
const { connectAndSync, models, sequelize } = require('../db');

jest.setTimeout(20000);

describe('payments publish', () => {
  let server; let app; let httpServer;
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.USE_SQLITE_IN_MEMORY = 'true';
    // mock publish to observe calls
    jest.spyOn(require('../utils/stream'), 'publish').mockImplementation(async (event, data) => {
      // record to global
      global.__last_publish = { event, data };
    });
    await connectAndSync();
    app = createApp();
    const created = createServer(app);
    httpServer = created.server;
    server = httpServer.listen(0);
  });
  afterAll(async () => {
    try { await server.close(); } catch {};
    try { await sequelize.close(); } catch {};
  });

  test('payment update triggers publish', async () => {
    // create a user, tenant, and payment
    const User = models.User;
    const Tenant = models.Tenant;
    const Payment = models.Payment;
    const u = await User.create({ email: 't@t.com', password: 'x', role: 'tenant' });
    const t = await Tenant.create({ name: 'T', UserId: u.id });
    const p = await Payment.create({ tenantId: t.id, apartmentId: null, amount: 100, status: 'pending' });
    // create JWT for user
  const jwt = require('jsonwebtoken');
  // create a landlord user to perform the update (route restricted to landlord/caretaker)
  const landlordUser = await User.create({ email: 'landlord@t.com', password: 'x', role: 'landlord' });
  const token = jwt.sign({ id: landlordUser.id }, process.env.JWT_SECRET || 'secretkey');
  // call put to update payment to paid as landlord
  const res = await request(server).put(`/api/payments/${p.id}`).set('Authorization', `Bearer ${token}`).send({ status: 'paid' });
    expect(res.status).toBe(200);
    // ensure publish called
    expect(global.__last_publish).toBeDefined();
    expect(global.__last_publish.event).toBe('payment:update');
    expect(global.__last_publish.data && global.__last_publish.data.id).toBe(p.id);
  });
});
