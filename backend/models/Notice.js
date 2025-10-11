const mongoose = require('mongoose');

const NoticeSchema = new mongoose.Schema({
  landlord: { type: mongoose.Schema.Types.ObjectId, ref: 'Landlord' },
  estate: { type: mongoose.Schema.Types.ObjectId, ref: 'Estate' },
  title: String,
  message: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notice', NoticeSchema);