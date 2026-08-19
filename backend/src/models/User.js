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
  }
}, { timestamps: true });

userSchema.methods.matchPassword = async function(enteredPassword) {
  if (!enteredPassword || !this.password) return false;
  const bcrypt = require('bcryptjs');
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);