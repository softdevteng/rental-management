const request = require('supertest');
const { createApp, createServer } = require('../app');
const { connectAndSync, models, sequelize } = require('../db');

jest.setTimeout(20000);

describe('caretaker invite auto-create', () => {
  let server; let app; let httpServer;
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    // Allow returning plaintext credentials for this test scenario
    process.env.ALLOW_RETURN_PLAINTEXT_CREDENTIALS = 'true';
    process.env.USE_SQLITE_IN_MEMORY = 'true';
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

  test('landlord can create property manager and user account directly', async () => {
    const User = models.User; const Landlord = models.Landlord; const Estate = models.Estate;
    const Caretaker = models.Caretaker;

    // create landlord and estate
    const landlord = await Landlord.create({ name: 'LL', email: 'll@example.com' });
    const estate = await Estate.create({ name: 'Test Estate', landlordId: landlord.id });
    const jwt = require('jsonwebtoken');
    const landlordUser = await User.create({ email: 'll-user@example.com', password: 'x', role: 'landlord', refId: landlord.id });
    const token = jwt.sign({ id: landlordUser.id, role: landlordUser.role }, process.env.JWT_SECRET || 'secretkey');

    const body = { estateId: estate.id, email: 'ct@example.com', name: 'Caretaker One', createUser: true, returnCredentials: true };
    const res = await request(server).post('/api/landlords/caretakers').set('Authorization', `Bearer ${token}`).send(body);
    expect(res.status).toBe(201);
    expect(res.body.created).toBe(true);
    expect(res.body.caretaker).toBeDefined();
    // Since we now return a setup token/url, expect setup to be present
    expect(res.body.setup).toBeDefined();
    expect(res.body.setup.token).toBeDefined();

    // Ensure caretaker and user exist in DB
    const c = await Caretaker.findOne({ where: { email: 'ct@example.com' } });
    expect(c).toBeDefined();
    const u = await User.findOne({ where: { email: 'ct@example.com' } });
    expect(u).toBeDefined();
  });
});
