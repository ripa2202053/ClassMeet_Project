const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  joinTime: {
    type: Date
  },
  leaveTime: {
    type: Date
  },
  faceDetectedTime: {
    type: Number,
    default: 0
  },
  totalClassTime: {
    type: Number,
    default: 0
  },
  isPresent: {
    type: Boolean,
    default: false
  },
  muteCount: {
    type: Number,
    default: 0
  },
  unmuteCount: {
    type: Number,
    default: 0
  },
  chatCount: {
    type: Number,
    default: 0
  },
  reactCount: {
    type: Number,
    default: 0
  },
  cameraOffCount: {
    type: Number,
    default: 0
  },
  dominantEmotion: {
    type: String,
    default: 'neutral'
  },
  isSuspicious: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Attendance', attendanceSchema);