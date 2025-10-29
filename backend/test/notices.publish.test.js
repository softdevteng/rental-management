const request = require('supertest');
const { createApp, createServer } = require('../app');
const { connectAndSync, models, sequelize } = require('../db');

jest.setTimeout(20000);

describe('notices publish', () => {
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

  test('post notice triggers publish', async () => {
    const User = models.User;
    const Landlord = models.Landlord;
    const u = await User.create({ email: 'l@l.com', password: 'x', role: 'landlord' });
    const ll = await Landlord.create({ name: 'L1', UserId: u.id });
    const estate = await models.Estate.create({ name: 'E1', landlordId: ll.id });
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: u.id }, process.env.JWT_SECRET || 'secretkey');
    const res = await request(server).post('/api/notices').set('Authorization', `Bearer ${token}`).send({ title: 'Hi', message: 'yo', estate: estate.id });
    expect(res.status).toBe(201);
    expect(global.__last_publish).toBeDefined();
    expect(global.__last_publish.event).toBe('notice:create');
    expect(global.__last_publish.data && global.__last_publish.data.estateId).toBe(estate.id);
  });
});
