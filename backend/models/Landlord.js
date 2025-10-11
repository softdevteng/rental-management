const mongoose = require('mongoose');

const LandlordSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  phone: String,
  estates: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Estate' }],
  notices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Notice' }]
});

module.exports = mongoose.model('Landlord', LandlordSchema);