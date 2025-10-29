/**
 * Minimal MPESA Daraja sandbox helpers for initiating STK push and verifying callbacks.
 * This is intentionally minimal and mocks parts of the flow for local/dev testing.
 */
const axios = require('axios');

const DARARAJA_BASE = process.env.MPESA_BASE_URL || 'https://sandbox.safaricom.co.ke';
const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY || '';
const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET || '';
const FORCE_MOCK = process.env.NODE_ENV === 'test' || String(process.env.MPESA_MOCK || '').toLowerCase() === 'true';

async function getAccessToken() {
  if (!CONSUMER_KEY || !CONSUMER_SECRET) return null; // caller should fallback to mock
  const url = `${DARARAJA_BASE}/oauth/v1/generate?grant_type=client_credentials`;
  const token = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
  const res = await axios.get(url, { headers: { Authorization: `Basic ${token}` } });
  return res.data.access_token;
}

async function initiateSTKPush({ amount, phone, accountReference = 'Rent', description = 'Rent Payment' }) {
  // In sandbox/test mode, return a mocked response when creds are missing or when forced mock is set.
  if (FORCE_MOCK || !CONSUMER_KEY || !CONSUMER_SECRET) {
    return {
      CheckoutRequestID: 'MOCK_CHK_' + Date.now(),
      MerchantRequestID: 'MOCK_MER_' + Math.floor(Math.random()*1000000),
      ResponseDescription: 'Success. Request accepted for processing',
    };
  }
  const token = await getAccessToken();
  const url = `${DARARAJA_BASE}/mpesa/stkpush/v1/processrequest`;
  const payload = {
    BusinessShortCode: process.env.MPESA_SHORTCODE,
    Password: process.env.MPESA_PASSWORD,
    Timestamp: new Date().toISOString().replace(/[^0-9]/g, '').slice(0,14),
    TransactionType: 'CustomerPayBillOnline',
    Amount: amount,
    PartyA: phone,
    PartyB: process.env.MPESA_SHORTCODE,
    PhoneNumber: phone,
    CallBackURL: process.env.MPESA_CALLBACK_URL || `${process.env.BASE_URL || ''}/api/payments/mpesa/callback`,
    AccountReference: accountReference,
    TransactionDesc: description,
  };
  const res = await axios.post(url, payload, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}

module.exports = { getAccessToken, initiateSTKPush };
