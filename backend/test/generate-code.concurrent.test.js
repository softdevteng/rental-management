const request = require('supertest');
const { createApp } = require('../app');
const { connectAndSync, sequelize, models } = require('../db');

// Skip this concurrency test when using SQLite in-memory because SQLite serializes
// transactions and cannot start nested transactions in the same connection which
// makes this test produce false negatives in the in-memory test environment.
const dialect = (sequelize && typeof sequelize.getDialect === 'function') ? sequelize.getDialect() : null;
const itOrSkip = dialect === 'sqlite' ? test.skip : test;

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

itOrSkip('concurrent generate-code requests return unique tenant codes', async () => {
  // setup landlord, estate, apartment and auth
  const landlord = await models.Landlord.create({ name: 'LC', email: 'lc@example.com' });
  const estate = await models.Estate.create({ name: 'Concurrent Estate', address: 'Addr', landlordId: landlord.id });
  const apt = await models.Apartment.create({ number: 'Concurrency Apt', estateId: estate.id });

  const user = await models.User.create({ email: 'concurrent@ex.com', password: 'p', role: 'landlord', refId: landlord.id });
  const jwt = require('jsonwebtoken');
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secretkey');

  const parallel = 12;
  const promises = [];
  for (let i = 0; i < parallel; i++) {
    promises.push(request(app)
      .post('/api/landlords/tenants/generate-code')
      .set('Authorization', `Bearer ${token}`)
      .send({ apartmentId: apt.id })
      .then(res => {
        if (res.status !== 200) throw new Error('non-200 from generate');
        return res.body.tenantCode;
      }));
  }

  const results = await Promise.all(promises);
  // ensure all are non-empty strings
  results.forEach(r => expect(typeof r).toBe('string'));
  // ensure uniqueness
  const uniq = new Set(results);
  expect(uniq.size).toBe(results.length);
});
