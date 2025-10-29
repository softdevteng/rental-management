const request = require('supertest');
const { createApp, createServer } = require('../app');
const { connectAndSync, models, sequelize } = require('../db');

jest.setTimeout(20000);

describe('tickets publish', () => {
  let server; let app; let httpServer;
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.USE_SQLITE_IN_MEMORY = 'true';
    jest.spyOn(require('../utils/stream'), 'publish').mockImplementation(async (event, data) => {
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

  test('create ticket triggers publish', async () => {
    const User = models.User;
    const Tenant = models.Tenant;
    const u = await User.create({ email: 't2@t.com', password: 'x', role: 'tenant' });
  const t = await Tenant.create({ name: 'T2', UserId: u.id });
  // link user.refId to the tenant so auth middleware can populate req.user.refId
  u.refId = t.id;
  await u.save();
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: u.id }, process.env.JWT_SECRET || 'secretkey');
    const res = await request(server).post('/api/tickets').set('Authorization', `Bearer ${token}`).send({ description: 'leak' });
    expect(res.status).toBe(201);
    expect(global.__last_publish).toBeDefined();
    expect(global.__last_publish.event).toBe('ticket:create');
    expect(global.__last_publish.data && global.__last_publish.data.tenantId).toBe(t.id);
  });
});
