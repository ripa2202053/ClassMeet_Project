import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const QuizTaker = ({ quiz, onSubmit, onClose }) => {
  const [phase, setPhase] = useState('notification'); // notification | quiz | result
  const [answers, setAnswers] = useState(
    quiz.questions.map(() => ({ answer: '' }))
  );
  const [timeLeft, setTimeLeft] = useState(quiz.timeLimit * 60);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);
  const submittedRef = useRef(false);

  // ── Timer & anti-cheat শুধু quiz phase এ চলবে ──────────────────
  useEffect(() => {
    if (phase !== 'quiz') return;

    const handleVisibility = () => {
      if (document.hidden && !submittedRef.current) {
        setTabSwitchCount(prev => {
          const next = prev + 1;
          handleAutoSubmit(true, next);
          return next;
        });
      }
    };
    const handleBlur = () => {
      if (!submittedRef.current) {
        setTabSwitchCount(prev => {
          const next = prev + 1;
          handleAutoSubmit(true, next);
          return next;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (!submittedRef.current) handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timerRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
    };
  }, [phase]);

  const handleAutoSubmit = async (isTabSwitch = false, switchCount = 0) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setAutoSubmitted(true);
    clearInterval(timerRef.current);
    await submitAnswers(isTabSwitch, switchCount);
  };

  const submitAnswers = async (isAutoSubmit = false, switchCount = 0) => {
    if (loading) return;
    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const { data } = await axios.post(
        'http://localhost:5000/api/quiz/submit',
        {
          quizId: quiz._id,
          answers,
          tabSwitchCount: switchCount || tabSwitchCount,
          autoSubmitted: isAutoSubmit,
        },
        { headers: { authorization: `Bearer ${user.token}` } }
      );
      setResult(data);
      setPhase('result');
      if (onSubmit) onSubmit(data);
    } catch (err) {
      console.error('Submit error:', err);
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submittedRef.current) return;
    submittedRef.current = true;
    clearInterval(timerRef.current);
    await submitAnswers(false, tabSwitchCount);
  };

  const formatTime = (s) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // ── NOTIFICATION SCREEN ──────────────────────────────────────────
  if (phase === 'notification') {
    return (
      <div style={styles.overlay}>
        <div style={styles.notifCard}>
          <div style={styles.notifIcon}>⚡</div>
          <h2 style={styles.notifTitle}>Quiz Started!</h2>
          <p style={styles.notifSub}>Your teacher has launched a quiz</p>

          <div style={styles.notifInfo}>
            <div style={styles.notifInfoItem}>
              <span style={styles.notifInfoVal}>{quiz.title}</span>
              <span style={styles.notifInfoLbl}>Quiz Title</span>
            </div>
            <div style={styles.notifInfoItem}>
              <span style={styles.notifInfoVal}>{quiz.questions.length}</span>
              <span style={styles.notifInfoLbl}>Questions</span>
            </div>
            <div style={styles.notifInfoItem}>
              <span style={styles.notifInfoVal}>{quiz.timeLimit}m</span>
              <span style={styles.notifInfoLbl}>Time Limit</span>
            </div>
          </div>

          <div style={styles.notifRules}>
            <div style={styles.notifRule}>⚠️ Tab switching will auto-submit your quiz</div>
            <div style={styles.notifRule}>⏱️ Timer starts when you click Start</div>
            <div style={styles.notifRule}>✅ Submit before time runs out</div>
          </div>

          <button
            style={styles.startBtn}
            onClick={() => setPhase('quiz')}
          >
            ▶ Start Quiz
          </button>
        </div>
      </div>
    );
  }

  // ── RESULT SCREEN ────────────────────────────────────────────────
  if (phase === 'result' && result) {
    return (
      <div style={styles.overlay}>
        <div style={styles.resultCard}>
          <div style={styles.resultIcon}>
            {result.autoSubmitted ? '⚠️' : '✅'}
          </div>
          <h3 style={styles.resultTitle}>
            {result.autoSubmitted ? 'Auto-Submitted!' : 'Quiz Submitted!'}
          </h3>

          <div style={styles.resultGrid}>
            <div style={styles.resultItem}>
              <span style={styles.resultValue}>{result.totalScore}</span>
              <span style={styles.resultLabel}>Score</span>
            </div>
            <div style={styles.resultItem}>
              <span style={{
                ...styles.resultValue,
                color: result.aiPercentage > 50 ? '#ff4444' : '#00ff88'
              }}>
                {result.aiPercentage}%
              </span>
              <span style={styles.resultLabel}>AI Detected</span>
            </div>
            <div style={styles.resultItem}>
              <span style={{
                ...styles.resultValue,
                color: result.tabSwitchCount > 0 ? '#ff4444' : '#00ff88'
              }}>
                {result.tabSwitchCount}
              </span>
              <span style={styles.resultLabel}>Tab Switches</span>
            </div>
            <div style={styles.resultItem}>
              <span style={{
                ...styles.resultValue,
                color: result.autoSubmitted ? '#ff4444' : '#00ff88'
              }}>
                {result.autoSubmitted ? 'Yes' : 'No'}
              </span>
              <span style={styles.resultLabel}>Auto Submit</span>
            </div>
          </div>

          {result.autoSubmitted && (
            <div style={styles.warningBox}>
              ⚠️ Auto-submitted due to tab switching!
            </div>
          )}
          {result.aiPercentage > 50 && (
            <div style={styles.aiWarningBox}>
              🤖 High AI usage detected ({result.aiPercentage}%)
            </div>
          )}

          {/* Live class এ ফিরে যাও */}
          <button style={styles.returnBtn} onClick={onClose}>
            ← Return to Live Class
          </button>
        </div>
      </div>
    );
  }

  // ── QUIZ SCREEN (fullscreen) ─────────────────────────────────────
  return (
    <div style={styles.fullscreen}>
      {/* Topbar */}
      <div style={styles.quizTop}>
        <div style={styles.quizTopLeft}>
          <span style={styles.quizTopTitle}>⚡ {quiz.title}</span>
          {tabSwitchCount > 0 && (
            <span style={styles.warnBadge}>
              ⚠️ {tabSwitchCount} tab switch{tabSwitchCount > 1 ? 'es' : ''}
            </span>
          )}
        </div>
        <div style={{
          ...styles.timerBox,
          background: timeLeft < 60 ? 'rgba(255,68,68,0.2)' : 'rgba(0,212,255,0.1)',
          borderColor: timeLeft < 60 ? '#ff4444' : '#00d4ff',
          color: timeLeft < 60 ? '#ff4444' : '#00d4ff',
        }}>
          ⏱ {formatTime(timeLeft)}
        </div>
      </div>

      {autoSubmitted && (
        <div style={styles.autoBar}>
          ⚠️ Tab switch detected — Quiz auto-submitted!
        </div>
      )}

      {/* Questions */}
      <div style={styles.quizBody}>
        <form onSubmit={handleSubmit}>
          {quiz.questions.map((q, qIndex) => (
            <div key={qIndex} style={styles.questionCard}>
              <p style={styles.question}>
                <span style={styles.qNum}>Q{qIndex + 1}.</span> {q.question}
                {q.questionType === 'written' && (
                  <span style={styles.writtenBadge}>Written</span>
                )}
              </p>

              {q.questionType === 'mcq' && (
                <div style={styles.options}>
                  {q.options.map((opt, oIndex) => (
                    <label
                      key={oIndex}
                      style={{
                        ...styles.optionLabel,
                        borderColor: answers[qIndex].answer === opt ? '#00d4ff' : '#1a3a5c',
                        background: answers[qIndex].answer === opt ? 'rgba(0,212,255,0.1)' : '#0a0e1a',
                      }}
                    >
                      <input
                        type="radio"
                        name={`q_${qIndex}`}
                        value={opt}
                        checked={answers[qIndex].answer === opt}
                        onChange={() => {
                          const updated = [...answers];
                          updated[qIndex].answer = opt;
                          setAnswers(updated);
                        }}
                        style={styles.radio}
                      />
                      <span style={styles.optionKey}>
                        {String.fromCharCode(65 + oIndex)}
                      </span>
                      <span style={styles.optionText}>{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.questionType === 'written' && (
                <textarea
                  style={styles.textarea}
                  placeholder="Write your answer here..."
                  value={answers[qIndex].answer}
                  onChange={(e) => {
                    const updated = [...answers];
                    updated[qIndex].answer = e.target.value;
                    setAnswers(updated);
                  }}
                  rows={4}
                />
              )}
            </div>
          ))}

          <button
            type="submit"
            style={styles.submitBtn}
            disabled={loading}
          >
            {loading ? 'Submitting...' : '✅ Submit Quiz'}
          </button>
        </form>
      </div>
    </div>
  );
};

const styles = {
  // ── overlay (notification & result) ──
  overlay: {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(0,0,0,0.88)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '20px',
  },

  // ── notification card ──
  notifCard: {
    background: '#0d1b2a', border: '1px solid #00d4ff',
    borderRadius: '16px', padding: '36px', maxWidth: '460px', width: '100%',
    textAlign: 'center',
  },
  notifIcon: { fontSize: '52px', marginBottom: '12px' },
  notifTitle: { color: '#00d4ff', fontSize: '26px', fontWeight: '800', margin: '0 0 6px' },
  notifSub: { color: '#7ecfff', fontSize: '14px', marginBottom: '24px' },
  notifInfo: {
    display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '20px',
  },
  notifInfoItem: {
    background: 'rgba(0,212,255,0.07)', border: '1px solid rgba(0,212,255,0.15)',
    borderRadius: '10px', padding: '14px 8px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
  },
  notifInfoVal: { color: '#fff', fontSize: '20px', fontWeight: '700' },
  notifInfoLbl: { color: '#7ecfff', fontSize: '11px' },
  notifRules: {
    background: 'rgba(255,68,68,0.07)', border: '1px solid rgba(255,68,68,0.2)',
    borderRadius: '10px', padding: '14px', marginBottom: '24px', textAlign: 'left',
    display: 'flex', flexDirection: 'column', gap: '8px',
  },
  notifRule: { color: 'rgba(255,200,200,0.8)', fontSize: '13px' },
  startBtn: {
    width: '100%', padding: '14px', borderRadius: '10px',
    background: 'linear-gradient(135deg,#00d4ff,#0099cc)',
    border: 'none', color: '#0a0e1a', fontSize: '16px', fontWeight: '700',
    cursor: 'pointer',
  },

  // ── fullscreen quiz ──
  fullscreen: {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: '#04080F', display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  quizTop: {
    height: '60px', flexShrink: 0,
    background: 'rgba(8,14,26,0.95)', borderBottom: '1px solid rgba(0,212,255,0.15)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 28px',
  },
  quizTopLeft: { display: 'flex', alignItems: 'center', gap: '14px' },
  quizTopTitle: { color: '#fff', fontSize: '16px', fontWeight: '700' },
  warnBadge: {
    background: 'rgba(255,68,68,0.15)', border: '1px solid rgba(255,68,68,0.3)',
    color: '#ff6060', fontSize: '12px', padding: '4px 10px', borderRadius: '6px',
  },
  timerBox: {
    padding: '8px 18px', borderRadius: '8px', border: '1px solid',
    fontSize: '18px', fontWeight: '700', fontFamily: 'monospace',
    transition: 'all 0.3s',
  },
  autoBar: {
    background: '#ff4444', color: '#fff', padding: '10px',
    textAlign: 'center', fontWeight: '700', fontSize: '14px',
  },
  quizBody: {
    flex: 1, overflowY: 'auto', padding: '28px 40px', maxWidth: '760px',
    margin: '0 auto', width: '100%',
  },
  questionCard: {
    background: '#0d1b2a', border: '1px solid #1a3a5c',
    borderRadius: '12px', padding: '20px', marginBottom: '16px',
  },
  question: { color: '#fff', fontSize: '16px', marginBottom: '16px', lineHeight: '1.5' },
  qNum: { color: '#00d4ff', fontWeight: '700', marginRight: '6px' },
  writtenBadge: {
    background: '#1a3a5c', color: '#00d4ff', fontSize: '11px',
    padding: '2px 7px', borderRadius: '4px', marginLeft: '8px',
  },
  options: { display: 'flex', flexDirection: 'column', gap: '8px' },
  optionLabel: {
    display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer',
    padding: '12px 16px', borderRadius: '9px', border: '1px solid',
    transition: 'all 0.2s',
  },
  radio: { display: 'none' },
  optionKey: {
    width: '26px', height: '26px', borderRadius: '7px',
    background: 'rgba(255,255,255,0.07)', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.5)',
    flexShrink: 0,
  },
  optionText: { color: '#fff', fontSize: '14px' },
  textarea: {
    width: '100%', padding: '12px', borderRadius: '8px',
    border: '1px solid #00d4ff', background: '#0a0e1a',
    color: '#fff', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box',
  },
  submitBtn: {
    width: '100%', padding: '14px', borderRadius: '10px',
    background: 'linear-gradient(135deg,#00d4ff,#0099cc)',
    border: 'none', color: '#0a0e1a', fontSize: '16px',
    fontWeight: '700', cursor: 'pointer', marginTop: '8px',
  },

  // ── result card ──
  resultCard: {
    background: '#0d1b2a', border: '1px solid #00d4ff',
    borderRadius: '16px', padding: '36px', maxWidth: '460px', width: '100%',
    textAlign: 'center',
  },
  resultIcon: { fontSize: '52px', marginBottom: '12px' },
  resultTitle: { color: '#00ff88', fontSize: '24px', fontWeight: '800', margin: '0 0 24px' },
  resultGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '14px', marginBottom: '20px',
  },
  resultItem: {
    background: '#0a0e1a', borderRadius: '10px', padding: '16px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
  },
  resultValue: { color: '#00d4ff', fontSize: '28px', fontWeight: '800' },
  resultLabel: { color: '#7ecfff', fontSize: '12px' },
  warningBox: {
    background: 'rgba(255,68,68,0.15)', border: '1px solid rgba(255,68,68,0.3)',
    color: '#ff6060', padding: '10px', borderRadius: '8px', marginBottom: '10px', fontSize: '13px',
  },
  aiWarningBox: {
    background: 'rgba(255,170,0,0.15)', border: '1px solid rgba(255,170,0,0.3)',
    color: '#ffaa00', padding: '10px', borderRadius: '8px', marginBottom: '10px', fontSize: '13px',
  },
  returnBtn: {
    width: '100%', marginTop: '20px', padding: '13px', borderRadius: '10px',
    background: 'rgba(0,212,255,0.1)', border: '1px solid #00d4ff',
    color: '#00d4ff', fontSize: '15px', fontWeight: '600', cursor: 'pointer',
  },
};

export default QuizTaker;