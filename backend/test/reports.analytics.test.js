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

test('analytics endpoint returns monthly series', async () => {
  // seed a landlord and data
  const landlord = await models.Landlord.create({ name: 'LA', email: 'la@ex.com' });
  const estate = await models.Estate.create({ name: 'E1', address: 'A1', landlordId: landlord.id });
  const apt = await models.Apartment.create({ number: 'X1', estateId: estate.id });

  // create tenants across months by adjusting createdAt
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth()-1, 5);
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth()-2, 5);

  const t1 = await models.Tenant.create({ name: 'T1', idNumber: 'ID1', email: 't1@ex.com', createdAt: twoMonthsAgo, updatedAt: twoMonthsAgo });
  const t2 = await models.Tenant.create({ name: 'T2', idNumber: 'ID2', email: 't2@ex.com', createdAt: lastMonth, updatedAt: lastMonth });

  // payments
  await models.Payment.create({ apartmentId: apt.id, amount: 200, status: 'paid', createdAt: twoMonthsAgo, updatedAt: twoMonthsAgo });
  await models.Payment.create({ apartmentId: apt.id, amount: 300, status: 'paid', createdAt: lastMonth, updatedAt: lastMonth });

  const user = await models.User.create({ email: 'u@ld.com', password: 'x', role: 'landlord', refId: landlord.id });
  const jwt = require('jsonwebtoken');
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secretkey');

  const res = await request(app)
    .get('/api/reports/analytics')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  expect(res.body).toHaveProperty('monthlyRevenue');
  expect(res.body).toHaveProperty('monthlyNewTenants');
  expect(Array.isArray(res.body.monthlyRevenue)).toBe(true);
});
