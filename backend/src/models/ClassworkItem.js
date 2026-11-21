const mongoose = require('mongoose');

const classworkSchema = new mongoose.Schema({
  classroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['topic', 'assignment', 'quiz', 'material'], required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  topic: { type: String, default: '' },
  dueDate: { type: Date },
  points: { type: Number, default: 0 },
  attachments: [{ name: String, url: String }],
  submissions: [{
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    studentName: { type: String },
    submittedAt: { type: Date, default: Date.now },
    content: { type: String },
    marks: { type: Number },
    feedback: { type: String },
  }],
}, { timestamps: true });

module.exports = mongoose.model('ClassworkItem', classworkSchema);