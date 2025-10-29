const express = require('express');
const router = express.Router();
const { models } = require('../db');
const auth = require('../middleware/auth');
const { sendMail } = require('../utils/mailer');
const { authorize, checkCaretakerScope, ROLES } = require('../middleware/rbac');
const { initiateSTKPush } = require('../utils/mpesa');
const { generateReceipt } = require('../utils/receipts');
const { initSSE, publish } = require('../utils/stream');
const path = require('path');
const fs = require('fs');

// Create payment (landlord or caretaker with scope)
router.post('/', auth, authorize([ROLES.LANDLORD, ROLES.CARETAKER]), async (req, res) => {
  const { tenant, apartment, amount, date } = req.body;
  if (!tenant || !apartment || !amount) return res.status(400).json({ error: 'tenant, apartment, amount required' });
  // Scope check for caretaker: must belong to their assigned estate/apartment
  if (req.user.role === ROLES.CARETAKER) {
    const ok = await checkCaretakerScope(req, apartment);
    if (!ok) return res.status(403).json({ error: 'Not allowed for this apartment' });
  }
  const payment = await models.Payment.create({ tenantId: tenant, apartmentId: apartment, amount, date: date || new Date(), status: 'pending' });
  res.status(201).json(payment);
});

// Update payment status (landlord or caretaker with scope)
router.put('/:id', auth, async (req, res) => {
  if (![ROLES.LANDLORD, ROLES.CARETAKER].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const payment = await models.Payment.findByPk(req.params.id);
  if (!payment) return res.status(404).json({ error: 'Not found' });
  if (req.user.role === 'caretaker') {
    const me = await models.Caretaker.findByPk(req.user.refId);
    if (!me) return res.status(403).json({ error: 'Forbidden' });
    const apt = await models.Apartment.findByPk(payment.apartmentId);
    if (!apt) return res.status(404).json({ error: 'Apartment not found' });
    const est = await models.Estate.findByPk(apt.estateId);
    const allowed = (me.apartmentId && String(me.apartmentId) === String(apt.id)) || (me.estateId && est && String(me.estateId) === String(est.id));
    if (!allowed) return res.status(403).json({ error: 'Not allowed for this apartment' });
  }
  const prevStatus = payment.status;
  await payment.update(req.body);
  // If moved to paid, generate receipt and notify landlord/caretaker
  if (prevStatus !== 'paid' && payment.status === 'paid') {
    try {
      const tenant = await models.Tenant.findByPk(payment.tenantId);
      // Try to find landlord via apartment -> estate -> landlord
      let landlord = null;
      if (payment.apartmentId) {
        const apt = await models.Apartment.findByPk(payment.apartmentId);
        if (apt) {
          const estate = await models.Estate.findByPk(apt.estateId);
          if (estate) landlord = await models.Landlord.findByPk(estate.landlordId);
        }
      }
      const { receipt, path, pdfPath } = generateReceipt(payment, tenant, landlord);
      // prepare attachments if pdf exists on disk
      let attachments = [];
      try {
        if (pdfPath) {
          const abs = path ? path : null;
          // pdfPath is a URL path like /uploads/receipts/RCPT-...pdf; map to disk
          const pdfDisk = require('path').join(__dirname, '..', pdfPath.replace(/^\//, ''));
          if (fs.existsSync(pdfDisk)) attachments.push({ filename: `${receipt.id}.pdf`, path: pdfDisk });
        }
      } catch (e) { attachments = []; }
      // send email to tenant and landlord/caretaker
      if (tenant?.email) {
        try { await sendMail({ to: tenant.email, subject: 'Payment Receipt', text: `Your payment of ${payment.amount} was received.`, attachments }); } catch (e) {}
      }
      if (landlord?.email) {
        try { await sendMail({ to: landlord.email, subject: 'Tenant Payment Received', text: `Payment of ${payment.amount} received for tenant ${tenant?.name || tenant?.email}.`, attachments }); } catch (e) {}
      }
    } catch (err) {
      console.error('Receipt generation/notify error', err.message || err);
    }
    // publish SSE event for payment update
    try { publish('payment:update', { id: payment.id, status: payment.status }); } catch (e) {}
  }
  res.json(payment);
});

// Tenant: initiate M-Pesa STK push (mock)
router.post('/mpesa/initiate', auth, authorize([ROLES.TENANT]), async (req, res) => {
  const { amount, phone } = req.body;
  if (!amount || !phone) return res.status(400).json({ error: 'Amount and phone required' });
  const tenant = await models.Tenant.findByPk(req.user.refId, { include: [models.Apartment] });
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
  // create payment record pending
  const payment = await models.Payment.create({
    tenantId: tenant.id,
    apartmentId: tenant?.Apartment?.id || null,
    amount,
    date: new Date(),
    status: 'pending',
    method: 'mpesa',
    mpesaPhone: phone,
  });
  // Initiate STK Push via helper (may return mock in sandbox)
  try {
    const resp = await initiateSTKPush({ amount, phone, accountReference: `Rent-${payment.id}`, description: `Rent payment #${payment.id}` });
    // Save checkout/merchant ids when present
    await payment.update({
      mpesaCheckoutRequestId: resp.CheckoutRequestID || resp.CheckoutRequestId || payment.mpesaCheckoutRequestId || null,
      mpesaMerchantRequestId: resp.MerchantRequestID || resp.MerchantRequestId || payment.mpesaMerchantRequestId || null,
    });
    res.status(201).json({ message: 'STK push initiated', paymentId: payment.id, checkout: resp });
  } catch (err) {
    console.error('MPESA initiate error', err.message || err);
    res.status(500).json({ error: 'Failed to initiate MPESA push' });
  }
});

// Tenant: mock-complete M-Pesa payment (simulate callback)
router.post('/mpesa/complete', auth, async (req, res) => {
  if (req.user.role !== ROLES.TENANT) return res.status(403).json({ error: 'Forbidden' });
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

// MPesa callback (Daraja) - public endpoint (Safaricom will POST here)
router.post('/mpesa/callback', async (req, res) => {
  try {
    // Optional signature verification
    const secret = process.env.MPESA_CALLBACK_SECRET;
    if (secret) {
      try {
        const sigHeader = (req.header('x-callback-signature') || req.header('x-mpesa-signature') || '').toString();
        const crypto = require('crypto');
        const payload = req.rawBody && req.rawBody.length ? req.rawBody : Buffer.from(JSON.stringify(req.body || {}));
        const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
        if (!sigHeader || sigHeader !== expected) {
          console.warn('MPESA callback signature mismatch', { got: sigHeader, expected: expected ? '[redacted]' : null });
          return res.status(403).json({ error: 'Invalid signature' });
        }
      } catch (e) {
        console.warn('MPESA signature verification failed', e && e.message);
        return res.status(403).json({ error: 'Invalid signature' });
      }
    }
    const body = req.body || {};
    // Daraja wraps the result in Body.stkCallback for STK push responses
    const callback = body.Body && body.Body.stkCallback ? body.Body.stkCallback : (body.stkCallback || body);
    const checkoutRequestId = callback && (callback.CheckoutRequestID || callback.checkoutRequestID || (callback.Body && callback.Body.CheckoutRequestID));
    const resultCode = callback && (callback.ResultCode != null ? callback.ResultCode : callback.resultCode);
    const resultDesc = callback && (callback.ResultDesc || callback.resultDesc || (callback.ResultDesc && callback.ResultDesc[0]) || null);
    // Extract MpesaReceipt if present in CallbackMetadata
    let receipt = null;
    if (callback && callback.CallbackMetadata && Array.isArray(callback.CallbackMetadata.Item)) {
      const items = callback.CallbackMetadata.Item;
      const mpesaItem = items.find(i => (i.Name || i.name || '').toLowerCase().includes('mpesa') || (i.Name || '').toLowerCase() === 'mpesareceipt');
      if (mpesaItem) receipt = mpesaItem.Value || null;
    }
    if (!checkoutRequestId) {
      // Nothing to update
      return res.json({ ok: true });
    }
    const payment = await models.Payment.findOne({ where: { mpesaCheckoutRequestId: checkoutRequestId } });
    if (!payment) return res.json({ ok: true });
    const prevStatus = payment.status;
    const success = Number(resultCode) === 0 || String(resultCode) === '0';
    await payment.update({
      status: success ? 'paid' : 'pending',
      mpesaReceipt: receipt || (callback.MpesaReceiptNumber || callback.MpesaReceipt || null),
      mpesaResultCode: String(resultCode),
      mpesaResultDesc: resultDesc || JSON.stringify(callback),
    });

    // If the callback marks the payment as paid (and it wasn't paid before), generate receipt and notify
    if (prevStatus !== 'paid' && (success)) {
      try {
        const tenant = await models.Tenant.findByPk(payment.tenantId);
        let landlord = null;
        if (payment.apartmentId) {
          const apt = await models.Apartment.findByPk(payment.apartmentId);
          if (apt) {
            const estate = await models.Estate.findByPk(apt.estateId);
            if (estate) landlord = await models.Landlord.findByPk(estate.landlordId);
          }
        }
        const { receipt, path, pdfPath } = generateReceipt(payment, tenant, landlord);
        let attachments = [];
        try {
          if (pdfPath) {
            const pdfDisk = require('path').join(__dirname, '..', pdfPath.replace(/^\//, ''));
            if (fs.existsSync(pdfDisk)) attachments.push({ filename: `${receipt.id}.pdf`, path: pdfDisk });
          }
        } catch (e) { attachments = []; }
        if (tenant?.email) {
          try { await sendMail({ to: tenant.email, subject: 'Payment Receipt', text: `Your payment of ${payment.amount} was received.`, attachments }); } catch (e) {}
        }
        if (landlord?.email) {
          try { await sendMail({ to: landlord.email, subject: 'Tenant Payment Received', text: `Payment of ${payment.amount} received for tenant ${tenant?.name || tenant?.email}.`, attachments }); } catch (e) {}
        }
      } catch (err) {
        console.error('Receipt generation/notify error (callback)', err.message || err);
      }
      try { publish('payment:update', { id: payment.id, status: payment.status }); } catch (e) {}
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('MPESA callback error', err);
    res.status(500).json({ error: 'callback processing failed' });
  }
});

// SSE endpoint for payments: clients may listen to server-sent events
router.get('/stream', (req, res) => {
  try { initSSE(req, res); } catch (e) { res.status(500).end(); }
});


// Get payment status (authenticated). GET /api/payments/:id/status
router.get('/:id/status', auth, async (req, res) => {
  try {
    const payment = await models.Payment.findByPk(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    // tenant may only see their own payment
    if (req.user.role === ROLES.TENANT && String(payment.tenantId) !== String(req.user.refId)) return res.status(403).json({ error: 'Forbidden' });
    if (req.user.role === ROLES.CARETAKER) {
      const ok = await checkCaretakerScope(req, payment.apartmentId);
      if (!ok) return res.status(403).json({ error: 'Forbidden' });
    }
    return res.json({ id: payment.id, status: payment.status, mpesaReceipt: payment.mpesaReceipt, mpesaResultCode: payment.mpesaResultCode });
  } catch (err) {
    console.error('Payment status error', err.message || err);
    return res.status(500).json({ error: 'Failed to fetch status' });
  }
});

module.exports = router;

// Serve receipt JSON for a payment (authenticated)
// GET /api/payments/:id/receipt
router.get('/:id/receipt', auth, async (req, res) => {
  try {
    const payment = await models.Payment.findByPk(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    // tenancy: allow tenant for own payments, landlord/caretaker for scoped payments
    if (req.user.role === ROLES.TENANT && String(payment.tenantId) !== String(req.user.refId)) return res.status(403).json({ error: 'Forbidden' });
    if (req.user.role === ROLES.CARETAKER) {
      const ok = await checkCaretakerScope(req, payment.apartmentId);
      if (!ok) return res.status(403).json({ error: 'Forbidden' });
    }
    // Locate receipt file
    const receiptId = `RCPT-${payment.id}`;
    const dir = path.join(__dirname, '..', 'uploads', 'receipts');
    // attempt to find any file that starts with RCPT-<paymentId>
    const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
    const file = files.find(f => f.startsWith(receiptId));
    if (!file) return res.status(404).json({ error: 'Receipt not found' });
    return res.sendFile(path.join(dir, file));
  } catch (err) {
    console.error('Receipt serve error', err.message || err);
    return res.status(500).json({ error: 'Failed to serve receipt' });
  }
});
