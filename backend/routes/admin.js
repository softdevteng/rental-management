const express = require('express');
const router = express.Router();
const { sequelize, models } = require('../db');
const auth = require('../middleware/auth');

// Export DB content (JSON backup) - landlord only
router.get('/backup', auth, async (req, res) => {
  if (req.user.role !== 'landlord') return res.status(403).json({ error: 'Forbidden' });
  const payload = {};
  for (const [name, model] of Object.entries(models)) {
    try {
      payload[name] = await model.findAll({ raw: true });
    } catch (e) {
      payload[name] = { error: e.message };
    }
  }
  res.setHeader('Content-Disposition', 'attachment; filename="rms-backup.json"');
  res.json(payload);
});

// Restore DB content from JSON (DANGEROUS) - landlord only
// Requires confirm=true query param to proceed
router.post('/restore', auth, async (req, res) => {
  if (req.user.role !== 'landlord') return res.status(403).json({ error: 'Forbidden' });
  if (req.query.confirm !== 'true') return res.status(400).json({ error: 'Confirmation required: ?confirm=true' });
  const data = req.body;
  if (!data || typeof data !== 'object') return res.status(400).json({ error: 'Invalid payload' });
  const t = await sequelize.transaction();
  try {
    // Simple replace strategy: truncate and bulk insert in dependency order
    const order = ['User','Tenant','Landlord','Estate','Apartment','Caretaker','Ticket','Payment','Notice','CaretakerInvite'];
    for (const name of order) {
      if (!models[name]) continue;
      await models[name].destroy({ where: {}, truncate: true, transaction: t });
      const items = Array.isArray(data[name]) ? data[name] : [];
      if (items.length) await models[name].bulkCreate(items, { transaction: t, ignoreDuplicates: true });
    }
    await t.commit();
    res.json({ message: 'Restore complete' });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
