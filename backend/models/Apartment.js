const mongoose = require('mongoose');

const ApartmentSchema = new mongoose.Schema({
  number: String,
  estate: { type: mongoose.Schema.Types.ObjectId, ref: 'Estate' },
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  rent: Number,
  deposit: Number
});

module.exports = mongoose.model('Apartment', ApartmentSchema);