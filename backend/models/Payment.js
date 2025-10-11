const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  apartment: { type: mongoose.Schema.Types.ObjectId, ref: 'Apartment' },
  amount: Number,
  date: Date,
  status: { type: String, enum: ['pending', 'paid', 'late'], default: 'pending' }
});

module.exports = mongoose.model('Payment', PaymentSchema);