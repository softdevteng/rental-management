const express = require('express');
const router = express.Router();
const { models, Sequelize } = require('../db');
const auth = require('../middleware/auth');

// Occupancy & rent collection summaries
router.get('/summary', auth, async (req, res) => {
  if (!['landlord','caretaker'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  // Scope: landlord sees all; caretaker limited to assigned estate/apartment
  let apartments = await models.Apartment.findAll({ include: [models.Estate] });
  let payments = await models.Payment.findAll();
  if (req.user.role === 'caretaker') {
    const me = await models.Caretaker.findByPk(req.user.refId);
    if (me?.estateId) apartments = apartments.filter(a => String(a.estateId) === String(me.estateId));
    if (me?.apartmentId) apartments = apartments.filter(a => String(a.id) === String(me.apartmentId));
    const aptIds = apartments.map(a => a.id);
    payments = payments.filter(p => aptIds.includes(p.apartmentId));
  }
  const totalUnits = apartments.length;
  const occupied = apartments.filter(a => a.tenantId).length;
  const vacant = totalUnits - occupied;
  const collected = payments.filter(p => p.status === 'paid').reduce((s,p)=> s + Number(p.amount||0), 0);
  const pending = payments.filter(p => p.status !== 'paid').reduce((s,p)=> s + Number(p.amount||0), 0);
  res.json({ occupancy: { total: totalUnits, occupied, vacant }, revenue: { collected, pending } });
});

// Estate-level summary with a few extra KPIs useful for the dashboard
router.get('/estate-summary', auth, async (req, res) => {
  if (!['landlord','caretaker'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  // Gather apartments and payments similar to /summary, but also include counts and simple KPIs
  let apartments = await models.Apartment.findAll({ include: [models.Estate] });
  let payments = await models.Payment.findAll();
  let tickets = await models.Ticket.findAll();
  if (req.user.role === 'caretaker') {
    const me = await models.Caretaker.findByPk(req.user.refId);
    if (me?.estateId) apartments = apartments.filter(a => String(a.estateId) === String(me.estateId));
    if (me?.apartmentId) apartments = apartments.filter(a => String(a.id) === String(me.apartmentId));
    const aptIds = apartments.map(a => a.id);
    payments = payments.filter(p => aptIds.includes(p.apartmentId));
    tickets = tickets.filter(t => aptIds.includes(t.apartmentId));
  }

  const totalUnits = apartments.length;
  const occupied = apartments.filter(a => a.tenantId).length;
  const vacant = totalUnits - occupied;
  const tenantsCount = (await models.Tenant.count());

  const collected = payments.filter(p => p.status === 'paid').reduce((s,p)=> s + Number(p.amount||0), 0);
  const pending = payments.filter(p => p.status !== 'paid').reduce((s,p)=> s + Number(p.amount||0), 0);

  const recentOpenTickets = tickets.filter(t => t.status !== 'resolved' && t.status !== 'closed').length;

  res.json({
    occupancy: { total: totalUnits, occupied, vacant },
    tenantsCount,
    revenue: { collected, pending },
    tickets: { open: recentOpenTickets }
  });
});

// Analytics endpoints: simple aggregation for KPIs/trends used by dashboard widgets
router.get('/analytics', auth, async (req, res) => {
  if (!['landlord','caretaker','admin'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });

  // basic time-windowed stats (last 3 months) - counts by month
  const months = [];
  const now = new Date();
  for (let i = 2; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    months.push({ key, date: d });
  }

  const payments = await models.Payment.findAll();
  const tenants = await models.Tenant.findAll();

  const monthlyRevenue = months.map(m => {
    const monthPayments = payments.filter(p => {
      const created = new Date(p.createdAt);
      const key = `${created.getFullYear()}-${String(created.getMonth()+1).padStart(2,'0')}`;
      return key === m.key;
    });
    return { month: m.key, collected: monthPayments.filter(p => p.status === 'paid').reduce((s,p)=> s + Number(p.amount||0), 0) };
  });

  const monthlyNewTenants = months.map(m => {
    const t = tenants.filter(tn => {
      const created = new Date(tn.createdAt);
      const key = `${created.getFullYear()}-${String(created.getMonth()+1).padStart(2,'0')}`;
      return key === m.key;
    });
    return { month: m.key, count: t.length };
  });

  res.json({ monthlyRevenue, monthlyNewTenants });
});

module.exports = router;

