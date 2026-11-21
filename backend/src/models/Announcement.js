const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  classroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  attachments: [{ name: String, url: String }],
  pinned: { type: Boolean, default: false },
  comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

module.exports = mongoose.model('Announcement', announcementSchema);