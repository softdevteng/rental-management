const express = require('express');
const router = express.Router();
const { models, Sequelize } = require('../db');
const auth = require('../middleware/auth');

// Get landlord profile
router.get('/me', auth, async (req, res) => {
  if (req.user.role !== 'landlord') return res.status(403).json({ error: 'Forbidden' });
  const landlord = await models.Landlord.findByPk(req.user.refId, {
    include: [models.Estate, models.Notice]
  });
  res.json(landlord);
});

// Update landlord profile
router.patch('/me', auth, async (req, res) => {
  if (req.user.role !== 'landlord') return res.status(403).json({ error: 'Forbidden' });
  const landlord = await models.Landlord.findByPk(req.user.refId);
  if (!landlord) return res.status(404).json({ error: 'Not found' });
  const { name, phone, photoUrl } = req.body;
  await landlord.update({
    name: typeof name === 'string' ? name : landlord.name,
    phone: typeof phone === 'string' ? phone : landlord.phone,
    photoUrl: typeof photoUrl === 'string' ? photoUrl : landlord.photoUrl,
  });
  res.json(landlord);
});

// Manage rent payments for apartments
router.get('/apartments/:id/payments', auth, async (req, res) => {
  if (!['landlord','caretaker'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const payments = await models.Payment.findAll({ where: { apartmentId: req.params.id } });
  res.json(payments);
});

// Payments for a specific tenant (landlord only)
router.get('/tenants/:id/payments', auth, async (req, res) => {
  if (!['landlord','caretaker'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const payments = await models.Payment.findAll({ where: { tenantId: req.params.id } });
  res.json(payments);
});

// Generate notice for tenants
router.post('/notices', auth, async (req, res) => {
  if (!['landlord','caretaker'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const { estate, title, message, type = 'general', tenantId } = req.body;
  if (!estate) return res.status(400).json({ error: 'Estate is required' });
  if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });
  if (!message || !message.trim()) return res.status(400).json({ error: 'Message is required' });
  const landlordId = req.user.role === 'landlord' ? req.user.refId : null;
  const notice = await models.Notice.create({ landlordId, estateId: estate, tenantId: tenantId || null, title, message, type });
  res.status(201).json(notice);
});

// View and manage tickets
router.get('/tickets', auth, async (req, res) => {
  if (!['landlord','caretaker'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const { estate, apartment, status, from, to } = req.query;
  const where = {};
  if (apartment) where.apartmentId = apartment;
  if (status) where.status = status;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt[Sequelize.Op.gte] = new Date(from);
    if (to) where.createdAt[Sequelize.Op.lte] = new Date(to);
  }
  const tickets = await models.Ticket.findAll({
    where,
    include: [
      { model: models.Apartment, include: [models.Estate] },
      { model: models.Tenant },
    ],
  });
  const filtered = estate
    ? tickets.filter(t => t.Apartment && t.Apartment.Estate && String(t.Apartment.Estate.id) === String(estate))
    : tickets;
  res.json(filtered);
});

// Update a ticket status
router.put('/tickets/:id/status', auth, async (req, res) => {
  if (!['landlord','caretaker'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const { status } = req.body;
  const allowed = ['open','in-progress','closed'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const ticket = await models.Ticket.findByPk(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Not found' });
  await ticket.update({ status, resolvedAt: status==='closed' ? new Date() : null });
  res.json(ticket);
});

// List notices created by landlord
router.get('/notices', auth, async (req, res) => {
  if (!['landlord','caretaker'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  let where = {};
  if (req.user.role === 'landlord') where.landlordId = req.user.refId;
  const notices = await models.Notice.findAll({ where });
  res.json(notices);
});

// Create estate (landlord only)
router.post('/estates', auth, async (req, res) => {
  if (req.user.role !== 'landlord') return res.status(403).json({ error: 'Forbidden' });
  const { name, address } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const estate = await models.Estate.create({ name, address: address || '', landlordId: req.user.refId });
  res.status(201).json(estate);
});

// Delete estate (landlord only)
router.delete('/estates/:id', auth, async (req, res) => {
  if (req.user.role !== 'landlord') return res.status(403).json({ error: 'Forbidden' });
  const estate = await models.Estate.findByPk(req.params.id);
  if (!estate) return res.status(404).json({ error: 'Not found' });
  if (String(estate.landlordId) !== String(req.user.refId)) return res.status(403).json({ error: 'Not your estate' });
  // Optional: cascade delete apartments
  const apts = await models.Apartment.findAll({ where: { estateId: estate.id } });
  for (const a of apts) await a.destroy();
  await estate.destroy();
  res.json({ message: 'Estate deleted' });
});

// Assign caretaker to an estate (landlord)
router.post('/estates/:id/assign-caretaker', auth, async (req, res) => {
  if (req.user.role !== 'landlord') return res.status(403).json({ error: 'Forbidden' });
  const { caretakerId } = req.body;
  const estate = await models.Estate.findByPk(req.params.id);
  if (!estate) return res.status(404).json({ error: 'Estate not found' });
  const caretaker = await models.Caretaker.findByPk(caretakerId);
  if (!caretaker) return res.status(404).json({ error: 'Caretaker not found' });
  await caretaker.update({ estateId: estate.id });
  res.json(caretaker);
});

// Delete caretaker (landlord)
router.delete('/caretakers/:id', auth, async (req, res) => {
  if (req.user.role !== 'landlord') return res.status(403).json({ error: 'Forbidden' });
  const caretaker = await models.Caretaker.findByPk(req.params.id);
  if (!caretaker) return res.status(404).json({ error: 'Not found' });
  await caretaker.destroy();
  res.json({ message: 'Caretaker deleted' });
});

// Caretaker profile
router.get('/caretakers/me', auth, async (req, res) => {
  if (req.user.role !== 'caretaker') return res.status(403).json({ error: 'Forbidden' });
  const me = await models.Caretaker.findByPk(req.user.refId, { include: [models.Estate, models.Apartment] });
  res.json(me);
});

// Update caretaker profile
router.patch('/caretakers/me', auth, async (req, res) => {
  if (req.user.role !== 'caretaker') return res.status(403).json({ error: 'Forbidden' });
  const me = await models.Caretaker.findByPk(req.user.refId);
  if (!me) return res.status(404).json({ error: 'Not found' });
  const { name, phone, photoUrl } = req.body;
  await me.update({
    name: typeof name === 'string' ? name : me.name,
    phone: typeof phone === 'string' ? phone : me.phone,
    photoUrl: typeof photoUrl === 'string' ? photoUrl : me.photoUrl,
  });
  res.json(me);
});

module.exports = router;

// Additional endpoints appended by patcher (export moved above intentionally)
// Create apartment under an estate (landlord only)
router.post('/estates/:id/apartments', auth, async (req, res) => {
  if (req.user.role !== 'landlord') return res.status(403).json({ error: 'Forbidden' });
  const estate = await models.Estate.findByPk(req.params.id);
  if (!estate) return res.status(404).json({ error: 'Estate not found' });
  const { number, rent = 0, deposit = 0 } = req.body;
  if (!number) return res.status(400).json({ error: 'Apartment number required' });
  const apt = await models.Apartment.create({ number, rent, deposit, estateId: estate.id });
  res.status(201).json(apt);
});

// Delete apartment (landlord only)
router.delete('/apartments/:id', auth, async (req, res) => {
  if (req.user.role !== 'landlord') return res.status(403).json({ error: 'Forbidden' });
  const apt = await models.Apartment.findByPk(req.params.id);
  if (!apt) return res.status(404).json({ error: 'Not found' });
  // Verify the apartment belongs to landlord through the estate
  const est = await models.Estate.findByPk(apt.estateId);
  if (!est || String(est.landlordId) !== String(req.user.refId)) return res.status(403).json({ error: 'Not your estate/apartment' });
  await apt.destroy();
  res.json({ message: 'Apartment deleted' });
});

// Assign a tenant to an apartment (landlord only)
router.post('/apartments/:id/assign-tenant', auth, async (req, res) => {
  if (!['landlord','caretaker'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const apt = await models.Apartment.findByPk(req.params.id);
  if (!apt) return res.status(404).json({ error: 'Apartment not found' });
  const { tenantId } = req.body;
  if (!tenantId) return res.status(400).json({ error: 'tenantId required' });
  const tenant = await models.Tenant.findByPk(tenantId);
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
  // If caretaker, only allow assigning to their own apartment
  if (req.user.role === 'caretaker') {
    const me = await models.Caretaker.findByPk(req.user.refId);
    if (!me || String(me.apartmentId) !== String(apt.id)) return res.status(403).json({ error: 'Not allowed for this apartment' });
  }
  await apt.update({ tenantId: tenant.id });
  res.json(apt);
});

// Generate caretaker invite code (landlord only)
router.post('/caretakers/invite', auth, async (req, res) => {
  if (req.user.role !== 'landlord') return res.status(403).json({ error: 'Forbidden' });
  const { estateId, apartmentId } = req.body;
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  const expiresAt = new Date(Date.now() + 1000*60*60*24); // 24h
  const invite = await models.CaretakerInvite.create({ code, expiresAt, landlordId: req.user.refId, estateId: estateId || null, apartmentId: apartmentId || null });
  res.status(201).json({ code: invite.code, expiresAt: invite.expiresAt, estateId: invite.estateId, apartmentId: invite.apartmentId });
});

// List tenants with apartments and basic payment status (landlord only)
router.get('/tenants', auth, async (req, res) => {
  if (req.user.role !== 'landlord') return res.status(403).json({ error: 'Forbidden' });
  const tenants = await models.Tenant.findAll({
    include: [
      { model: models.Apartment, include: [models.Estate] },
      { model: models.Payment, limit: 10, order: [['date','DESC']] },
    ],
  });
  res.json(tenants);
});

// Create tenant (landlord only) - minimal fields
router.post('/tenants', auth, async (req, res) => {
  if (req.user.role !== 'landlord') return res.status(403).json({ error: 'Forbidden' });
  const { name, idNumber, email, phone } = req.body;
  if (!name || !idNumber) return res.status(400).json({ error: 'name and idNumber required' });
  const t = await models.Tenant.create({ name, idNumber, email: email || null, phone: phone || null });
  res.status(201).json(t);
});

// Delete tenant (landlord only)
router.delete('/tenants/:id', auth, async (req, res) => {
  if (req.user.role !== 'landlord') return res.status(403).json({ error: 'Forbidden' });
  const t = await models.Tenant.findByPk(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  // Unassign from any apartment first
  const apt = await models.Apartment.findOne({ where: { tenantId: t.id } });
  if (apt) await apt.update({ tenantId: null });
  await t.destroy();
  res.json({ message: 'Tenant deleted' });
});
