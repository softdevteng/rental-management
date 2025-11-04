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

test('generate-code returns sequential tenant codes and respects existing codes', async () => {
  // create landlord and estate/apartment
  const landlord = await models.Landlord.create({ name: 'L', email: 'l@e.com' });
  const estate = await models.Estate.create({ name: 'Est', address: 'Addr', landlordId: landlord.id });
  const apt = await models.Apartment.create({ number: 'Green Park 1', estateId: estate.id });

  const user = await models.User.create({ email: 'land@ex.com', password: 'p', role: 'landlord', refId: landlord.id });
  const jwt = require('jsonwebtoken');
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secretkey');

  // First request should return a code like GP001
  const res1 = await request(app)
    .post('/api/landlords/tenants/generate-code')
    .set('Authorization', `Bearer ${token}`)
    .send({ apartmentId: apt.id })
    .expect(200);
  expect(res1.body.tenantCode).toMatch(/^[A-Z]{1,3}\d{3}$/);

  // Create a tenant using that code to simulate reservation
  const t = await models.Tenant.create({ name: 'T1', idNumber: 'ID1', tenantCode: res1.body.tenantCode });

  // Second request should return the next sequence (e.g., GP002)
  const res2 = await request(app)
    .post('/api/landlords/tenants/generate-code')
    .set('Authorization', `Bearer ${token}`)
    .send({ apartmentId: apt.id })
    .expect(200);
  expect(res2.body.tenantCode).not.toEqual(res1.body.tenantCode);
  // numeric suffix should increase
  const suffix1 = Number(res1.body.tenantCode.replace(/^[A-Z]+/, ''));
  const suffix2 = Number(res2.body.tenantCode.replace(/^[A-Z]+/, ''));
  expect(suffix2).toBeGreaterThan(suffix1);
});
