import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import VideoRoom from '../components/VideoRoom';
import AttendanceTracker from '../components/AttendanceTracker';
import QuizCreator from '../components/QuizCreator';
import QuizTaker from '../components/QuizTaker';
import BreakoutRoom from '../components/BreakoutRoom';

const SOCKET_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

const Room = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const videoRoomRef = useRef();

  const [socket, setSocket] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [sidebarMode, setSidebarMode] = useState(null);
  const [showAttendance, setShowAttendance] = useState(false);
  const [showQuizCreator, setShowQuizCreator] = useState(false);
  const [showBreakout, setShowBreakout] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [faceTime, setFaceTime] = useState(0);
  const [muteCount, setMuteCount] = useState(0);
  const [chatCount, setChatCount] = useState(0);
  const [reactCount, setReactCount] = useState(0);
  const [cameraOffCount, setCameraOffCount] = useState(0);
  const [classDuration] = useState(60);
  const [viewMode, setViewMode] = useState('gallery');
  const joinTime = useRef(new Date());
  const [livenessStatus, setLivenessStatus] = useState('detecting');
  const [attendanceData, setAttendanceData] = useState(null);

  useEffect(() => {
    const s = io(SOCKET_URL);
    socketRef.current = s;
    setSocket(s);

    s.on('room:participants', (list) => {
      setParticipants(list);
    });

    s.on('room:participant-joined', (participant) => {
      setParticipants((prev) => {
        if (prev.some((p) => p.socketId === participant.socketId)) return prev;
        return [...prev, participant];
      });
    });

    s.on('room:participant-left', ({ socketId }) => {
      setParticipants((prev) => prev.filter((p) => p.socketId !== socketId));
    });

    s.on('receive-message', (msg) => setMessages((prev) => [...prev, msg]));
    s.on('quiz-started', ({ quiz }) => {
      if (user?.role === 'student') setActiveQuiz(quiz);
    });
    s.on('breakout-started', () => setShowBreakout(true));
    s.on('breakout-ended', () => setShowBreakout(false));
    s.on('attendance-update', (data) => setAttendanceData(data));

    return () => {
      s.off('room:participants');
      s.off('room:participant-joined');
      s.off('room:participant-left');
      s.off('receive-message');
      s.off('quiz-started');
      s.off('breakout-started');
      s.off('breakout-ended');
      s.off('attendance-update');
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, []);

  const sendMessage = useCallback(() => {
    if (message.trim()) {
      const msgData = {
        text: message,
        sender: user?.name,
        time: new Date().toLocaleTimeString(),
      };
      socket.emit('send-message', id, msgData);
      setMessages((prev) => [...prev, msgData]);
      setMessage('');
      setChatCount((prev) => prev + 1);
    }
  }, [message, user?.name, id, socket]);

  const totalParticipants = participants.length + 1;

  const toggleSidebar = useCallback((mode) => {
    setSidebarMode((prev) => (prev === mode ? null : mode));
  }, []);

  if (!socket) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0e1a' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '36px', height: '36px',
            border: '3px solid rgba(0,212,255,0.2)', borderTop: '3px solid #00d4ff',
            borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px'
          }} />
          <p style={{ color: '#7ecfff', fontSize: '14px' }}>Connecting to server...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {activeQuiz && user?.role === 'student' && (
        <QuizTaker
          quiz={activeQuiz}
          onSubmit={(result) => console.log('Quiz result:', result)}
          onClose={() => setActiveQuiz(null)}
        />
      )}

      <div style={styles.topbar}>
        <div style={styles.topLeft}>
          <span style={styles.logoText}>ClassMeet</span>
          <span style={styles.className}>Live Class</span>
          <span style={styles.roomCode}>Room: {id?.slice(-6).toUpperCase()}</span>
        </div>
        <div style={styles.topCenter}>
          {user?.role === 'teacher' && ['gallery', 'speaker', 'spotlight'].map((v) => (
            <button
              key={v}
              style={{ ...styles.viewBtn, ...(viewMode === v ? styles.viewBtnActive : {}) }}
              onClick={() => setViewMode(v)}
            >
              {v === 'speaker' ? 'Speaker' : v === 'gallery' ? 'Gallery' : 'Spotlight'}
            </button>
          ))}
        </div>
        <div style={styles.topRight}>
          <div style={styles.recBadge}>
            <div style={styles.recDot} />
            <span style={styles.recText}>REC</span>
          </div>
          <span style={styles.timerText}>Live</span>
          <span style={styles.participantCount}>{totalParticipants} in class</span>
        </div>
      </div>

      <div style={{ ...styles.main, position: 'relative' }}>
        <div style={{ ...styles.videoArea, marginRight: sidebarMode ? '0' : '0' }}>
          <VideoRoom
            ref={videoRoomRef}
            socket={socket}
            roomId={id}
            user={user}
            participants={participants}
            viewMode={viewMode}
            sidebarMode={sidebarMode}
            onFaceTime={setFaceTime}
            onMuteChange={(m) => { if (m) setMuteCount((p) => p + 1); }}
            onCameraOff={(o) => { if (o) setCameraOffCount((p) => p + 1); }}
            onLivenessChange={setLivenessStatus}
            onToggleSidebar={toggleSidebar}
            onLeave={() => navigate(-1)}
            onReaction={() => setReactCount((p) => p + 1)}
          />

          {user?.role === 'teacher' && showAttendance && (
            <AttendanceTracker
              roomId={id}
              userId={user?._id}
              userName={user?.name}
              classDuration={classDuration}
              faceTime={faceTime}
              muteCount={muteCount}
              chatCount={chatCount}
              reactCount={reactCount}
              cameraOffCount={cameraOffCount}
              joinTime={joinTime.current}
              livenessStatus={livenessStatus}
              socket={socket}
              role={user?.role}
              attendanceData={attendanceData}
            />
          )}

          {user?.role === 'teacher' && showQuizCreator && (
            <QuizCreator
              roomId={id}
              socket={socket}
              onQuizCreated={() => setShowQuizCreator(false)}
            />
          )}

          {showBreakout && (
            <BreakoutRoom
              mainRoomId={id}
              user={user}
              socket={socket}
              onClose={() => setShowBreakout(false)}
            />
          )}
        </div>

        {/* ── Collapsible Sidebar Drawer ─────────────────────────── */}
        {sidebarMode && (
          <div style={styles.drawerBackdrop} onClick={() => setSidebarMode(null)} />
        )}
        <div style={{
          ...styles.drawer,
          transform: sidebarMode ? 'translateX(0)' : 'translateX(100%)',
          visibility: sidebarMode ? 'visible' : 'hidden',
        }}>
          <div style={styles.drawerHeader}>
            <div style={styles.drawerTabs}>
              <button
                style={{ ...styles.dTab, ...(sidebarMode === 'people' ? styles.dTabActive : {}) }}
                onClick={() => setSidebarMode('people')}
              >
                People ({totalParticipants})
              </button>
              <button
                style={{ ...styles.dTab, ...(sidebarMode === 'chat' ? styles.dTabActive : {}) }}
                onClick={() => setSidebarMode('chat')}
              >
                Chat ({messages.length})
              </button>
            </div>
            <div style={styles.drawerCloseBtn} onClick={() => setSidebarMode(null)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7ecfff" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
          </div>

          {sidebarMode === 'people' && (
            <div style={styles.drawerBody}>
              <div style={styles.participantItem}>
                <div style={{ ...styles.pAvatar, background: '#00d4ff22', color: '#00d4ff' }}>
                  {user?.name?.charAt(0)}
                </div>
                <span style={styles.pName}>{user?.name} (You)</span>
                <span style={styles.hostBadge}>
                  {user?.role === 'teacher' ? 'Host' : 'Student'}
                </span>
              </div>
              {participants.map((p) => (
                <div key={p.socketId} style={styles.participantItem}>
                  <div style={styles.pAvatar}>
                    {p.name?.charAt(0)}
                  </div>
                  <span style={styles.pName}>{p.name}</span>
                  <span style={styles.hostBadge}>
                    {p.role === 'teacher' ? 'Host' : 'Student'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {sidebarMode === 'chat' && (
            <div style={styles.drawerChat}>
              <div style={styles.messages}>
                {messages.length === 0 && (
                  <p style={styles.noMsg}>No messages yet...</p>
                )}
                {messages.map((msg, i) => (
                  <div key={i} style={styles.msgItem}>
                    <span style={styles.msgSender}>{msg.sender}</span>
                    <span style={styles.msgText}>{msg.text}</span>
                    <span style={styles.msgTime}>{msg.time}</span>
                  </div>
                ))}
              </div>
              <div style={styles.chatInput}>
                <input
                  style={styles.chatInputBox}
                  type="text"
                  placeholder="Type message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <button style={styles.sendBtn} onClick={sendMessage}>Send</button>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

const styles = {
  page: {
    background: '#1a1a2e',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  topbar: {
    background: '#16213e',
    padding: '8px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid #0f3460',
    flexShrink: 0,
  },
  topLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  logoText: { color: '#00d4ff', fontSize: '15px', fontWeight: '700' },
  className: { color: '#ffffff', fontSize: '13px', fontWeight: '500' },
  roomCode: {
    background: '#0f3460',
    color: '#00d4ff',
    fontSize: '10px',
    padding: '2px 8px',
    borderRadius: '20px',
  },
  topCenter: {
    display: 'flex',
    gap: '2px',
    background: '#0f2035',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid #0f3460',
  },
  viewBtn: {
    padding: '5px 14px',
    background: 'transparent',
    border: 'none',
    color: '#7ecfff',
    fontSize: '11px',
    cursor: 'pointer',
    fontWeight: '500',
  },
  viewBtnActive: { background: '#00d4ff22', color: '#00d4ff' },
  topRight: { display: 'flex', alignItems: 'center', gap: '10px' },
  recBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    background: '#ff444422',
    border: '1px solid #ff444444',
    padding: '2px 8px',
    borderRadius: '20px',
  },
  recDot: { width: '5px', height: '5px', borderRadius: '50%', background: '#ff4444' },
  recText: { color: '#ff4444', fontSize: '9px', fontWeight: '600' },
  timerText: { color: '#7ecfff', fontSize: '11px' },
  participantCount: { color: '#7ecfff', fontSize: '11px' },
  main: { flex: 1, display: 'flex', gap: '6px', padding: '6px', overflow: 'hidden' },
  videoArea: { flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'auto', minWidth: 0 },
  drawerBackdrop: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.4)',
    zIndex: 40,
  },
  drawer: {
    position: 'absolute', top: 0, right: 0, bottom: 0,
    width: '300px', zIndex: 45,
    background: '#16213e',
    borderRadius: '10px',
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.3s',
    boxShadow: '-4px 0 24px rgba(0,0,0,0.3)',
  },
  drawerHeader: {
    borderBottom: '1px solid #0f3460',
  },
  drawerTabs: { display: 'flex' },
  dTab: {
    flex: 1, padding: '10px', textAlign: 'center',
    color: '#7ecfff', fontSize: '11px', cursor: 'pointer',
    border: 'none', background: 'transparent', fontWeight: '500',
    transition: 'color 0.15s, border-color 0.15s',
  },
  dTabActive: { color: '#00d4ff', borderBottom: '2px solid #00d4ff' },
  drawerCloseBtn: {
    position: 'absolute', top: '8px', right: '8px',
    width: '28px', height: '28px', borderRadius: '6px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(255,255,255,0.05)', cursor: 'pointer',
  },
  drawerBody: { flex: 1, padding: '8px', overflowY: 'auto' },
  drawerChat: { flex: 1, display: 'flex', flexDirection: 'column' },
  participantItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 4px',
    borderBottom: '1px solid #0f346022',
  },
  pAvatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: '#0f346066',
    color: '#7ecfff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: '600',
    flexShrink: 0,
  },
  pName: { color: '#ffffff', fontSize: '11px', flex: 1 },
  hostBadge: {
    background: '#00d4ff22',
    color: '#00d4ff',
    fontSize: '9px',
    padding: '1px 6px',
    borderRadius: '10px',
    border: '1px solid #00d4ff44',
    fontWeight: '500',
  },
  chatContainer: { flex: 1, display: 'flex', flexDirection: 'column' },
  messages: { flex: 1, overflowY: 'auto', padding: '8px', maxHeight: '300px' },
  noMsg: { color: '#1a3a5c', fontSize: '11px', textAlign: 'center', marginTop: '20px' },
  msgItem: {
    marginBottom: '8px',
    padding: '6px',
    background: '#0f2035',
    borderRadius: '6px',
  },
  msgSender: { color: '#00d4ff', fontSize: '10px', fontWeight: '500', display: 'block' },
  msgText: { color: '#ffffff', fontSize: '11px' },
  msgTime: { color: '#1a3a5c', fontSize: '9px', display: 'block', textAlign: 'right' },
  chatInput: {
    display: 'flex',
    gap: '4px',
    padding: '6px',
    borderTop: '1px solid #0f3460',
  },
  chatInputBox: {
    flex: 1,
    background: '#0f2035',
    border: '1px solid #0f3460',
    borderRadius: '5px',
    padding: '5px 8px',
    color: '#ffffff',
    fontSize: '11px',
    outline: 'none',
  },
  sendBtn: {
    padding: '5px 10px',
    background: '#00d4ff',
    color: '#0a0e1a',
    border: 'none',
    borderRadius: '5px',
    fontSize: '10px',
    cursor: 'pointer',
    fontWeight: '600',
  },
};

export default Room;
