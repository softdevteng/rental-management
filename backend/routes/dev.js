const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { models } = require('../db');

// Dev-only: Seed some sample data so dashboards show content
router.post('/seed-basic', auth, async (req, res) => {
  try {
    if (process.env.ENABLE_DEV_ROUTES !== 'true') return res.status(403).json({ error: 'Dev routes disabled' });
    if (req.user.role !== 'landlord') return res.status(403).json({ error: 'Landlord token required' });

    const landlord = await models.Landlord.findByPk(req.user.refId);
    if (!landlord) return res.status(400).json({ error: 'Landlord profile missing' });

    const now = Date.now();

  const estate = await models.Estate.create({ name: `Sample Estate ${now}`, address: '123 Demo St', landlordId: landlord.id });
  const apt = await models.Apartment.create({ number: `A-${now % 1000}`, estateId: estate.id, rent: 1000, deposit: 2000 });

    // Find any tenant to link, or do nothing if none exists
    let tenant = null;
    if (req.body.tenantEmail) tenant = await models.Tenant.findOne({ where: { email: req.body.tenantEmail } });
    if (!tenant) tenant = await models.Tenant.findOne();
    if (tenant) {
      await apt.update({ tenantId: tenant.id });
      await models.Payment.create({ tenantId: tenant.id, apartmentId: apt.id, amount: 1000, date: new Date(), status: 'paid' });
    }

  const notice = await models.Notice.create({ landlordId: landlord.id, estateId: estate.id, title: 'Welcome Notice', message: 'Welcome to the estate! This is a sample notice.' });

  // Create a caretaker for this estate/apartment
  const caretaker = await models.Caretaker.create({ name: 'Sample Caretaker', email: `caretaker+${now}@example.com`, idNumber: String(10000000 + (now % 1000000)), estateId: estate.id, apartmentId: apt.id });

  res.json({ estate, apartment: apt, caretaker, notice, message: tenant ? 'Linked to an existing tenant' : 'No tenant found to link' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
