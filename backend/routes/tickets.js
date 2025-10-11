const express = require('express');
const router = express.Router();
const { models } = require('../db');
const auth = require('../middleware/auth');

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
  res.json(ticket);
});

module.exports = router;
