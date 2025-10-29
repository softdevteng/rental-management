const express = require('express');
const router = express.Router();
const { models } = require('../db');
const auth = require('../middleware/auth');
const { publish } = require('../utils/stream');

// Get all notices for an estate (tenant)
router.get('/estate/:id', auth, async (req, res) => {
  const notices = await models.Notice.findAll({ where: { estateId: req.params.id } });
  res.json(notices);
});

// Landlord or caretaker post a notice
router.post('/', auth, async (req, res) => {
  if (!['landlord','caretaker'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const { title, message, estate } = req.body;
  if (!estate || !title || !message) return res.status(400).json({ error: 'estate, title and message required' });
  const notice = await models.Notice.create({ landlordId: req.user.refId, estateId: estate, title, message });
  try { publish('notice:create', { id: notice.id, estateId: notice.estateId, title: notice.title }); } catch (e) {}
  res.status(201).json(notice);
});

module.exports = router;
