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

test('kpis endpoint returns turnover, occupancyTrend, and expenseSummary', async () => {
  const landlord = await models.Landlord.create({ name: 'LA', email: 'la@ex.com' });
  const estate = await models.Estate.create({ name: 'E1', address: 'A1', landlordId: landlord.id });
  const apt1 = await models.Apartment.create({ number: 'A1', estateId: estate.id });
  const apt2 = await models.Apartment.create({ number: 'A2', estateId: estate.id });

  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth()-1, 5);
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth()-2, 5);

  // tenants: one two months ago, one last month, one moved out last month (vacateDate)
  const t1 = await models.Tenant.create({ name: 'T1', idNumber: 'ID1', email: 't1@ex.com', createdAt: twoMonthsAgo, updatedAt: twoMonthsAgo });
  const t2 = await models.Tenant.create({ name: 'T2', idNumber: 'ID2', email: 't2@ex.com', createdAt: lastMonth, updatedAt: lastMonth });
  const t3 = await models.Tenant.create({ name: 'T3', idNumber: 'ID3', email: 't3@ex.com', createdAt: twoMonthsAgo, updatedAt: twoMonthsAgo, vacateDate: lastMonth });

  // assign tenant to apartment
  await apt1.update({ tenantId: t1.id });

  await models.Payment.create({ apartmentId: apt1.id, tenantId: t1.id, amount: 200, status: 'paid', createdAt: twoMonthsAgo, updatedAt: twoMonthsAgo });
  await models.Payment.create({ apartmentId: apt2.id, tenantId: t2.id, amount: 300, status: 'pending', createdAt: lastMonth, updatedAt: lastMonth });

  // create a couple of expense records
  if (models.Expense) {
    await models.Expense.create({ amount: 50, date: twoMonthsAgo, category: 'repair', estateId: estate.id, landlordId: landlord.id });
    await models.Expense.create({ amount: 75, date: lastMonth, category: 'utilities', estateId: estate.id, landlordId: landlord.id });
  }

  // seed occupancy history if supported
  if (models.OccupancyHistory) {
    // two months ago: apt1 occupied, apt2 vacant
    await models.OccupancyHistory.create({ apartmentId: apt1.id, estateId: estate.id, tenantId: t1.id, status: 'occupied', recordedAt: twoMonthsAgo });
    await models.OccupancyHistory.create({ apartmentId: apt2.id, estateId: estate.id, tenantId: null, status: 'vacant', recordedAt: twoMonthsAgo });
    // last month: apt1 occupied, apt2 occupied
    await models.OccupancyHistory.create({ apartmentId: apt1.id, estateId: estate.id, tenantId: t1.id, status: 'occupied', recordedAt: lastMonth });
    await models.OccupancyHistory.create({ apartmentId: apt2.id, estateId: estate.id, tenantId: t2.id, status: 'occupied', recordedAt: lastMonth });
  }

  const user = await models.User.create({ email: 'u@ld.com', password: 'x', role: 'landlord', refId: landlord.id });
  const jwt = require('jsonwebtoken');
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secretkey');

  const res = await request(app)
    .get('/api/reports/kpis')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  expect(res.body).toHaveProperty('turnover');
  expect(res.body).toHaveProperty('occupancyTrend');
  expect(res.body).toHaveProperty('expenseSummary');
  expect(Array.isArray(res.body.turnover)).toBe(true);
  expect(Array.isArray(res.body.occupancyTrend)).toBe(true);
  expect(res.body).toHaveProperty('expenseSummary');
  if (models.Expense) {
    const total = parseFloat(res.body.expenseSummary.totalExpenses || 0);
    expect(total).toBeGreaterThanOrEqual(125 - 0.001);
  }
});
