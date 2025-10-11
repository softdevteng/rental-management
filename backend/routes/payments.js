const express = require('express');
const router = express.Router();
const { models } = require('../db');
const auth = require('../middleware/auth');
const { sendMail } = require('../utils/mailer');

// Create payment (landlord)
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'landlord') return res.status(403).json({ error: 'Forbidden' });
  const { tenant, apartment, amount, date } = req.body;
  const payment = await models.Payment.create({ tenantId: tenant, apartmentId: apartment, amount, date, status: 'pending' });
  res.status(201).json(payment);
});

// Update payment status
router.put('/:id', auth, async (req, res) => {
  if (req.user.role !== 'landlord') return res.status(403).json({ error: 'Forbidden' });
  const payment = await models.Payment.findByPk(req.params.id);
  if (!payment) return res.status(404).json({ error: 'Not found' });
  await payment.update(req.body);
  res.json(payment);
});

// Tenant: initiate M-Pesa STK push (mock)
router.post('/mpesa/initiate', auth, async (req, res) => {
  if (req.user.role !== 'tenant') return res.status(403).json({ error: 'Forbidden' });
  const { amount, phone } = req.body;
  if (!amount || !phone) return res.status(400).json({ error: 'Amount and phone required' });
  const tenant = await models.Tenant.findByPk(req.user.refId, { include: [models.Apartment] });
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
  const payment = await models.Payment.create({
    tenantId: tenant.id,
    apartmentId: tenant?.Apartment?.id || null,
    amount,
    date: new Date(),
    status: 'pending',
    method: 'mpesa',
    mpesaPhone: phone,
    mpesaCheckoutRequestId: 'CHK_' + Date.now(),
    mpesaMerchantRequestId: 'MER_' + Math.floor(Math.random()*1000000),
  });
  // In real integration, trigger STK push via M-Pesa API and return CheckoutRequestID
  res.status(201).json({
    message: 'STK push initiated (mock)',
    paymentId: payment.id,
    checkoutRequestId: payment.mpesaCheckoutRequestId,
  });
});

// Tenant: mock-complete M-Pesa payment (simulate callback)
router.post('/mpesa/complete', auth, async (req, res) => {
  if (req.user.role !== 'tenant') return res.status(403).json({ error: 'Forbidden' });
  const { paymentId, success } = req.body;
  const payment = await models.Payment.findByPk(paymentId);
  if (!payment) return res.status(404).json({ error: 'Not found' });
  if (String(payment.tenantId) !== String(req.user.refId)) return res.status(403).json({ error: 'Forbidden' });
  await payment.update({
    status: success ? 'paid' : 'pending',
    mpesaReceipt: success ? 'RCP' + Math.floor(Math.random()*10000000) : null,
    mpesaResultCode: success ? '0' : '1',
    mpesaResultDesc: success ? 'Success' : 'Failed',
  });
  res.json(payment);
});

// Landlord: send rent reminders to all tenants in an estate
router.post('/reminders/estate', auth, async (req, res) => {
  if (!['landlord','caretaker'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const { estateId, title, message } = req.body;
  if (!estateId) return res.status(400).json({ error: 'estateId required' });
  const estate = await models.Estate.findByPk(estateId, { include: [models.Apartment] });
  if (!estate) return res.status(404).json({ error: 'Estate not found' });
  const apts = estate.Apartments || [];
  let count = 0;
  for (const apt of apts) {
    if (apt.tenantId) {
      await models.Notice.create({ landlordId: req.user.refId, estateId: estate.id, tenantId: apt.tenantId, title: title || 'Rent Reminder', message: message || 'Your rent is due.', type: 'rent-reminder' });
      const tenant = await models.Tenant.findByPk(apt.tenantId);
      if (tenant?.email) {
        try { await sendMail({ to: tenant.email, subject: title || 'Rent Reminder', text: message || 'Your rent is due.' }); } catch {}
      }
      count++;
    }
  }
  res.json({ sent: count });
});

module.exports = router;
