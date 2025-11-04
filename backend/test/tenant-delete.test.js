const request = require('supertest');
const { createApp } = require('../app');
const { connectAndSync, sequelize, models } = require('../db');

let app, server;

beforeAll(async () => {
  // Use in-memory sqlite by default for fast tests. CI can force MySQL via FORCE_MYSQL=true
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

test('landlord can delete a tenant and apartment is unassigned', async () => {
  // create landlord, estate, apartment
  const landlord = await models.Landlord.create({ name: 'LD', email: 'ld@example.com' });
  const estate = await models.Estate.create({ name: 'Estate A', address: 'Addr', landlordId: landlord.id });
  const apt = await models.Apartment.create({ number: '100', estateId: estate.id });

  // create tenant and assign to apartment
  const tenant = await models.Tenant.create({ name: 'Todel', idNumber: 'IDDEL', email: 'td@example.com' });
  await apt.update({ tenantId: tenant.id });

  // create user with landlord role linked to landlord
  const user = await models.User.create({ email: 'user@ld.com', password: 'x', role: 'landlord', refId: landlord.id });
  const jwt = require('jsonwebtoken');
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secretkey');

  // call delete endpoint
  const res = await request(app)
    .delete(`/api/landlords/tenants/${tenant.id}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  expect(res.body.message).toMatch(/tenant deleted/i);

  // tenant should be removed from DB
  const found = await models.Tenant.findByPk(tenant.id);
  expect(found).toBeNull();

  // apartment should have tenantId cleared
  const updatedApt = await models.Apartment.findByPk(apt.id);
  expect(updatedApt.tenantId).toBeNull();
});
