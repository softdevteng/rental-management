const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  apartment: { type: mongoose.Schema.Types.ObjectId, ref: 'Apartment' },
  description: String,
  status: { type: String, enum: ['open', 'in-progress', 'closed'], default: 'open' },
  createdAt: { type: Date, default: Date.now },
  resolvedAt: Date
});

module.exports = mongoose.model('Ticket', TicketSchema);