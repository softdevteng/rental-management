const express = require('express');
const router = express.Router();
const { models } = require('../db');
const auth = require('../middleware/auth');

// Get tenant profile
router.get('/me', auth, async (req, res) => {
  if (req.user.role !== 'tenant') return res.status(403).json({ error: 'Forbidden' });
  const tenant = await models.Tenant.findByPk(req.user.refId, {
    include: [{ model: models.Apartment, include: [models.Estate] }, { model: models.Payment }, { model: models.Ticket }]
  });
  res.json(tenant);
});

// Update tenant profile
router.patch('/me', auth, async (req, res) => {
  if (req.user.role !== 'tenant') return res.status(403).json({ error: 'Forbidden' });
  const tenant = await models.Tenant.findByPk(req.user.refId);
  if (!tenant) return res.status(404).json({ error: 'Not found' });
  const { name, phone, photoUrl } = req.body;
  await tenant.update({
    name: typeof name === 'string' ? name : tenant.name,
    phone: typeof phone === 'string' ? phone : tenant.phone,
    photoUrl: typeof photoUrl === 'string' ? photoUrl : tenant.photoUrl,
  });
  res.json(tenant);
});

// View payment history
router.get('/payments', auth, async (req, res) => {
  if (req.user.role !== 'tenant') return res.status(403).json({ error: 'Forbidden' });
  const payments = await models.Payment.findAll({ where: { tenantId: req.user.refId } });
  res.json(payments);
});

// List own tickets
router.get('/tickets', auth, async (req, res) => {
  if (req.user.role !== 'tenant') return res.status(403).json({ error: 'Forbidden' });
  const tickets = await models.Ticket.findAll({ where: { tenantId: req.user.refId }, include: [models.Apartment] });
  res.json(tickets);
});

// Raise repair ticket
router.post('/tickets', auth, async (req, res) => {
  if (req.user.role !== 'tenant') return res.status(403).json({ error: 'Forbidden' });
  const { description } = req.body;
  if (!description || !description.trim()) return res.status(400).json({ error: 'Description is required' });
  const tenant = await models.Tenant.findByPk(req.user.refId, { include: [models.Apartment] });
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
  const ticket = await models.Ticket.create({ tenantId: req.user.refId, apartmentId: tenant?.Apartment?.id, description });
  res.status(201).json(ticket);
});

// Submit vacate notice
router.post('/vacate', auth, async (req, res) => {
  if (req.user.role !== 'tenant') return res.status(403).json({ error: 'Forbidden' });
  const tenant = await models.Tenant.findByPk(req.user.refId);
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
  await tenant.update({ vacateDate: new Date(), vacateStatus: 'pending' });
  res.json({ message: 'Vacate notice submitted' });
});

module.exports = router;
