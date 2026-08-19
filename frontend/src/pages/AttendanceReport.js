import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

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
        `http://localhost:5000/api/attendance/room/${roomId}`,
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
        `http://localhost:5000/api/export/attendance/${roomId}`,
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
      <p style={styles.loading}>Loading report...</p>
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
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>📊 Attendance Report</h2>
          <p style={styles.roomInfo}>
            {room?.title} | Code: {room?.roomCode} | Duration: {room?.duration} min
          </p>
        </div>
        <div style={styles.headerBtns}>
          <button style={styles.exportBtn} onClick={handleExport}>
            📥 Export Excel
          </button>
          <button style={styles.backBtn} onClick={() => navigate('/teacher-dashboard')}>
            ← Back
          </button>
        </div>
      </div>

      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <span style={styles.summaryValue}>{report.length}</span>
          <span style={styles.summaryLabel}>Total Students</span>
        </div>
        <div style={styles.summaryCard}>
          <span style={{...styles.summaryValue, color: '#00ff88'}}>{presentCount}</span>
          <span style={styles.summaryLabel}>Present</span>
        </div>
        <div style={styles.summaryCard}>
          <span style={{...styles.summaryValue, color: '#ff4444'}}>{absentCount}</span>
          <span style={styles.summaryLabel}>Absent</span>
        </div>
        <div style={styles.summaryCard}>
          <span style={styles.summaryValue}>
            {report.length > 0 ? ((presentCount / report.length) * 100).toFixed(1) : 0}%
          </span>
          <span style={styles.summaryLabel}>Attendance Rate</span>
        </div>
      </div>

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
                <td colSpan="9" style={styles.noData}>No students joined yet</td>
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
                        backgroundColor: att.facePercent >= 75 ? '#00ff88' : '#ff4444'
                      }} />
                      <span style={styles.progressText}>{att.facePercent}%</span>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: att.isPresent ? 'rgba(0,255,136,0.2)' : 'rgba(255,68,68,0.2)',
                      color: att.isPresent ? '#00ff88' : '#ff4444',
                      border: `1px solid ${att.isPresent ? '#00ff88' : '#ff4444'}`
                    }}>
                      {att.isPresent ? '✅ Present' : '❌ Absent'}
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
  container: { width: '100%', padding: '20px', backgroundColor: '#0a0e1a', minHeight: '100vh', boxSizing: 'border-box' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px', backgroundColor: '#0d1b2a', padding: '20px', borderRadius: '10px', borderBottom: '2px solid #00d4ff' },
  title: { color: '#00d4ff', margin: '0 0 5px 0' },
  roomInfo: { color: '#7ecfff', margin: 0, fontSize: '14px' },
  headerBtns: { display: 'flex', gap: '10px' },
  exportBtn: { padding: '8px 16px', backgroundColor: '#00ff88', color: '#0a0e1a', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' },
  backBtn: { padding: '8px 16px', backgroundColor: '#1a3a5c', color: '#00d4ff', border: '1px solid #00d4ff', borderRadius: '5px', cursor: 'pointer' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '25px' },
  summaryCard: { backgroundColor: '#0d1b2a', border: '1px solid #00d4ff', borderRadius: '10px', padding: '20px', textAlign: 'center' },
  summaryValue: { color: '#00d4ff', fontSize: '32px', fontWeight: 'bold', display: 'block' },
  summaryLabel: { color: '#7ecfff', fontSize: '14px', display: 'block', marginTop: '5px' },
  tableContainer: { backgroundColor: '#0d1b2a', border: '1px solid #00d4ff', borderRadius: '10px', overflow: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHeader: { backgroundColor: '#0a0e1a' },
  th: { color: '#00d4ff', padding: '12px 15px', textAlign: 'left', borderBottom: '1px solid #1a3a5c', fontSize: '13px', fontWeight: 'bold' },
  tableRow: { borderBottom: '1px solid #1a3a5c' },
  td: { color: '#ffffff', padding: '12px 15px', fontSize: '13px' },
  studentName: { color: '#ffffff', fontWeight: 'bold' },
  studentEmail: { color: '#7ecfff', fontSize: '11px' },
  progressContainer: { position: 'relative', backgroundColor: '#1a3a5c', borderRadius: '5px', height: '20px', overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: '5px', transition: 'width 0.5s' },
  progressText: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#ffffff', fontSize: '11px', fontWeight: 'bold' },
  statusBadge: { padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' },
  noData: { color: '#7ecfff', textAlign: 'center', padding: '30px' },
  loading: { color: '#00d4ff', textAlign: 'center', marginTop: '50px', fontSize: '18px' },
  error: { color: '#ff4444', textAlign: 'center', marginTop: '50px', fontSize: '18px' }
};

export default AttendanceReport;