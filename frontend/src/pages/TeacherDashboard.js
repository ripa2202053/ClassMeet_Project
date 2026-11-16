import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRoom, getMyRooms, startRoom } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './TeacherDashboard.css';

const TeacherDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [rooms, setRooms] = useState([]);
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(60);
  const [isCustom, setIsCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const { data } = await getMyRooms();
      setRooms(data);
    } catch (err) {
      console.error('Error fetching rooms:', err);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await createRoom({ title, duration });
      setTitle('');
      setDuration(60);
      setIsCustom(false);
      setShowModal(false);
      fetchRooms();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create room');
    }
    setLoading(false);
  };

  const handleStartRoom = async (id) => {
    try {
      await startRoom(id);
      fetchRooms();
    } catch (err) {
      console.error('Error starting room:', err);
    }
  };

  const handleViewAttendance = (roomId) => {
    navigate(`/attendance/${roomId}`);
  };

  const handleExportAttendance = async (roomId) => {
    try {
      const userData = JSON.parse(localStorage.getItem('user'));
      const response = await axios.get(
        `http://localhost:5000/api/export/attendance/${roomId}`,
        { headers: { authorization: `Bearer ${userData?.token}` }, responseType: 'blob' }
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

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'classes', label: 'My Classes' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'performance', label: 'Performance' },
    { id: 'quiz', label: 'Quiz Score' },
    { id: 'export', label: 'Export to Excel' },
    { id: 'recording', label: 'Recording' },
    { id: 'message', label: 'Message' },
  ];

  // Filter rooms based on search query
  const filteredRooms = rooms.filter(r =>
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.roomCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeRooms = filteredRooms.filter(r => r.isActive);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div>
            {/* HERO FEATURED BANNER ("Intelligent Flow" Aesthetic) */}
            <div className="flow-hero-card">
              <div className="flow-hero-badge">
                <span>✦</span> AI Smart Classroom Hub
              </div>
              <h2 className="flow-hero-title">Intelligent Flow</h2>
              <p className="flow-hero-sub">
                Real-time AI telemetry, automated face recognition attendance & seamless live interactive classrooms.
              </p>
              
              {/* Signature Glowing CTA Pill Button */}
              <button 
                className="flow-hero-catda-btn"
                onClick={() => setShowModal(true)}
              >
                + Create Live Class
              </button>

              {/* HUD Telemetry Widget */}
              <div className="flow-hero-telemetry-hud">
                <div className="flow-hud-bars">
                  <div className="flow-hud-bar"></div>
                  <div className="flow-hud-bar"></div>
                  <div className="flow-hud-bar"></div>
                  <div className="flow-hud-bar"></div>
                  <div className="flow-hud-bar"></div>
                </div>
                <div className="flow-hud-data">
                  <p className="flow-hud-value">
                    <span className="flow-hud-dot"></span>
                    {activeRooms.length > 0 ? `${activeRooms.length} Live Stream` : 'Engine Ready'}
                  </p>
                  <p className="flow-hud-label">AI Telemetry 1060Hz</p>
                </div>
              </div>
            </div>

            {/* STATS METRIC CARDS */}
            <div className="flow-stats-grid">
              <div className="flow-stat-card">
                <div className="flow-stat-header">
                  <p className="flow-stat-label">Active Classes</p>
                  <div className="flow-stat-icon-wrapper">📚</div>
                </div>
                <p className="flow-stat-value">{activeRooms.length.toString().padStart(2, '0')}</p>
                <p className="flow-stat-subtext">● In progress now</p>
              </div>

              <div className="flow-stat-card">
                <div className="flow-stat-header">
                  <p className="flow-stat-label">Avg Attendance (Face AI)</p>
                  <div className="flow-stat-icon-wrapper">👤</div>
                </div>
                <p className="flow-stat-value">94.8%</p>
                <p className="flow-stat-subtext">✦ AI facial verification active</p>
              </div>

              <div className="flow-stat-card">
                <div className="flow-stat-header">
                  <p className="flow-stat-label">Total Sessions</p>
                  <div className="flow-stat-icon-wrapper">🏆</div>
                </div>
                <p className="flow-stat-value">{rooms.length.toString().padStart(2, '0')}</p>
                <p className="flow-stat-subtext">✓ All-time created rooms</p>
              </div>
            </div>

            {/* ACTIVE CLASSES SECTION */}
            <div className="flow-section-box">
              <div className="flow-section-header">
                <h3 className="flow-section-title">
                  <span>⚡</span> Live Active Sessions
                </h3>
                <span className="flow-section-count">{activeRooms.length} Active</span>
              </div>

              {activeRooms.length === 0 ? (
                <div className="flow-empty-state">
                  <div className="flow-empty-icon">☕</div>
                  <p>No active live classes right now. Start or create one above!</p>
                </div>
              ) : (
                <div className="flow-classes-grid">
                  {activeRooms.map((room) => (
                    <div key={room._id} className="flow-class-card">
                      <div className="flow-card-top">
                        <span className="flow-badge-live">
                          <span className="flow-badge-live-dot"></span> Live Now
                        </span>
                        <span className="flow-card-duration">⏱️ {room.duration} Mins</span>
                      </div>
                      <h4 className="flow-card-title">{room.title}</h4>
                      <div className="flow-card-code-box">
                        <span className="flow-card-code-label">Access Code</span>
                        <span className="flow-card-code-value">{room.roomCode}</span>
                      </div>
                      <div className="flow-card-actions">
                        <button
                          className="flow-btn-enter-live"
                          onClick={() => navigate(`/room/${room._id}`)}
                        >
                          🔥 Enter Live Room
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ALL CLASSES OVERVIEW */}
            <div className="flow-section-box">
              <div className="flow-section-header">
                <h3 className="flow-section-title">
                  <span>📋</span> All Sessions Overview
                </h3>
                <span className="flow-section-count">{filteredRooms.length} Total</span>
              </div>

              {filteredRooms.length === 0 ? (
                <div className="flow-empty-state">
                  <div className="flow-empty-icon">📂</div>
                  <p>No classes found. Click "Create Live Class" to get started!</p>
                </div>
              ) : (
                <div className="flow-classes-grid">
                  {filteredRooms.map((room) => (
                    <div key={room._id} className="flow-class-card">
                      <div className="flow-card-top">
                        <span className={room.isActive ? 'flow-badge-live' : 'flow-badge-inactive'}>
                          {room.isActive ? (
                            <>
                              <span className="flow-badge-live-dot"></span> Active
                            </>
                          ) : (
                            'Inactive'
                          )}
                        </span>
                        <span className="flow-card-duration">⏱️ {room.duration} Min</span>
                      </div>
                      <h4 className="flow-card-title">{room.title}</h4>
                      <div className="flow-card-code-box">
                        <span className="flow-card-code-label">Code</span>
                        <span className="flow-card-code-value">{room.roomCode}</span>
                      </div>
                      <div className="flow-card-actions">
                        <div className="flow-btn-group-2">
                          {room.isActive ? (
                            <button
                              className="flow-btn-enter-live"
                              style={{ flex: 1 }}
                              onClick={() => navigate(`/room/${room._id}`)}
                            >
                              Enter
                            </button>
                          ) : (
                            <button
                              className="flow-btn-start"
                              onClick={() => handleStartRoom(room._id)}
                            >
                              ▶ Start
                            </button>
                          )}
                          <button
                            className="flow-btn-secondary"
                            onClick={() => navigate(`/room/${room._id}`)}
                          >
                            📁 Re-open
                          </button>
                        </div>
                        <div className="flow-btn-group-2">
                          <button
                            className="flow-btn-secondary"
                            onClick={() => handleViewAttendance(room._id)}
                          >
                            📊 Report
                          </button>
                          <button
                            className="flow-btn-secondary"
                            onClick={() => handleExportAttendance(room._id)}
                          >
                            📥 Excel
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 'classes':
        return (
          <div className="flow-section-box">
            <div className="flow-section-header">
              <div>
                <h3 className="flow-section-title">📚 My Live Classes</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0 0' }}>
                  Manage, monitor, and enter your interactive classrooms
                </p>
              </div>
              <button className="flow-glow-pill-btn" onClick={() => setShowModal(true)}>
                + New Class
              </button>
            </div>
            {filteredRooms.length === 0 ? (
              <div className="flow-empty-state">
                <div className="flow-empty-icon">📚</div>
                <p>No classes found.</p>
              </div>
            ) : (
              <div className="flow-classes-grid">
                {filteredRooms.map((room) => (
                  <div key={room._id} className="flow-class-card">
                    <div className="flow-card-top">
                      <span className={room.isActive ? 'flow-badge-live' : 'flow-badge-inactive'}>
                        {room.isActive ? (
                          <>
                            <span className="flow-badge-live-dot"></span> Live
                          </>
                        ) : (
                          'Completed'
                        )}
                      </span>
                      <span className="flow-card-duration">⏱️ {room.duration} Mins</span>
                    </div>
                    <h4 className="flow-card-title">{room.title}</h4>
                    <div className="flow-card-code-box">
                      <span className="flow-card-code-label">Room Code</span>
                      <span className="flow-card-code-value">{room.roomCode}</span>
                    </div>
                    <div className="flow-card-actions">
                      {room.isActive ? (
                        <button
                          className="flow-btn-enter-live"
                          onClick={() => navigate(`/room/${room._id}`)}
                        >
                          🔥 Enter Live Room
                        </button>
                      ) : (
                        <button
                          className="flow-btn-secondary"
                          onClick={() => navigate(`/room/${room._id}`)}
                        >
                          📁 Re-enter Room
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'attendance':
        return (
          <div className="flow-section-box">
            <div className="flow-section-header">
              <div>
                <h3 className="flow-section-title">✅ Attendance Logs</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0 0' }}>
                  Detailed student attendance tracking with AI face verification
                </p>
              </div>
            </div>
            <div className="flow-classes-grid">
              {filteredRooms.map((room) => (
                <div key={room._id} className="flow-class-card">
                  <h4 className="flow-card-title">{room.title}</h4>
                  <div className="flow-card-code-box">
                    <span className="flow-card-code-label">Session Code</span>
                    <span className="flow-card-code-value">{room.roomCode}</span>
                  </div>
                  <div className="flow-card-actions">
                    <button
                      className="flow-btn-enter-live"
                      onClick={() => handleViewAttendance(room._id)}
                    >
                      📊 View Attendance Report
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'quiz':
        return (
          <div className="flow-section-box">
            <div className="flow-section-header">
              <div>
                <h3 className="flow-section-title">🏆 Quiz Score Hub</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0 0' }}>
                  Manage student quiz results and performance scores
                </p>
              </div>
            </div>
            <div className="flow-classes-grid">
              {filteredRooms.map((room) => (
                <div key={room._id} className="flow-class-card">
                  <h4 className="flow-card-title">{room.title}</h4>
                  <div className="flow-card-code-box">
                    <span className="flow-card-code-label">Code</span>
                    <span className="flow-card-code-value">{room.roomCode}</span>
                  </div>
                  <div className="flow-card-actions">
                    <button
                      className="flow-btn-enter-live"
                      onClick={() => alert('Opening Quiz Sheet for ' + room.title)}
                    >
                      🏆 View Quiz Results
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'export':
        return (
          <div className="flow-section-box" style={{ textAlign: 'center', padding: '40px 24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📥</div>
            <h3 className="flow-section-title" style={{ justifyContent: 'center', marginBottom: '8px' }}>
              Export Attendance to Excel
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '440px', margin: '0 auto 28px' }}>
              Download comprehensive attendance, face detection, and interaction logs directly as .xlsx spreadsheets.
            </p>
            <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {filteredRooms.map((room) => (
                <div key={room._id} className="flow-class-card" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ textAlign: 'left' }}>
                    <h4 className="flow-card-title" style={{ fontSize: '16px' }}>{room.title}</h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0 0 0' }}>Code: {room.roomCode}</p>
                  </div>
                  <button className="flow-glow-pill-btn" style={{ padding: '8px 20px', fontSize: '12px' }} onClick={() => handleExportAttendance(room._id)}>
                    📥 Download
                  </button>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        const tabInfo = {
          performance: { icon: '📊', title: 'Performance Analytics', desc: 'Real-time telemetry and engagement metrics for students.' },
          recording: { icon: '🎬', title: 'Cloud Recordings', desc: 'Access recorded session feeds and whiteboard replays.' },
          message: { icon: '💬', title: 'Messages & Student Chat', desc: 'Direct broadcast announcements and student communications.' },
        };
        const info = tabInfo[activeTab] || { icon: '📄', title: activeTab, desc: '' };
        return (
          <div className="flow-section-box" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '50px', marginBottom: '16px' }}>{info.icon}</div>
            <h3 className="flow-section-title" style={{ justifyContent: 'center', marginBottom: '8px' }}>{info.title}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '420px', margin: '0 auto' }}>{info.desc}</p>
            <span className="flow-hero-badge" style={{ marginTop: '20px' }}>Coming Soon</span>
          </div>
        );
    }
  };

  return (
    <div className="teacher-flow-page">
      {/* SIDEBAR */}
      <aside className="flow-sidebar">
        <div>
          <div className="flow-sidebar-logo">
            <h1 className="flow-logo-text">ClassMeet</h1>
            <p className="flow-logo-sub">Teacher Flow</p>
          </div>

          <nav className="flow-nav">
            {menuItems.map((item) => (
              <button
                key={item.id}
                className={`flow-nav-btn ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <span className="flow-nav-label">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="flow-sidebar-bottom">
          <div className="flow-user-card">
            <div className="flow-user-avatar">
              {user?.name?.charAt(0)?.toUpperCase() || 'T'}
            </div>
            <div className="flow-user-info">
              <p className="flow-user-name">{user?.name || 'Educator'}</p>
              <p className="flow-user-role">Teacher Pro</p>
            </div>
          </div>
          <button className="flow-logout-btn" onClick={logoutUser}>
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <main className="flow-main">
        {/* Top Floating Glass Bar */}
        <header className="flow-topbar">
          <div className="flow-topbar-left">
            <div className="flow-brand-tag">
              <span>✦</span> Live Class
            </div>
            <div className="flow-search-pill">
              <span>🔍</span>
              <input
                type="text"
                className="flow-search-input"
                placeholder="Search classes or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button className="flow-dark-pill-btn" onClick={() => setShowModal(true)}>
              + Create Class
            </button>
          </div>
        </header>

        {/* Content Section */}
        {renderContent()}
      </main>

      {/* CREATE CLASS MODAL */}
      {showModal && (
        <div className="flow-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="flow-modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 className="flow-modal-title">Create Live Session</h3>
            <p className="flow-modal-subtitle">
              Configure parameters for your intelligent interactive live room
            </p>

            {error && <div className="flow-modal-error">{error}</div>}

            <form onSubmit={handleCreateRoom}>
              <div className="flow-form-group">
                <label className="flow-form-label">Class Title</label>
                <input
                  type="text"
                  className="flow-form-input"
                  placeholder="e.g. Artificial Intelligence & Vision"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="flow-form-group">
                <label className="flow-form-label">Duration</label>
                <select
                  className="flow-form-select"
                  value={isCustom ? 'custom' : duration}
                  onChange={(e) => {
                    if (e.target.value === 'custom') {
                      setIsCustom(true);
                      setDuration('');
                    } else {
                      setIsCustom(false);
                      setDuration(Number(e.target.value));
                    }
                  }}
                >
                  <option value={30}>30 Minutes</option>
                  <option value={45}>45 Minutes</option>
                  <option value={60}>60 Minutes (Standard)</option>
                  <option value={90}>90 Minutes</option>
                  <option value={120}>120 Minutes</option>
                </select>

                {isCustom && (
                  <input
                    type="number"
                    className="flow-form-input"
                    style={{ marginTop: '8px' }}
                    placeholder="Enter duration in minutes"
                    min="1"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    required
                  />
                )}
              </div>

              <div className="flow-modal-actions">
                <button
                  type="button"
                  className="flow-modal-cancel"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flow-modal-submit"
                  disabled={loading}
                >
                  {loading ? 'Creating Flow...' : 'Launch Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
