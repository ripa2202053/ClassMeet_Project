const { Quiz, QuizResult } = require('../models/Quiz');

const detectAI = (text) => {
  if (!text || text.length < 10) return 0;

  let score = 0;

  const aiPhrases = [
    'furthermore', 'moreover', 'in conclusion', 'it is important to note',
    'in summary', 'to summarize', 'in addition', 'it should be noted',
    'as mentioned above', 'in this regard', 'with respect to',
    'it is worth noting', 'in terms of', 'as a result',
    'consequently', 'therefore', 'thus', 'hence',
    'nevertheless', 'nonetheless', 'in contrast',
    'on the other hand', 'for instance', 'for example',
    'in order to', 'due to the fact', 'it can be seen'
  ];

  const lowerText = text.toLowerCase();
  let phraseCount = 0;
  aiPhrases.forEach(phrase => {
    if (lowerText.includes(phrase)) phraseCount++;
  });
  score += Math.min(phraseCount * 10, 40);

  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length > 0) {
    const avgLength = text.length / sentences.length;
    if (avgLength > 100) score += 20;
    else if (avgLength > 70) score += 10;
  }

  const words = text.split(' ');
  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  const diversityRatio = uniqueWords.size / words.length;
  if (diversityRatio > 0.8) score += 15;

  const typoPattern = /[a-z]{2,}[A-Z]|[A-Z]{2,}[a-z]/g;
  const typos = text.match(typoPattern);
  if (!typos || typos.length === 0) score += 10;

  const informalWords = ["gonna", "wanna", "gotta", "yeah", "nope", "ok", "lol", "btw", "tbh"];
  const hasInformal = informalWords.some(w => lowerText.includes(w));
  if (!hasInformal) score += 15;

  return Math.min(score, 100);
};

const createQuiz = async (req, res) => {
  try {
    const { roomId, title, questions, timeLimit } = req.body;
    const quiz = await Quiz.create({
      room: roomId,
      teacher: req.user._id,
      title,
      questions,
      timeLimit: timeLimit || 10
    });
    res.status(201).json(quiz);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const startQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    quiz.isActive = true;
    await quiz.save();
    res.json(quiz);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getActiveQuiz = async (req, res) => {
  try {
    const { roomId } = req.params;
    const quiz = await Quiz.findOne({ room: roomId, isActive: true });
    if (!quiz) return res.status(404).json({ message: 'No active quiz' });
    res.json(quiz);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const submitQuiz = async (req, res) => {
  try {
    const { quizId, answers, tabSwitchCount, autoSubmitted } = req.body;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    let totalScore = 0;
    let totalAiScore = 0;
    const processedAnswers = [];
    let writtenCount = 0;

    for (let i = 0; i < answers.length; i++) {
      const answer = answers[i];
      const question = quiz.questions[i];

      let isCorrect = false;
      let aiScore = 0;

      if (question.questionType === 'mcq') {
        isCorrect = answer.answer === question.correctAnswer;
        if (isCorrect) totalScore++;
      } else if (question.questionType === 'written') {
        aiScore = detectAI(answer.answer);
        totalAiScore += aiScore;
        writtenCount++;
      }

      processedAnswers.push({
        question: question.question,
        answer: answer.answer,
        isCorrect,
        aiDetectionScore: aiScore
      });
    }

    const avgAiScore = writtenCount > 0 ? Math.round(totalAiScore / writtenCount) : 0;

    const result = await QuizResult.create({
      quiz: quizId,
      student: req.user._id,
      answers: processedAnswers,
      totalScore,
      tabSwitchCount: tabSwitchCount || 0,
      autoSubmitted: autoSubmitted || false,
      aiPercentage: avgAiScore
    });

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getQuizResults = async (req, res) => {
  try {
    const { quizId } = req.params;
    const results = await QuizResult.find({ quiz: quizId })
      .populate('student', 'name email');
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getRoomQuizzes = async (req, res) => {
  try {
    const { roomId } = req.params;
    const quizzes = await Quiz.find({ room: roomId })
      .sort({ createdAt: -1 });
    res.json(quizzes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createQuiz, startQuiz, getActiveQuiz, submitQuiz, getQuizResults, getRoomQuizzes };