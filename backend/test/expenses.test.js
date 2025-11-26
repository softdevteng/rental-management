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

test('expenses CRUD for landlord', async () => {
  const landlord = await models.Landlord.create({ name: 'L', email: 'l@ex.com' });
  const estate = await models.Estate.create({ name: 'EstateX', address: 'Addr', landlordId: landlord.id });

  const user = await models.User.create({ email: 'u@l.com', password: 'x', role: 'landlord', refId: landlord.id });
  const jwt = require('jsonwebtoken');
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secretkey');

  // Create
  const createRes = await request(app)
    .post('/api/expenses')
    .set('Authorization', `Bearer ${token}`)
    .send({ amount: 123.45, date: new Date().toISOString(), category: 'repairs', notes: 'test', estateId: estate.id })
    .expect(201);

  expect(createRes.body).toHaveProperty('id');
  const id = createRes.body.id;

  // List
  const listRes = await request(app)
    .get('/api/expenses')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  expect(Array.isArray(listRes.body)).toBe(true);
  expect(listRes.body.find(e => String(e.id) === String(id))).toBeTruthy();

  // Get single
  const getRes = await request(app)
    .get(`/api/expenses/${id}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  expect(getRes.body.id).toBe(id);

  // Update
  const updRes = await request(app)
    .put(`/api/expenses/${id}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ amount: 200 })
    .expect(200);
  expect(parseFloat(updRes.body.amount)).toBeCloseTo(200);

  // Delete
  await request(app)
    .delete(`/api/expenses/${id}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  // verify removed
  await request(app)
    .get(`/api/expenses/${id}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(404);
});
