const express = require('express');
const router = express.Router();
const { models } = require('../db');
const auth = require('../middleware/auth');
const { publish } = require('../utils/stream');

// Get all tickets (landlord)
router.get('/', auth, async (req, res) => {
  if (req.user.role !== 'landlord') return res.status(403).json({ error: 'Forbidden' });
  const tickets = await models.Ticket.findAll({ include: [models.Tenant, models.Apartment] });
  res.json(tickets);
});

// Update ticket status (landlord)
router.put('/:id', auth, async (req, res) => {
  if (req.user.role !== 'landlord') return res.status(403).json({ error: 'Forbidden' });
  const ticket = await models.Ticket.findByPk(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Not found' });
  await ticket.update(req.body);
  try { publish('ticket:update', { id: ticket.id, status: ticket.status }); } catch (e) {}
  res.json(ticket);
});

// Create ticket (tenant or caretaker)
router.post('/', auth, async (req, res) => {
  const { description, apartment } = req.body;
  if (!description) return res.status(400).json({ error: 'Description required' });
  const tenantId = req.user.role === 'tenant' ? req.user.refId : req.body.tenantId;
  const ticket = await models.Ticket.create({ tenantId, apartmentId: apartment || null, description, status: 'open' });
  try { publish('ticket:create', { id: ticket.id, tenantId: ticket.tenantId, apartmentId: ticket.apartmentId }); } catch (e) {}
  res.status(201).json(ticket);
});

module.exports = router;
