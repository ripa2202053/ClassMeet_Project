import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BreakoutRoom = ({ mainRoomId, user, socket, onClose }) => {
  const [groupCount, setGroupCount] = useState(3);
  const [duration, setDuration] = useState(15);
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [breakoutRooms, setBreakoutRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [myRoom, setMyRoom] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (user?.role === 'student') {
      checkMyRoom();
    }

    if (socket) {
      socket.on('breakout-started', (rooms) => {
        setBreakoutRooms(rooms);
        const myAssignedRoom = rooms.find(r =>
          r.participants.some(p => p._id === user?._id)
        );
        if (myAssignedRoom) setMyRoom(myAssignedRoom);
      });

      socket.on('breakout-ended', () => {
        setBreakoutRooms([]);
        setMyRoom(null);
        setTimeLeft(0);
      });

      socket.on('breakout-broadcast', (message) => {
        alert(`📢 Teacher: ${message}`);
      });
    }

    return () => {
      if (socket) {
        socket.off('breakout-started');
        socket.off('breakout-ended');
        socket.off('breakout-broadcast');
      }
    };
  }, []);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleEndBreakout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft]);

  const checkMyRoom = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem('user'));
      const { data } = await axios.get(
        `http://localhost:5000/api/breakout/my-room/${mainRoomId}`,
        { headers: { authorization: `Bearer ${userData.token}` } }
      );
      setMyRoom(data);
    } catch (err) {
      console.log('No breakout room');
    }
  };

  const handleCreateBreakout = async () => {
    setLoading(true);
    setError('');
    try {
      const userData = JSON.parse(localStorage.getItem('user'));
      const { data } = await axios.post(
        'http://localhost:5000/api/breakout/create',
        { mainRoomId, groupCount, duration },
        { headers: { authorization: `Bearer ${userData.token}` } }
      );
      setBreakoutRooms(data);
      setTimeLeft(duration * 60);
      if (socket) {
        socket.emit('breakout-started', { mainRoomId, rooms: data });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create breakout rooms');
    }
    setLoading(false);
  };

  const handleEndBreakout = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem('user'));
      await axios.put(
        `http://localhost:5000/api/breakout/end/${mainRoomId}`,
        {},
        { headers: { authorization: `Bearer ${userData.token}` } }
      );
      setBreakoutRooms([]);
      setMyRoom(null);
      setTimeLeft(0);
      if (socket) {
        socket.emit('breakout-ended', { mainRoomId });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBroadcast = () => {
    const message = prompt('Enter message to broadcast to all groups:');
    if (message && socket) {
      socket.emit('breakout-broadcast', { mainRoomId, message });
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>🏠 Breakout Rooms</h3>
        <button style={styles.closeBtn} onClick={onClose}>✕</button>
      </div>

      {error && <p style={styles.error}>{error}</p>}

      {user?.role === 'teacher' && (
        <div style={styles.teacherPanel}>
          {breakoutRooms.length === 0 ? (
            <div>
              <div style={styles.row}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Number of Groups:</label>
                  <select
                    style={styles.select}
                    value={groupCount}
                    onChange={(e) => setGroupCount(Number(e.target.value))}
                  >
                    {[2, 3, 4, 5, 6, 7, 8].map(n => (
                      <option key={n} value={n}>{n} Groups</option>
                    ))}
                  </select>
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Duration:</label>
                  <select
                    style={styles.select}
                    value={isCustomDuration ? 'custom' : duration}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setIsCustomDuration(true);
                        setDuration('');
                      } else {
                        setIsCustomDuration(false);
                        setDuration(Number(e.target.value));
                      }
                    }}
                  >
                    <option value={5}>5 min</option>
                    <option value={10}>10 min</option>
                    <option value={15}>15 min</option>
                    <option value={20}>20 min</option>
                    <option value={30}>30 min</option>
                    <option value="custom">⚙️ Custom...</option>
                  </select>
                  {isCustomDuration && (
                    <input
                      style={styles.input}
                      type="number"
                      placeholder="Minutes"
                      min="1"
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                    />
                  )}
                </div>
              </div>
              <button
                style={styles.createBtn}
                onClick={handleCreateBreakout}
                disabled={loading}
              >
                {loading ? 'Creating...' : '🚀 Start Breakout Rooms'}
              </button>
            </div>
          ) : (
            <div>
              <div style={styles.activeHeader}>
                <span style={styles.activeText}>🟢 Breakout Active</span>
                {timeLeft > 0 && (
                  <span style={styles.timer}>⏱️ {formatTime(timeLeft)}</span>
                )}
              </div>

              <div style={styles.groupGrid}>
                {breakoutRooms.map((room, index) => (
                  <div key={room._id} style={styles.groupCard}>
                    <h4 style={styles.groupName}>{room.name}</h4>
                    <div style={styles.participantList}>
                      {room.participants.map((p) => (
                        <div key={p._id} style={styles.participant}>
                          👤 {p.name}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div style={styles.actionBtns}>
                <button style={styles.broadcastBtn} onClick={handleBroadcast}>
                  📢 Broadcast Message
                </button>
                <button style={styles.endBtn} onClick={handleEndBreakout}>
                  ⏹️ End All Breakouts
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {user?.role === 'student' && (
        <div style={styles.studentPanel}>
          {myRoom ? (
            <div style={styles.myRoomCard}>
              <h4 style={styles.myRoomTitle}>You are in: {myRoom.name}</h4>
              <p style={styles.myRoomDesc}>Your group members:</p>
              {myRoom.participants.map((p) => (
                <div key={p._id} style={styles.participant}>
                  👤 {p.name} {p._id === user._id && '(You)'}
                </div>
              ))}
              {timeLeft > 0 && (
                <div style={styles.studentTimer}>
                  ⏱️ Time left: {formatTime(timeLeft)}
                </div>
              )}
            </div>
          ) : (
            <p style={styles.waitingText}>
              ⏳ Waiting for teacher to start breakout rooms...
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { backgroundColor: '#0d1b2a', border: '1px solid #00d4ff', borderRadius: '10px', padding: '20px', marginTop: '15px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
  title: { color: '#00d4ff', margin: 0 },
  closeBtn: { padding: '4px 10px', backgroundColor: '#ff4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  error: { color: '#ff4444', marginBottom: '10px' },
  teacherPanel: { color: '#ffffff' },
  row: { display: 'flex', gap: '15px', marginBottom: '15px', flexWrap: 'wrap' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 },
  label: { color: '#7ecfff', fontSize: '13px' },
  select: { padding: '8px', borderRadius: '5px', border: '1px solid #00d4ff', backgroundColor: '#0a0e1a', color: '#00d4ff', fontSize: '14px' },
  input: { padding: '8px', borderRadius: '5px', border: '1px solid #00d4ff', backgroundColor: '#0a0e1a', color: '#00d4ff', fontSize: '14px', marginTop: '5px' },
  createBtn: { width: '100%', padding: '12px', backgroundColor: '#00d4ff', color: '#0a0e1a', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' },
  activeHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', backgroundColor: 'rgba(0,255,136,0.1)', padding: '10px', borderRadius: '5px', border: '1px solid #00ff88' },
  activeText: { color: '#00ff88', fontWeight: 'bold' },
  timer: { color: '#00d4ff', fontWeight: 'bold', fontSize: '18px' },
  groupGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px', marginBottom: '15px' },
  groupCard: { backgroundColor: '#0a0e1a', border: '1px solid #1a3a5c', borderRadius: '8px', padding: '12px' },
  groupName: { color: '#00d4ff', margin: '0 0 8px 0', fontSize: '14px' },
  participantList: { display: 'flex', flexDirection: 'column', gap: '5px' },
  participant: { color: '#7ecfff', fontSize: '13px', padding: '4px', backgroundColor: '#0d1b2a', borderRadius: '4px' },
  actionBtns: { display: 'flex', gap: '10px' },
  broadcastBtn: { flex: 1, padding: '10px', backgroundColor: '#1a3a5c', color: '#00d4ff', border: '1px solid #00d4ff', borderRadius: '5px', cursor: 'pointer' },
  endBtn: { flex: 1, padding: '10px', backgroundColor: '#ff4444', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' },
  studentPanel: { color: '#ffffff' },
  myRoomCard: { backgroundColor: '#0a0e1a', border: '1px solid #00d4ff', borderRadius: '8px', padding: '15px' },
  myRoomTitle: { color: '#00d4ff', margin: '0 0 10px 0' },
  myRoomDesc: { color: '#7ecfff', fontSize: '13px', margin: '0 0 8px 0' },
  studentTimer: { color: '#00d4ff', fontWeight: 'bold', fontSize: '16px', textAlign: 'center', marginTop: '10px', padding: '8px', backgroundColor: '#0d1b2a', borderRadius: '5px' },
  waitingText: { color: '#7ecfff', textAlign: 'center', padding: '20px', fontStyle: 'italic' }
};

export default BreakoutRoom;