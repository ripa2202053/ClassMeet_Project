const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  roomCode: {
    type: String,
    unique: true
  },
  isActive: {
    type: Boolean,
    default: false
  },
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number,
    default: 60
  },
  subject: { type: String, default: '' },
  section: { type: String, default: '' },
  archived: { type: Boolean, default: false },
  joinLink: {
    type: String,
  },
  roomSettings: {
    type: Object,
    default: {},
  },
  exemptedStudents: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
}, { timestamps: true });

roomSchema.pre('save', function() {
  if (!this.roomCode) {
    this.roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  if (!this.joinLink) {
    const base = process.env.FRONTEND_URL || 'http://localhost:3000';
    this.joinLink = `${base}/join/${this.roomCode}`;
  }
});

module.exports = mongoose.model('Room', roomSchema);