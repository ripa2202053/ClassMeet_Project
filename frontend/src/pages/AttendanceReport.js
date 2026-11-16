import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

const AttendanceReport = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState([]);
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const { data } = await axios.get(
        `${BACKEND_URL}/api/attendance/room/${roomId}`,
        { headers: { authorization: `Bearer ${user.token}` } }
      );
      setRoom(data.room);
      setReport(data.report);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load report');
    }
    setLoading(false);
  };

  const handleExport = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const response = await axios.get(
        `${BACKEND_URL}/api/export/attendance/${roomId}`,
        {
          headers: { authorization: `Bearer ${user.token}` },
          responseType: 'blob'
        }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_${roomId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Export failed!');
    }
  };

  if (loading) return (
    <div style={styles.container}>
      <p style={styles.loading}>⚡ Loading AI Telemetry Report...</p>
    </div>
  );

  if (error) return (
    <div style={styles.container}>
      <p style={styles.error}>{error}</p>
    </div>
  );

  const presentCount = report.filter(r => r.isPresent).length;
  const absentCount = report.filter(r => !r.isPresent).length;

  return (
    <div style={styles.container}>
      {/* HEADER BAR */}
      <div style={styles.header}>
        <div>
          <div style={styles.tagBadge}>✦ AI SESSION TELEMETRY</div>
          <h2 style={styles.title}>{room?.title || 'Session Report'}</h2>
          <p style={styles.roomInfo}>
            Room Code: <strong style={{ color: '#0b453e' }}>{room?.roomCode}</strong> • Duration: {room?.duration} min
          </p>
        </div>
        <div style={styles.headerBtns}>
          <button style={styles.exportBtn} onClick={handleExport}>
            📥 Export to Excel
          </button>
          <button style={styles.backBtn} onClick={() => navigate('/teacher-dashboard')}>
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {/* STATS SUMMARY TILES */}
      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <span style={styles.summaryValue}>{report.length}</span>
          <span style={styles.summaryLabel}>Total Students</span>
        </div>
        <div style={styles.summaryCard}>
          <span style={{ ...styles.summaryValue, color: '#047857' }}>{presentCount}</span>
          <span style={styles.summaryLabel}>Present (AI Verified)</span>
        </div>
        <div style={styles.summaryCard}>
          <span style={{ ...styles.summaryValue, color: '#b91c1c' }}>{absentCount}</span>
          <span style={styles.summaryLabel}>Absent</span>
        </div>
        <div style={styles.summaryCard}>
          <span style={{ ...styles.summaryValue, color: '#0b453e' }}>
            {report.length > 0 ? ((presentCount / report.length) * 100).toFixed(1) : 0}%
          </span>
          <span style={styles.summaryLabel}>Attendance Rate</span>
        </div>
      </div>

      {/* STUDENT TABLE */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeader}>
              <th style={styles.th}>Student</th>
              <th style={styles.th}>Join Time</th>
              <th style={styles.th}>Face Time</th>
              <th style={styles.th}>Attendance%</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Mutes</th>
              <th style={styles.th}>Chats</th>
              <th style={styles.th}>Reacts</th>
              <th style={styles.th}>Cam Off</th>
            </tr>
          </thead>
          <tbody>
            {report.length === 0 ? (
              <tr>
                <td colSpan="9" style={styles.noData}>No students joined this session yet</td>
              </tr>
            ) : (
              report.map((att) => (
                <tr key={att._id} style={styles.tableRow}>
                  <td style={styles.td}>
                    <div style={styles.studentName}>{att.student?.name}</div>
                    <div style={styles.studentEmail}>{att.student?.email}</div>
                  </td>
                  <td style={styles.td}>
                    {att.joinTime ? new Date(att.joinTime).toLocaleTimeString() : '-'}
                  </td>
                  <td style={styles.td}>
                    {Math.floor(att.faceDetectedTime / 60)}m {att.faceDetectedTime % 60}s
                  </td>
                  <td style={styles.td}>
                    <div style={styles.progressContainer}>
                      <div style={{
                        ...styles.progressBar,
                        width: `${Math.min(att.facePercent, 100)}%`,
                        background: att.facePercent >= 75 ? 'linear-gradient(90deg, #10b981, #059669)' : '#ef4444'
                      }} />
                      <span style={styles.progressText}>{att.facePercent}%</span>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: att.isPresent ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: att.isPresent ? '#047857' : '#b91c1c',
                      border: `1px solid ${att.isPresent ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`
                    }}>
                      {att.isPresent ? '✓ Present' : '✕ Absent'}
                    </span>
                  </td>
                  <td style={styles.td}>{att.muteCount}</td>
                  <td style={styles.td}>{att.chatCount}</td>
                  <td style={styles.td}>{att.reactCount}</td>
                  <td style={styles.td}>{att.cameraOffCount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
    padding: '28px 36px',
    background: 'linear-gradient(135deg, #7c959c 0%, #8ba2ab 28%, #9ab1ba 65%, #bfd3dd 100%)',
    minHeight: '100vh',
    boxSizing: 'border-box',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#0f242a'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
    marginBottom: '28px',
    backgroundColor: 'rgba(240, 248, 251, 0.75)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    padding: '24px 28px',
    borderRadius: '26px',
    border: '1.5px solid rgba(255, 255, 255, 0.85)',
    boxShadow: '0 16px 40px rgba(65, 88, 97, 0.15)'
  },
  tagBadge: {
    fontSize: '11px',
    fontWeight: '800',
    letterSpacing: '0.12em',
    color: '#0b453e',
    marginBottom: '6px'
  },
  title: {
    color: '#0f242a',
    margin: '0 0 6px 0',
    fontSize: '28px',
    fontWeight: '800',
    letterSpacing: '-0.02em'
  },
  roomInfo: {
    color: '#47636b',
    margin: 0,
    fontSize: '13.5px'
  },
  headerBtns: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
  },
  exportBtn: {
    padding: '11px 26px',
    backgroundColor: '#d0faf8',
    color: '#082d28',
    border: '2px solid #40ebd7',
    borderRadius: '9999px',
    cursor: 'pointer',
    fontWeight: '800',
    fontSize: '13.5px',
    boxShadow: '0 0 18px rgba(64, 235, 215, 0.65)'
  },
  backBtn: {
    padding: '11px 24px',
    backgroundColor: '#171e24',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.4)',
    borderRadius: '9999px',
    cursor: 'pointer',
    fontSize: '13.5px',
    fontWeight: '700',
    boxShadow: '0 4px 14px rgba(23, 30, 36, 0.25)'
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '28px'
  },
  summaryCard: {
    backgroundColor: 'rgba(240, 248, 251, 0.7)',
    backdropFilter: 'blur(18px)',
    border: '1.5px solid rgba(255, 255, 255, 0.85)',
    borderRadius: '22px',
    padding: '24px',
    textAlign: 'center',
    boxShadow: '0 10px 30px rgba(65, 88, 97, 0.12)'
  },
  summaryValue: {
    color: '#0f242a',
    fontSize: '38px',
    fontWeight: '800',
    display: 'block',
    letterSpacing: '-0.02em'
  },
  summaryLabel: {
    color: '#47636b',
    fontSize: '12px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    display: 'block',
    marginTop: '6px'
  },
  tableContainer: {
    backgroundColor: 'rgba(240, 248, 251, 0.8)',
    backdropFilter: 'blur(20px)',
    border: '1.5px solid rgba(255, 255, 255, 0.85)',
    borderRadius: '26px',
    overflow: 'auto',
    boxShadow: '0 16px 40px rgba(65, 88, 97, 0.15)'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableHeader: {
    backgroundColor: 'rgba(215, 230, 235, 0.85)'
  },
  th: {
    color: '#082d28',
    padding: '16px 20px',
    textAlign: 'left',
    borderBottom: '1px solid rgba(255, 255, 255, 0.8)',
    fontSize: '12px',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '0.06em'
  },
  tableRow: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.6)'
  },
  td: {
    color: '#0f242a',
    padding: '14px 20px',
    fontSize: '13.5px'
  },
  studentName: {
    color: '#0f242a',
    fontWeight: '700'
  },
  studentEmail: {
    color: '#577179',
    fontSize: '12px',
    marginTop: '2px'
  },
  progressContainer: {
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: '9999px',
    height: '18px',
    overflow: 'hidden',
    minWidth: '90px',
    border: '1px solid rgba(255, 255, 255, 0.9)'
  },
  progressBar: {
    height: '100%',
    borderRadius: '9999px',
    transition: 'width 0.4s ease'
  },
  progressText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: '#ffffff',
    fontSize: '10.5px',
    fontWeight: '800',
    textShadow: '0 1px 2px rgba(0,0,0,0.4)'
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 12px',
    borderRadius: '9999px',
    fontSize: '11.5px',
    fontWeight: '700'
  },
  noData: {
    color: '#577179',
    textAlign: 'center',
    padding: '40px',
    fontSize: '14px'
  },
  loading: {
    color: '#0b453e',
    textAlign: 'center',
    marginTop: '60px',
    fontSize: '18px',
    fontWeight: '700'
  },
  error: {
    color: '#b91c1c',
    textAlign: 'center',
    marginTop: '60px',
    fontSize: '18px',
    fontWeight: '700'
  }
};

export default AttendanceReport;
