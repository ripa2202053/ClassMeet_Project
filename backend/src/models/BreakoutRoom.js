const mongoose = require('mongoose');

const breakoutRoomSchema = new mongoose.Schema({
  mainRoom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  duration: {
    type: Number,
    default: 15
  },
  endTime: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('BreakoutRoom', breakoutRoomSchema);