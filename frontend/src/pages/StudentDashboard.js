import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { joinRoom } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const StudentDashboard = () => {
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data } = await joinRoom({ roomCode });
      navigate(`/room/${data.room._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join room');
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>🎓 Student Dashboard</h2>
        <div>
          <span style={styles.welcome}>Welcome, {user?.name}!</span>
          <button style={styles.logoutBtn} onClick={logoutUser}>Logout</button>
        </div>
      </div>

      <div style={styles.joinCard}>
        <h3 style={styles.cardTitle}>Join a Class</h3>
        <p style={styles.cardDesc}>Enter the room code given by your teacher</p>

        {error && <p style={styles.error}>{error}</p>}

        <form onSubmit={handleJoinRoom} style={styles.form}>
          <input
            style={styles.input}
            type="text"
            placeholder="Enter Room Code (e.g. KSONRR)"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            required
          />
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? 'Joining...' : 'Join Class 🚀'}
          </button>
        </form>
      </div>

      <div style={styles.infoCard}>
        <h3 style={styles.cardTitle}>📋 Instructions</h3>
        <ul style={styles.list}>
          <li style={styles.listItem}>✅ Keep your camera ON during class</li>
          <li style={styles.listItem}>✅ Attendance is tracked automatically</li>
          <li style={styles.listItem}>✅ Stay for at least 75% of class time</li>
          <li style={styles.listItem}>❌ Do not switch tabs during quiz</li>
          <li style={styles.listItem}>❌ Do not use AI for quiz answers</li>
        </ul>
      </div>
    </div>
  );
};

const styles = {
  container: {
    width: '100vw',
    minHeight: '100vh',
    padding: '20px',
    backgroundColor: '#0a0e1a',
    boxSizing: 'border-box',
    margin: 0
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    backgroundColor: '#0d1b2a',
    padding: '20px',
    borderRadius: '10px',
    borderBottom: '2px solid #00d4ff'
  },
  title: { color: '#00d4ff', fontSize: '24px', margin: 0 },
  welcome: { marginRight: '15px', fontSize: '16px', color: '#00d4ff' },
  logoutBtn: { padding: '8px 16px', backgroundColor: '#ff4444', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' },
  joinCard: { backgroundColor: '#0d1b2a', padding: '30px', borderRadius: '10px', border: '1px solid #00d4ff', marginBottom: '20px', textAlign: 'center' },
  cardTitle: { color: '#00d4ff', marginBottom: '10px' },
  cardDesc: { color: '#7ecfff', marginBottom: '20px' },
  form: { display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' },
  input: { padding: '12px', borderRadius: '5px', border: '1px solid #00d4ff', fontSize: '18px', backgroundColor: '#0a0e1a', color: '#00d4ff', textAlign: 'center', letterSpacing: '3px', width: '250px' },
  button: { padding: '12px 25px', backgroundColor: '#00d4ff', color: '#0a0e1a', border: 'none', borderRadius: '5px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' },
  error: { color: '#ff4444', marginBottom: '10px' },
  infoCard: { backgroundColor: '#0d1b2a', padding: '25px', borderRadius: '10px', border: '1px solid #1a3a5c' },
  list: { paddingLeft: '20px' },
  listItem: { color: '#7ecfff', marginBottom: '10px', fontSize: '16px' }
};

export default StudentDashboard;