import React, { useState } from 'react';
import axios from 'axios';

// socket এবং roomId props হিসেবে নেওয়া হচ্ছে
const QuizCreator = ({ roomId, socket, onQuizCreated }) => {
  const [title, setTitle] = useState('');
  const [timeLimit, setTimeLimit] = useState(10);
  const [isCustomTime, setIsCustomTime] = useState(false);
  const [questions, setQuestions] = useState([
    { question: '', questionType: 'mcq', options: ['', '', '', ''], correctAnswer: '' }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addQuestion = () => {
    setQuestions([...questions, {
      question: '',
      questionType: 'mcq',
      options: ['', '', '', ''],
      correctAnswer: ''
    }]);
  };

  const removeQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index, field, value) => {
    const updated = [...questions];
    updated[index][field] = value;
    if (field === 'questionType' && value === 'written') {
      updated[index].options = [];
      updated[index].correctAnswer = '';
    }
    if (field === 'questionType' && value === 'mcq') {
      updated[index].options = ['', '', '', ''];
    }
    setQuestions(updated);
  };

  const updateOption = (qIndex, oIndex, value) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex] = value;
    setQuestions(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = JSON.parse(localStorage.getItem('user'));

      // ── Quiz create করো ──
      const { data } = await axios.post(
        'http://localhost:5000/api/quiz/create',
        { roomId, title, questions, timeLimit },
        { headers: { authorization: `Bearer ${user.token}` } }
      );

      // ── Quiz start করো ──
      const startRes = await axios.put(
        `http://localhost:5000/api/quiz/start/${data._id}`,
        {},
        { headers: { authorization: `Bearer ${user.token}` } }
      );

      const quizData = startRes.data;

      // ── Socket দিয়ে সব student কে notification পাঠাও ──
      if (socket) {
        socket.emit('quiz-started', {
          roomId,
          quiz: quizData,
        });
      }

      onQuizCreated(quizData);

      // form reset
      setTitle('');
      setTimeLimit(10);
      setIsCustomTime(false);
      setQuestions([{ question: '', questionType: 'mcq', options: ['', '', '', ''], correctAnswer: '' }]);

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create quiz');
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>📝 Create Quiz</h3>
      {error && <p style={styles.error}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <div style={styles.row}>
          <input
            style={styles.input}
            type="text"
            placeholder="Quiz Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <select
            style={styles.select}
            value={isCustomTime ? 'custom' : timeLimit}
            onChange={(e) => {
              if (e.target.value === 'custom') {
                setIsCustomTime(true);
                setTimeLimit('');
              } else {
                setIsCustomTime(false);
                setTimeLimit(Number(e.target.value));
              }
            }}
          >
            <option value={5}>5 min</option>
            <option value={10}>10 min</option>
            <option value={15}>15 min</option>
            <option value={20}>20 min</option>
            <option value={30}>30 min</option>
            <option value={45}>45 min</option>
            <option value={60}>60 min</option>
            <option value="custom">⚙️ Custom...</option>
          </select>
          {isCustomTime && (
            <input
              style={styles.select}
              type="number"
              placeholder="Minutes"
              min="1"
              value={timeLimit}
              onChange={(e) => setTimeLimit(Number(e.target.value))}
              required
            />
          )}
        </div>

        {questions.map((q, qIndex) => (
          <div key={qIndex} style={styles.questionCard}>
            <div style={styles.questionHeader}>
              <span style={styles.questionNum}>Q{qIndex + 1}</span>
              <select
                style={styles.typeSelect}
                value={q.questionType}
                onChange={(e) => updateQuestion(qIndex, 'questionType', e.target.value)}
              >
                <option value="mcq">MCQ</option>
                <option value="written">Written</option>
              </select>
              {questions.length > 1 && (
                <button
                  type="button"
                  style={styles.removeBtn}
                  onClick={() => removeQuestion(qIndex)}
                >✕</button>
              )}
            </div>

            <input
              style={styles.input}
              type="text"
              placeholder="Question"
              value={q.question}
              onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
              required
            />

            {q.questionType === 'mcq' && (
              <div style={styles.options}>
                {q.options.map((opt, oIndex) => (
                  <div key={oIndex} style={styles.optionRow}>
                    <input
                      style={styles.radio}
                      type="radio"
                      name={`correct_${qIndex}`}
                      checked={q.correctAnswer === opt && opt !== ''}
                      onChange={() => updateQuestion(qIndex, 'correctAnswer', opt)}
                    />
                    <input
                      style={styles.optionInput}
                      type="text"
                      placeholder={`Option ${oIndex + 1}`}
                      value={opt}
                      onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                      required
                    />
                  </div>
                ))}
                <p style={styles.hint}>Select the correct answer using radio button</p>
              </div>
            )}

            {q.questionType === 'written' && (
              <p style={styles.writtenHint}>
                🤖 AI Detection will analyze student answers
              </p>
            )}
          </div>
        ))}

        <button type="button" style={styles.addBtn} onClick={addQuestion}>
          + Add Question
        </button>

        <button type="submit" style={styles.submitBtn} disabled={loading}>
          {loading ? 'Creating...' : '🚀 Start Quiz'}
        </button>
      </form>
    </div>
  );
};

const styles = {
  container: { backgroundColor: '#0d1b2a', border: '1px solid #00d4ff', borderRadius: '10px', padding: '20px', marginTop: '15px' },
  title: { color: '#00d4ff', margin: '0 0 15px 0' },
  error: { color: '#ff4444', marginBottom: '10px' },
  row: { display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' },
  input: { flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #00d4ff', backgroundColor: '#0a0e1a', color: '#ffffff', fontSize: '14px' },
  select: { padding: '10px', borderRadius: '5px', border: '1px solid #00d4ff', backgroundColor: '#0a0e1a', color: '#00d4ff', fontSize: '14px' },
  questionCard: { backgroundColor: '#0a0e1a', border: '1px solid #1a3a5c', borderRadius: '8px', padding: '15px', marginBottom: '10px' },
  questionHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' },
  questionNum: { color: '#00d4ff', fontWeight: 'bold', fontSize: '16px' },
  typeSelect: { padding: '5px', borderRadius: '5px', border: '1px solid #00d4ff', backgroundColor: '#0d1b2a', color: '#00d4ff', fontSize: '12px' },
  removeBtn: { marginLeft: 'auto', padding: '3px 8px', backgroundColor: '#ff4444', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' },
  options: { marginTop: '10px' },
  optionRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' },
  radio: { accentColor: '#00d4ff', width: '16px', height: '16px' },
  optionInput: { flex: 1, padding: '8px', borderRadius: '5px', border: '1px solid #1a3a5c', backgroundColor: '#0d1b2a', color: '#ffffff', fontSize: '14px' },
  hint: { color: '#7ecfff', fontSize: '11px', margin: '5px 0 0 0' },
  writtenHint: { color: '#00d4ff', fontSize: '12px', margin: '10px 0 0 0', fontStyle: 'italic' },
  addBtn: { width: '100%', padding: '10px', backgroundColor: '#1a3a5c', color: '#00d4ff', border: '1px solid #00d4ff', borderRadius: '5px', cursor: 'pointer', marginBottom: '10px', fontSize: '14px' },
  submitBtn: { width: '100%', padding: '12px', backgroundColor: '#00d4ff', color: '#0a0e1a', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' },
};

export default QuizCreator;