const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['tenant', 'landlord'], required: true },
  // Use refModel so we can map lowercase role -> proper Mongoose model name
  refModel: { type: String, enum: ['Tenant', 'Landlord'] },
  ref: { type: mongoose.Schema.Types.ObjectId, refPath: 'refModel' },
  // Password reset support
  passwordResetToken: { type: String },
  passwordResetExpires: { type: Date }
});

UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

UserSchema.methods.comparePassword = function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);