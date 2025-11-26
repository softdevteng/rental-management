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

test('estate summary returns KPIs for landlord', async () => {
  // seed a landlord, estate, apartments, tenants, payments and tickets
  const landlord = await models.Landlord.create({ name: 'LD', email: 'ld@ex.com' });
  const estate = await models.Estate.create({ name: 'Estate B', address: 'Addr B', landlordId: landlord.id });
  const apt1 = await models.Apartment.create({ number: '1A', estateId: estate.id });
  const apt2 = await models.Apartment.create({ number: '1B', estateId: estate.id });

  const tenant = await models.Tenant.create({ name: 'T1', idNumber: 'ID1', email: 't1@ex.com' });
  await apt1.update({ tenantId: tenant.id });

  // payments
  await models.Payment.create({ apartmentId: apt1.id, amount: 1000, status: 'paid' });
  await models.Payment.create({ apartmentId: apt2.id, amount: 500, status: 'pending' });

  // ticket
  await models.Ticket.create({ apartmentId: apt1.id, title: 'Leaky tap', status: 'open' });

  // user as landlord
  const user = await models.User.create({ email: 'u@ld.com', password: 'x', role: 'landlord', refId: landlord.id });
  const jwt = require('jsonwebtoken');
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secretkey');

  const res = await request(app)
    .get('/api/reports/estate-summary')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  expect(res.body).toHaveProperty('occupancy');
  expect(res.body).toHaveProperty('tenantsCount');
  expect(res.body.revenue).toHaveProperty('collected');
  expect(res.body.tickets).toHaveProperty('open');
  expect(res.body.occupancy.total).toBeGreaterThanOrEqual(2);
});
