import React, { useState, useEffect, useRef } from 'react';

const ATTENDANCE_THRESHOLD = 75;

// ────────────────────────────────────────────────────────────────────────────
// HELPER: Format seconds → "14m 20s" or "1h 05m 12s"
// ────────────────────────────────────────────────────────────────────────────
const formatTime = (seconds) => {
  const s = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) return `${hrs}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
  return `${mins}m ${String(secs).padStart(2, '0')}s`;
};

// ────────────────────────────────────────────────────────────────────────────
// HELPER: Deterministic color from student name (avatar ring)
// ────────────────────────────────────────────────────────────────────────────
const avatarColor = (name) => {
  const colors = ['#00d4ff', '#00ff88', '#ff6b6b', '#ffd93d', '#a78bfa', '#f472b6', '#34d399', '#fb923c'];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

// ════════════════════════════════════════════════════════════════════════════
// TEACHER VIEW — Real-time attendance table with live socket updates
// ════════════════════════════════════════════════════════════════════════════
const TeacherView = ({ attendanceData, classDuration }) => {
  const students = attendanceData?.students || [];
  const elapsed = attendanceData?.elapsedSeconds || 0;
  const totalClassSeconds = classDuration * 60;

  const presentCount = students.filter((s) => s.isPresent).length;
  const absentCount = students.length - presentCount;
  const onlineCount = students.filter((s) => s.isOnline).length;
  const suspiciousCount = students.filter((s) => s.isSuspicious).length;

  return (
    <div style={styles.container}>
      {/* ── Summary Header ──────────────────────────────────────── */}
      <div style={styles.header}>
        <h4 style={styles.title}>📊 Real-time Attendance</h4>
        <div style={styles.summaryRow}>
          <div style={styles.summaryCard}>
            <span style={styles.summaryValue}>{formatTime(elapsed)}</span>
            <span style={styles.summaryLabel}>Elapsed</span>
          </div>
          <div style={styles.summaryCard}>
            <span style={styles.summaryValue}>{students.length}</span>
            <span style={styles.summaryLabel}>Students</span>
          </div>
          <div style={styles.summaryCard}>
            <span style={{ ...styles.summaryValue, color: '#00ff88' }}>{onlineCount}</span>
            <span style={styles.summaryLabel}>Online</span>
          </div>
          <div style={styles.summaryCard}>
            <span style={{ ...styles.summaryValue, color: '#00ff88' }}>{presentCount}</span>
            <span style={styles.summaryLabel}>Present</span>
          </div>
          {absentCount > 0 && (
            <div style={styles.summaryCard}>
              <span style={{ ...styles.summaryValue, color: '#ff4444' }}>{absentCount}</span>
              <span style={styles.summaryLabel}>Absent</span>
            </div>
          )}
          {suspiciousCount > 0 && (
            <div style={styles.summaryCard}>
              <span style={{ ...styles.summaryValue, color: '#ffaa00' }}>{suspiciousCount}</span>
              <span style={styles.summaryLabel}>Suspicious</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Data Table ──────────────────────────────────────────── */}
      {students.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>⏳</div>
          <p style={styles.emptyText}>Waiting for students to join...</p>
          <p style={styles.emptySubtext}>Face detection data will appear here in real-time</p>
        </div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, textAlign: 'left' }}>#</th>
                <th style={{ ...styles.th, textAlign: 'left' }}>Student</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Face Time</th>
                <th style={styles.th}>Progress</th>
                <th style={styles.th}>Attendance</th>
                <th style={styles.th}>Result</th>
                <th style={styles.th}>Emotion</th>
                <th style={styles.th}>Suspicious</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, idx) => {
                const color = avatarColor(s.name);
                const barColor = s.percentage >= 75 ? '#00ff88' : s.percentage >= 50 ? '#ffd93d' : '#ff4444';
                const onlineColor = s.isOnline ? '#00ff88' : '#ff4444';
                const onlineLabel = s.isOnline ? 'Online' : 'Offline';

                return (
                  <tr key={s.studentId} style={{
                    ...styles.tr,
                    opacity: s.isOnline ? 1 : 0.5,
                  }}>
                    {/* Row Number */}
                    <td style={{ ...styles.td, color: '#7ecfff', fontSize: '11px' }}>
                      {idx + 1}
                    </td>

                    {/* Student Name + Avatar */}
                    <td style={{ ...styles.td, textAlign: 'left' }}>
                      <div style={styles.studentCell}>
                        <div style={{ ...styles.avatar, background: `${color}22`, color, border: `2px solid ${color}44` }}>
                          {s.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div style={styles.nameCol}>
                          <span style={styles.studentName}>{s.name}</span>
                          <span style={styles.studentId}>{s.studentId?.slice(-6)}</span>
                        </div>
                      </div>
                    </td>

                    {/* Online/Offline Status */}
                    <td style={styles.td}>
                      <div style={styles.statusDotWrap}>
                        <div style={{ ...styles.statusDot, backgroundColor: onlineColor }} />
                        <span style={{ color: onlineColor, fontSize: '11px', fontWeight: '600' }}>
                          {onlineLabel}
                        </span>
                      </div>
                    </td>

                    {/* Face Time */}
                    <td style={{ ...styles.td, fontWeight: '600', color: '#ffffff' }}>
                      {formatTime(s.faceTime)}
                    </td>

                    {/* Progress Bar */}
                    <td style={styles.td}>
                      <div style={styles.barOuter}>
                        <div style={{
                          ...styles.barInner,
                          width: `${Math.min(s.percentage, 100)}%`,
                          backgroundColor: barColor,
                        }} />
                        <span style={styles.barLabel}>{s.percentage}%</span>
                      </div>
                    </td>

                    {/* Attendance Percentage */}
                    <td style={{ ...styles.td, fontWeight: '700', color: barColor }}>
                      {s.percentage}%
                    </td>

                    {/* Present/Absent Badge */}
                    <td style={styles.td}>
                      <span style={{
                        ...styles.badge,
                        backgroundColor: s.isPresent ? '#00ff8818' : '#ff444418',
                        color: s.isPresent ? '#00ff88' : '#ff4444',
                        border: `1px solid ${s.isPresent ? '#00ff8844' : '#ff444444'}`,
                      }}>
                        {s.isPresent ? '✓ Present' : '✗ Absent'}
                      </span>
                    </td>

                    {/* Dominant Emotion */}
                    <td style={styles.td}>
                      <span style={{
                        ...styles.badge,
                        backgroundColor: '#00d4ff18',
                        color: '#00d4ff',
                        border: '1px solid #00d4ff44',
                        textTransform: 'capitalize',
                      }}>
                        {s.emotion || 'neutral'}
                      </span>
                    </td>

                    {/* Suspicious Flag */}
                    <td style={styles.td}>
                      {s.isSuspicious ? (
                        <span style={{
                          ...styles.badge,
                          backgroundColor: '#ff444418',
                          color: '#ff4444',
                          border: '1px solid #ff444444',
                        }}>
                          ⚠ Yes
                        </span>
                      ) : (
                        <span style={{
                          ...styles.badge,
                          backgroundColor: '#00ff8818',
                          color: '#00ff88',
                          border: '1px solid #00ff8844',
                        }}>
                          ✓ No
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// STUDENT VIEW — Personal attendance stats
// ════════════════════════════════════════════════════════════════════════════
const StudentView = ({
  faceTime, classDuration, livenessStatus,
  muteCount, chatCount, reactCount, cameraOffCount, userId, attendanceData,
}) => {
  const [timeInClass, setTimeInClass] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setTimeInClass((p) => p + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const totalClassSeconds = classDuration * 60;

  let effectiveFaceTime = faceTime;
  if (attendanceData?.students) {
    const me = attendanceData.students.find((s) => s.studentId === userId);
    if (me) effectiveFaceTime = me.faceTime;
  }

  const percentage = totalClassSeconds > 0
    ? Math.min(((effectiveFaceTime / totalClassSeconds) * 100), 100).toFixed(1)
    : 0;
  const isPresent = percentage >= 75;
  const barColor = percentage >= 75 ? '#00ff88' : percentage >= 50 ? '#ffd93d' : '#ff4444';

  const livenessMap = {
    live: { text: '✅ Real Face', color: '#00ff88' },
    detecting: { text: '🔍 Detecting...', color: '#ffd93d' },
  };
  const liveness = livenessMap[livenessStatus] || { text: '⚠️ Suspicious', color: '#ff4444' };

  return (
    <div style={styles.container}>
      <h4 style={styles.title}>📊 My Attendance</h4>

      <div style={styles.studentLivenessRow}>
        <span style={styles.studentLabel}>🎥 Camera Status:</span>
        <span style={{ ...styles.studentValue, color: liveness.color, fontWeight: 'bold' }}>
          {liveness.text}
        </span>
      </div>

      <div style={styles.studentRow}>
        <span style={styles.studentLabel}>⏱️ Time in Class:</span>
        <span style={styles.studentValue}>{formatTime(timeInClass)}</span>
      </div>

      <div style={styles.studentRow}>
        <span style={styles.studentLabel}>👤 Face Detected:</span>
        <span style={styles.studentValue}>{formatTime(effectiveFaceTime)}</span>
      </div>

      <div style={styles.studentRow}>
        <span style={styles.studentLabel}>📈 Attendance:</span>
        <span style={{ ...styles.studentValue, color: barColor }}>{percentage}%</span>
      </div>

      <div style={styles.progressTrack}>
        <div style={{ ...styles.progressFill, width: `${percentage}%`, backgroundColor: barColor }} />
      </div>

      <div style={styles.studentRow}>
        <span style={styles.studentLabel}>✅ Required:</span>
        <span style={styles.studentValue}>75% ({Math.round(classDuration * 0.75)} min)</span>
      </div>

      <div style={styles.studentStatusBox}>
        {isPresent ? (
          <span style={{ color: '#00ff88', fontWeight: 'bold', fontSize: '14px' }}>✅ Present</span>
        ) : (
          <span style={{ color: '#ffd93d', fontSize: '12px' }}>⏳ Need more face time</span>
        )}
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{muteCount || 0}</span>
          <span style={styles.statLabel}>Mutes</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{chatCount || 0}</span>
          <span style={styles.statLabel}>Chats</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{reactCount || 0}</span>
          <span style={styles.statLabel}>Reacts</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{cameraOffCount || 0}</span>
          <span style={styles.statLabel}>Cam Off</span>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════
const AttendanceTracker = ({
  roomId, userId, userName, classDuration, faceTime,
  muteCount, chatCount, reactCount, cameraOffCount,
  joinTime, livenessStatus, socket, role, attendanceData,
}) => {
  if (role === 'teacher') {
    return (
      <>
        <style>{`@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }`}</style>
        <TeacherView attendanceData={attendanceData} classDuration={classDuration} />
      </>
    );
  }

  return (
    <>
      <style>{`@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }`}</style>
      <StudentView
        faceTime={faceTime}
        classDuration={classDuration}
        livenessStatus={livenessStatus}
        muteCount={muteCount}
        chatCount={chatCount}
        reactCount={reactCount}
        cameraOffCount={cameraOffCount}
        userId={userId}
        attendanceData={attendanceData}
      />
    </>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// STYLES — Dark theme matching ClassMeet design system
// ════════════════════════════════════════════════════════════════════════════
const styles = {
  container: {
    backgroundColor: '#0d1b2a',
    border: '1px solid #00d4ff',
    borderRadius: '12px',
    padding: '16px',
    marginTop: '12px',
    maxHeight: '440px',
    overflowY: 'auto',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  title: { color: '#00d4ff', margin: '0 0 12px 0', fontSize: '15px', fontWeight: '600' },

  // ── Summary Cards ──────────────────────────────────────────────
  header: { marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid #0f346044' },
  summaryRow: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' },
  summaryCard: {
    backgroundColor: '#0a0e1a', borderRadius: '8px', padding: '8px 12px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '60px',
    border: '1px solid #0f346033',
  },
  summaryValue: { color: '#00d4ff', fontSize: '16px', fontWeight: '700', display: 'block' },
  summaryLabel: { color: '#7ecfff', fontSize: '9px', marginTop: '2px' },

  // ── Empty State ────────────────────────────────────────────────
  emptyState: { textAlign: 'center', padding: '32px 16px' },
  emptyIcon: { fontSize: '32px', marginBottom: '8px' },
  emptyText: { color: '#7ecfff', fontSize: '13px', margin: '0 0 4px 0' },
  emptySubtext: { color: '#1a3a5c', fontSize: '11px', margin: 0 },

  // ── Data Table ─────────────────────────────────────────────────
  tableWrap: { overflowX: 'auto' },
  table: {
    width: '100%', borderCollapse: 'separate', borderSpacing: 0,
    fontSize: '12px',
  },
  th: {
    color: '#7ecfff', fontSize: '10px', fontWeight: '600', textTransform: 'uppercase',
    letterSpacing: '0.5px', padding: '8px 10px', textAlign: 'center',
    borderBottom: '2px solid #0f346066', whiteSpace: 'nowrap',
  },
  tr: {
    transition: 'background-color 0.2s',
  },
  td: {
    padding: '10px', textAlign: 'center', borderBottom: '1px solid #0f346022',
    verticalAlign: 'middle',
  },

  // ── Student Cell (Avatar + Name) ───────────────────────────────
  studentCell: { display: 'flex', alignItems: 'center', gap: '8px' },
  avatar: {
    width: '30px', height: '30px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '12px', fontWeight: '700', flexShrink: 0,
  },
  nameCol: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  studentName: { color: '#ffffff', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  studentId: { color: '#7ecfff', fontSize: '9px', opacity: 0.6 },

  // ── Online Dot ─────────────────────────────────────────────────
  statusDotWrap: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' },
  statusDot: {
    width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
    animation: 'pulse 1.5s infinite',
  },

  // ── Progress Bar (inline table) ────────────────────────────────
  barOuter: {
    backgroundColor: '#1a3a5c', borderRadius: '5px', height: '8px',
    overflow: 'hidden', position: 'relative', minWidth: '80px',
  },
  barInner: {
    height: '100%', borderRadius: '5px', transition: 'width 0.8s ease',
  },
  barLabel: {
    position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)',
    color: '#fff', fontSize: '8px', fontWeight: '700',
    textShadow: '0 1px 2px rgba(0,0,0,0.6)',
  },

  // ── Badge ──────────────────────────────────────────────────────
  badge: {
    fontSize: '10px', fontWeight: '600', padding: '3px 10px',
    borderRadius: '20px', whiteSpace: 'nowrap', display: 'inline-block',
  },

  // ── Student View (personal stats) ──────────────────────────────
  studentLivenessRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '10px', padding: '8px 10px', backgroundColor: '#0a0e1a', borderRadius: '6px',
  },
  studentRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' },
  studentLabel: { color: '#7ecfff', fontSize: '12px' },
  studentValue: { color: '#ffffff', fontSize: '12px', fontWeight: '600' },
  studentStatusBox: {
    textAlign: 'center', padding: '10px', backgroundColor: '#0a0e1a',
    borderRadius: '6px', marginBottom: '12px',
  },
  progressTrack: {
    backgroundColor: '#1a3a5c', borderRadius: '5px', height: '8px',
    overflow: 'hidden', marginBottom: '8px',
  },
  progressFill: { height: '100%', borderRadius: '5px', transition: 'width 0.5s ease' },

  // ── Stats Grid ─────────────────────────────────────────────────
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' },
  statCard: {
    backgroundColor: '#0a0e1a', borderRadius: '6px', padding: '8px 4px',
    textAlign: 'center', border: '1px solid #0f346022',
  },
  statValue: { color: '#00d4ff', fontSize: '18px', fontWeight: '700', display: 'block' },
  statLabel: { color: '#7ecfff', fontSize: '9px', display: 'block', marginTop: '2px' },
};

export default AttendanceTracker;
