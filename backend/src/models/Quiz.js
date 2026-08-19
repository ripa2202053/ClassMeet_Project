const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  questions: [
    {
      question: { type: String, required: true },
      options: [{ type: String }],
      correctAnswer: { type: String },
      questionType: {
        type: String,
        enum: ['mcq', 'written'],
        default: 'mcq'
      }
    }
  ],
  isActive: {
    type: Boolean,
    default: false
  },
  timeLimit: {
    type: Number,
    default: 10
  }
}, { timestamps: true });

const quizResultSchema = new mongoose.Schema({
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  answers: [
    {
      question: { type: String },
      answer: { type: String },
      isCorrect: { type: Boolean },
      aiDetectionScore: { type: Number, default: 0 }
    }
  ],
  totalScore: {
    type: Number,
    default: 0
  },
  tabSwitchCount: {
    type: Number,
    default: 0
  },
  autoSubmitted: {
    type: Boolean,
    default: false
  },
  aiPercentage: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

const Quiz = mongoose.model('Quiz', quizSchema);
const QuizResult = mongoose.model('QuizResult', quizResultSchema);

module.exports = { Quiz, QuizResult };