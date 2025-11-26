const express = require('express');
const auth = require('../middleware/auth');
const { authorize, ROLES } = require('../middleware/rbac');
const { models, Sequelize } = require('../db');
const { Op } = Sequelize;

const router = express.Router();

// List expenses (landlords and caretakers)
// Optional query params: estateId, landlordId, from, to, category
router.get('/', auth, authorize([ROLES.LANDLORD, ROLES.CARETAKER]), async (req, res) => {
  try {
    const { estateId, landlordId, from, to, category } = req.query;
    const where = {};
    if (estateId) where.estateId = estateId;
    if (landlordId) where.landlordId = landlordId;
    if (category) where.category = category;
    if (from || to) {
      where.date = {};
      if (from) {
        const d = new Date(from);
        if (!isNaN(d)) where.date[Op.gte] = d;
      }
      if (to) {
        const d2 = new Date(to);
        if (!isNaN(d2)) where.date[Op.lte] = d2;
      }
    }

    const expenses = await models.Expense.findAll({ where, order: [['date', 'DESC']] });
    res.json(expenses);
  } catch (err) {
    console.error('GET /api/expenses error', err && err.message ? err.message : err);
    res.status(500).json({ error: 'Failed to list expenses' });
  }
});

// Create an expense (only landlords)
router.post('/', auth, authorize([ROLES.LANDLORD]), async (req, res) => {
  try {
    const { amount, date, category, notes, estateId } = req.body || {};
    const landlordId = req.user.refId;
    if (!landlordId) return res.status(403).json({ error: 'Landlord context required' });
    // Basic validation
    const parsedAmount = amount != null ? parseFloat(amount) : NaN;
    if (isNaN(parsedAmount)) return res.status(400).json({ error: 'Invalid amount' });
    if (!estateId) return res.status(400).json({ error: 'estateId is required' });
    const payload = { amount: parsedAmount, date: date ? new Date(date) : new Date(), category: category || 'uncategorized', notes: notes || '', estateId, landlordId };
    const created = await models.Expense.create(payload);
    res.status(201).json(created);
  } catch (err) {
    console.error('POST /api/expenses error', err && err.message ? err.message : err);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

// Get single expense
router.get('/:id', auth, authorize([ROLES.LANDLORD, ROLES.CARETAKER]), async (req, res) => {
  try {
    const e = await models.Expense.findByPk(req.params.id);
    if (!e) return res.status(404).json({ error: 'Not found' });
    res.json(e);
  } catch (err) {
    console.error('GET /api/expenses/:id error', err && err.message ? err.message : err);
    res.status(500).json({ error: 'Failed to fetch expense' });
  }
});

// Update expense (landlord only)
router.put('/:id', auth, authorize([ROLES.LANDLORD]), async (req, res) => {
  try {
    const e = await models.Expense.findByPk(req.params.id);
    if (!e) return res.status(404).json({ error: 'Not found' });
    if (String(e.landlordId) !== String(req.user.refId)) return res.status(403).json({ error: 'Forbidden' });
    const { amount, date, category, notes } = req.body || {};
    if (amount != null) {
      const parsed = parseFloat(amount);
      if (isNaN(parsed)) return res.status(400).json({ error: 'Invalid amount' });
      e.amount = parsed;
    }
    if (date) {
      const d = new Date(date);
      if (!isNaN(d)) e.date = d;
    }
    if (category != null) e.category = category;
    if (notes != null) e.notes = notes;
    await e.save();
    res.json(e);
  } catch (err) {
    console.error('PUT /api/expenses/:id error', err && err.message ? err.message : err);
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

// Delete expense (landlord only)
router.delete('/:id', auth, authorize([ROLES.LANDLORD]), async (req, res) => {
  try {
    const e = await models.Expense.findByPk(req.params.id);
    if (!e) return res.status(404).json({ error: 'Not found' });
    if (String(e.landlordId) !== String(req.user.refId)) return res.status(403).json({ error: 'Forbidden' });
    await e.destroy();
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/expenses/:id error', err && err.message ? err.message : err);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

module.exports = router;
