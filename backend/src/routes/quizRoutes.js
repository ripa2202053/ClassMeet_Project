const express = require('express');
const router = express.Router();
const {
  createQuiz,
  startQuiz,
  getActiveQuiz,
  submitQuiz,
  getQuizResults,
  getRoomQuizzes
} = require('../controllers/quizController');
const { protect, teacherOnly } = require('../middleware/authMiddleware');

router.post('/create', protect, teacherOnly, createQuiz);
router.put('/start/:id', protect, teacherOnly, startQuiz);
router.get('/active/:roomId', protect, getActiveQuiz);
router.post('/submit', protect, submitQuiz);
router.get('/results/:quizId', protect, teacherOnly, getQuizResults);
router.get('/room/:roomId', protect, getRoomQuizzes);

module.exports = router;