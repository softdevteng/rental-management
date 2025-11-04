const express = require('express');
const router = express.Router();
const { models, Sequelize } = require('../db');
const auth = require('../middleware/auth');
const axios = require('axios');

// Helpers for M-Pesa Daraja
function normalizeMsisdn(phone) {
  let msisdn = String(phone || '').replace(/\D/g, '');
  if (msisdn.startsWith('0')) msisdn = '254' + msisdn.slice(1);
  else if (msisdn.startsWith('7') && msisdn.length === 9) msisdn = '254' + msisdn;
  else if (msisdn.startsWith('+254')) msisdn = msisdn.replace('+', '');
  return msisdn;
}

async function getAccessToken() {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  const env = (process.env.MPESA_ENV || 'sandbox').toLowerCase();
  const url = env === 'production'
    ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
    : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
  const { data } = await axios.get(url, { auth: { username: key, password: secret } });
  return data.access_token;
}

function lnmPassword(shortcode, passkey) {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0,14);
  const raw = `${shortcode}${passkey}${timestamp}`;
  return { password: Buffer.from(raw).toString('base64'), timestamp };
}

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

// Landlord: initiate M-Pesa STK push for an apartment (landlord or caretaker)
router.post('/payments/mpesa/initiate', auth, async (req, res) => {
  if (!['landlord','caretaker'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const { apartmentId, amount, phone } = req.body;
  if (!apartmentId || !amount || !phone) return res.status(400).json({ error: 'apartmentId, amount and phone required' });
  // Verify scope: landlord owns the estate/apartment or caretaker assigned
  const apt = await models.Apartment.findByPk(apartmentId, { include: [models.Estate] });
  if (!apt) return res.status(404).json({ error: 'Apartment not found' });
  if (req.user.role === 'landlord') {
    const est = await models.Estate.findByPk(apt.estateId);
    if (!est || String(est.landlordId) !== String(req.user.refId)) return res.status(403).json({ error: 'Not your apartment' });
  } else if (req.user.role === 'caretaker') {
    const me = await models.Caretaker.findByPk(req.user.refId);
    if (!me) return res.status(403).json({ error: 'Forbidden' });
    // caretakers can only operate on their assigned apartment or estate
    const ok = (me.apartmentId && String(me.apartmentId) === String(apt.id)) || (me.estateId && String(me.estateId) === String(apt.estateId));
    if (!ok) return res.status(403).json({ error: 'Not allowed for this apartment' });
  }

  // Normalize phone and create payment record
  const mpesaPhone = normalizeMsisdn(phone);
  const payment = await models.Payment.create({ tenantId: apt.tenantId || null, apartmentId: apt.id, amount, date: new Date(), status: 'pending', method: 'mpesa', mpesaPhone });

  try {
    const token = await getAccessToken();
    const shortcode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;
    const { password, timestamp } = lnmPassword(shortcode, passkey);
    const env = (process.env.MPESA_ENV || 'sandbox').toLowerCase();
    const stkUrl = env === 'production'
      ? 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
      : 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';
    const payload = {
      BusinessShortCode: Number(shortcode),
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Number(amount),
      PartyA: mpesaPhone,
      PartyB: Number(shortcode),
      PhoneNumber: mpesaPhone,
      CallBackURL: process.env.MPESA_CALLBACK_URL,
      AccountReference: `APT-${apt.id}`,
      TransactionDesc: `Rent payment for apartment ${apt.id}`,
    };
    const darajaRes = await axios.post(stkUrl, payload, { headers: { Authorization: `Bearer ${token}` } });
    const data = darajaRes.data || {};
    // Store checkout/merchant request ids if present
    const checkoutRequestId = data.CheckoutRequestID || data.checkoutRequestID || null;
    const merchantRequestId = data.MerchantRequestID || data.merchantRequestID || null;
    await payment.update({ mpesaCheckoutRequestId: checkoutRequestId, mpesaMerchantRequestId: merchantRequestId });
    res.status(201).json({ message: 'STK push initiated', paymentId: payment.id, checkoutRequestId, raw: data });
  } catch (err) {
    // Keep payment as pending and return error
    res.status(502).json({ error: 'Daraja STK initiation failed', details: err.response?.data || err.message });
  }
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

// Generate a unique tenant code for an apartment (landlord only)
router.post('/tenants/generate-code', auth, async (req, res) => {
  if (req.user.role !== 'landlord') return res.status(403).json({ error: 'Forbidden' });
  const { apartmentId } = req.body || {};
  if (!apartmentId) return res.status(400).json({ error: 'apartmentId required' });
  const apt = await models.Apartment.findByPk(apartmentId, { include: [models.Estate] });
  if (!apt) return res.status(404).json({ error: 'Apartment not found' });
  // ensure landlord owns the estate
  const est = await models.Estate.findByPk(apt.estateId);
  if (!est || String(est.landlordId) !== String(req.user.refId)) return res.status(403).json({ error: 'Not your apartment' });

  // Compute prefix similar to client makeTenantCode
  const base = String(apt.number || apt.name || '').trim();
  const words = base.split(/\s+/).filter(Boolean);
  let prefix = '';
  if (words.length === 0) prefix = (String(base).slice(0,2) || 'TN').toUpperCase();
  else if (words.length === 1) prefix = (words[0].slice(0,2)).toUpperCase();
  else prefix = (words[0][0] + words[1][0]).toUpperCase();

  // Find existing tenant codes starting with prefix and compute next sequence
  // Use a transaction to reduce race window
  const sequelize = require('../db').sequelize;
  try {
    const next = await sequelize.transaction(async (tx) => {
      const { QueryTypes } = require('sequelize');
      // Count tenant codes starting with prefix
      const rows = await sequelize.query(
        "SELECT tenantCode FROM Tenants WHERE tenantCode LIKE :p",
        { replacements: { p: `${prefix}%` }, type: QueryTypes.SELECT, transaction: tx }
      );
      const seq = (rows || []).length + 1;
      const code = `${prefix}${String(seq).padStart(3, '0')}`;
      // Ensure uniqueness - if exists, bump until free (rare)
      let final = code; let i = seq;
      const existing = new Set((rows||[]).map(r => String(r.tenantCode || '')));
      while (existing.has(final)) { i++; final = `${prefix}${String(i).padStart(3,'0')}`; }
      return final;
    });
    res.json({ tenantCode: next });
  } catch (err) {
    console.error('generate-code error', err);
    res.status(500).json({ error: 'Could not generate tenant code' });
  }
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
