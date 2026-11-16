const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false },
  googleId: { type: String },
  role: {
    type: String,
    enum: ['teacher', 'student'],
    default: 'student'
  },
  resetPasswordOtp: { type: String },
  resetPasswordExpires: { type: Date }
}, { timestamps: true });

userSchema.methods.matchPassword = async function(enteredPassword) {
  if (!enteredPassword || !this.password) return false;
  try {
    const bcrypt = require('bcryptjs');
    return await bcrypt.compare(enteredPassword, this.password);
  } catch (err) {
    console.error('Password compare error:', err);
    return false;
  }
};

module.exports = mongoose.model('User', userSchema);