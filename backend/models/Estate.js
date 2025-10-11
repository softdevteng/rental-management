const mongoose = require('mongoose');

const EstateSchema = new mongoose.Schema({
  name: String,
  address: String,
  apartments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Apartment' }],
  landlord: { type: mongoose.Schema.Types.ObjectId, ref: 'Landlord' }
});

module.exports = mongoose.model('Estate', EstateSchema);