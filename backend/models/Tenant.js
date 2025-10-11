const mongoose = require('mongoose');

const TenantSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  phone: String,
  apartment: { type: mongoose.Schema.Types.ObjectId, ref: 'Apartment' },
  paymentHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Payment' }],
  tickets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Ticket' }],
  vacateNotice: {
    dateGiven: Date,
    status: { type: String, enum: ['none', 'pending', 'approved'], default: 'none' }
  },
  depositRefunded: { type: Boolean, default: false }
});

module.exports = mongoose.model('Tenant', TenantSchema);