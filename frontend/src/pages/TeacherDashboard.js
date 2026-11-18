import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiHome, FiBookOpen, FiCalendar, FiUsers, FiBarChart2, FiBell, FiSettings, FiHelpCircle, FiUser, FiSearch, FiChevronDown, FiLogOut } from 'react-icons/fi';
import TeacherSettings from './TeacherSettings';
import AccountView from './AccountView';
import SettingsView from './SettingsView';
import HelpSupportView from './HelpSupportView';
import { createRoom, getMyRooms, startRoom } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './TeacherDashboard.css';

/* ── Sidebar navigation definition ─────────────────────────── */
const NAV_SECTIONS = [
  {
    section: null,
    items: [
      { id: 'dashboard',     label: 'Dashboard',             icon: FiHome,      subs: [] },
      { id: 'classes',       label: 'My Classes',            icon: FiBookOpen,  subs: ['Create Class', 'Manage Classes', 'Live Classroom', 'Class Recordings'] },
      { id: 'schedule',      label: 'Schedule',              icon: FiCalendar,  subs: ['Calendar', 'Upcoming Classes'] },
      { id: 'students',      label: 'Students',              icon: FiUsers,     subs: ['Student List', 'Student Profiles'] },
      { id: 'attendance',    label: 'Attendance & Reports',  icon: FiBarChart2, subs: ['Automated Attendance', 'AI Proctoring', 'Engagement Reports', 'Export Excel / PDF'] },
      { id: 'notifications', label: 'Notifications',         icon: FiBell,      subs: ['System Alerts', 'Student Alerts'] },
    ],
  },
  {
    section: null,
    items: [
      { id: 'help',     label: 'Help & Support', icon: FiHelpCircle, subs: [] },
      { id: 'settings', label: 'Settings',       icon: FiSettings,   subs: [] },
      { id: 'account',  label: 'Account',       icon: FiUser,       subs: [] },
    ],
  },
];

/* ── mock data for demo widgets ─────────────────────────────── */
const MOCK_SCHEDULE = [
  { date: 'Nov 18', time: '10:00', ampm: 'AM', name: 'Advanced Mathematics', duration: '60 min', students: 28, status: 'today' },
  { date: 'Nov 18', time: '01:30', ampm: 'PM', name: 'Physics — Wave Optics', duration: '45 min', students: 22, status: 'today' },
  { date: 'Nov 19', time: '03:00', ampm: 'PM', name: 'Computer Science Lab', duration: '90 min', students: 18, status: 'upcoming' },
  { date: 'Nov 19', time: '05:00', ampm: 'PM', name: 'Chemistry Revision', duration: '60 min', students: 25, status: 'upcoming' },
];

const MOCK_ATTENDANCE = [
  { label: 'Advanced Mathematics', pct: 94 },
  { label: 'Physics — Optics', pct: 88 },
  { label: 'CS Lab', pct: 76 },
  { label: 'Chemistry Rev.', pct: 61 },
];

const MOCK_ACTIVITY = [
  { icon: '✅', color: 'green',  text: <><strong>Rahima Khatun</strong> marked attendance in Advanced Mathematics</>,   time: '2 min ago' },
  { icon: '🔴', color: 'red',   text: <><strong>Sakib Al Hasan</strong> was absent in Physics class</>,               time: '15 min ago' },
  { icon: '📝', color: 'blue',  text: <><strong>Quiz #4</strong> submitted by 24 students in CS Lab</>,               time: '32 min ago' },
  { icon: '⚠️', color: 'orange',text: <><strong>System alert:</strong> AI proctoring flagged 2 students</>,          time: '1 hr ago' },
  { icon: '🏆', color: 'purple',text: <><strong>Nadia Islam</strong> scored 100% in Chemistry quiz</>,               time: '2 hr ago' },
];

/* ── Helpers ─────────────────────────────────────────────────── */
const attClass = (p) => p >= 85 ? 'high' : p >= 65 ? 'mid' : 'low';

/* ================================================================
   COMPONENT
   ================================================================ */
const TeacherDashboard = () => {
  const [activeTab,   setActiveTab]   = useState('dashboard');
  const [openMenus,   setOpenMenus]   = useState({ dashboard: true });
  const [rooms,       setRooms]       = useState([]);
  const [title,       setTitle]       = useState('');
  const [duration,    setDuration]    = useState(60);
  const [isCustom,    setIsCustom]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [showModal,   setShowModal]   = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [unreadCount] = useState(3);
  const profileRef = useRef(null);
  const [profilePic, setProfilePic] = useState(() => localStorage.getItem('profilePic') || null);
  const [profileName, setProfileName] = useState(() => (JSON.parse(localStorage.getItem('user') || '{}').name) || 'Educator');
  const [profileDesignation, setProfileDesignation] = useState(() => (JSON.parse(localStorage.getItem('user') || '{}').designation) || 'Lecturer');

  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { fetchRooms(); }, []);

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchRooms = async () => {
    try { const { data } = await getMyRooms(); setRooms(data); }
    catch (err) { console.error('Error fetching rooms:', err); }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await createRoom({ title, duration });
      setTitle(''); setDuration(60); setIsCustom(false); setShowModal(false);
      fetchRooms();
    } catch (err) { setError(err.response?.data?.message || 'Failed to create room'); }
    setLoading(false);
  };

  const handleStartRoom = async (id) => {
    try { await startRoom(id); fetchRooms(); }
    catch (err) { console.error('Error starting room:', err); }
  };

  const handleViewAttendance   = (roomId) => navigate(`/attendance/${roomId}`);

  const handleExportAttendance = async (roomId) => {
    try {
      const userData = JSON.parse(localStorage.getItem('user'));
      const response = await axios.get(
        `http://localhost:5000/api/export/attendance/${roomId}`,
        { headers: { authorization: `Bearer ${userData?.token}` }, responseType: 'blob' }
      );
      const url  = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href  = url;
      link.setAttribute('download', `attendance_${roomId}.xlsx`);
      document.body.appendChild(link);
      link.click(); link.remove();
    } catch { alert('Export failed!'); }
  };

  const toggleMenu = (id) => setOpenMenus(prev => ({ ...prev, [id]: !prev[id] }));

  const handleNavClick = (id, hasSubs) => {
    setActiveTab(id);
    if (hasSubs) toggleMenu(id);
  };

  const filteredRooms = rooms.filter(r =>
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.roomCode.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const activeRooms = filteredRooms.filter(r => r.isActive);

  /* ── Stats computed ─────────────────────────────────────── */
  const statsData = [
    { label: 'Total Students', value: '248', icon: FiUsers,    color: 'blue',   change: '+12 this week', dir: 'up' },
    { label: 'Active Classes',  value: activeRooms.length.toString().padStart(2,'0'),
                                               icon: FiBookOpen, color: 'teal',   change: 'Live right now', dir: 'neu' },
    { label: 'Scheduled Today', value: '04',  icon: FiCalendar, color: 'purple', change: '2 completed',    dir: 'neu' },
    { label: 'Avg Attendance',  value: '91%', icon: FiBarChart2,color: 'green',  change: '+3% vs last week', dir: 'up' },
  ];

  /* ── renderContent ─────────────────────────────────────── */
  const renderContent = () => {
    switch (activeTab) {

      /* ───────── DASHBOARD ───────── */
      case 'dashboard':
        return (
          <>
            {/* Quick Stats */}
            <div className="cm-stats-row">
              {statsData.map((s, i) => (
                <div key={i} className="cm-stat-card">
                  <div className="cm-stat-top">
                    <div className="cm-stat-label">{s.label}</div>
                    <div className={`cm-stat-icon ${s.color}`}><s.icon size={20} /></div>
                  </div>
                  <div className="cm-stat-value">{s.value}</div>
                  <div className={`cm-stat-change ${s.dir}`}>
                    <span className="cm-stat-change-dot">{s.dir === 'up' ? '↑' : s.dir === 'down' ? '↓' : '●'}</span>
                    {s.change}
                  </div>
                </div>
              ))}
            </div>

            {/* Live Classes + Schedule */}
            <div className="cm-grid-2">
              {/* Live Classes */}
              <div className="cm-card">
                <div className="cm-card-header">
                  <div className="cm-card-title">
                    <div className="cm-card-title-icon">📡</div>
                    Live Classroom Status
                  </div>
                  <button className="cm-card-action" onClick={() => setShowModal(true)}>+ New Class</button>
                </div>
                <div className="cm-live-list">
                  {activeRooms.length === 0 ? (
                    <div className="cm-empty">
                      <div className="cm-empty-icon">☕</div>
                      <div className="cm-empty-title">No Active Classes</div>
                      <div className="cm-empty-desc">Start or create a class to see live status here.</div>
                      <button className="cm-empty-btn" onClick={() => setShowModal(true)}>+ Create Live Class</button>
                    </div>
                  ) : (
                    activeRooms.map((room, i) => (
                      <div key={room._id} className="cm-live-item">
                        <div className="cm-live-dot-wrap">
                          📺
                          <span className="cm-live-pulse"></span>
                        </div>
                        <div className="cm-live-info">
                          <div className="cm-live-class-name">{room.title}</div>
                          <div className="cm-live-meta">
                            <span>👥 {20 + i * 4} students</span>
                            <span>⏱ {room.duration} min</span>
                            <span>#{room.roomCode}</span>
                          </div>
                        </div>
                        <div className="cm-live-badge">
                          <span className="cm-live-badge-dot"></span> Live
                        </div>
                        <button className="cm-join-btn" onClick={() => navigate(`/room/${room._id}`)}>
                          Join →
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Upcoming Schedule */}
              <div className="cm-card">
                <div className="cm-card-header">
                  <div className="cm-card-title">
                    <div className="cm-card-title-icon">📅</div>
                    Upcoming Schedule
                  </div>
                  <button className="cm-card-action" onClick={() => setActiveTab('schedule')}>View All</button>
                </div>
                <div className="cm-schedule-list">
                  {MOCK_SCHEDULE.slice(0, 4).map((s, i) => (
                    <div key={i} className="cm-schedule-item">
                      <div className="cm-schedule-time-badge">
                        <span className="cm-schedule-time">{s.time}</span>
                        <span className="cm-schedule-ampm">{s.ampm}</span>
                      </div>
                      <div className="cm-schedule-info">
                        <div className="cm-schedule-class-name">{s.name}</div>
                        <div className="cm-schedule-meta">
                          <span>📅 {s.date}</span>
                          <span className="cm-schedule-dot">·</span>
                          <span>⏱ {s.duration}</span>
                          <span className="cm-schedule-dot">·</span>
                          <span>👥 {s.students} students</span>
                        </div>
                      </div>
                      <span className={`cm-schedule-status ${s.status}`}>
                        {s.status === 'today' ? 'Today' : 'Upcoming'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Attendance + Activity */}
            <div className="cm-grid-2">
              {/* Attendance */}
              <div className="cm-card">
                <div className="cm-card-header">
                  <div className="cm-card-title">
                    <div className="cm-card-title-icon">📊</div>
                    Recent Attendance & Engagement
                  </div>
                  <button className="cm-card-action" onClick={() => setActiveTab('attendance')}>View Reports</button>
                </div>
                <div className="cm-attendance-list">
                  {MOCK_ATTENDANCE.map((a, i) => (
                    <div key={i} className="cm-att-row">
                      <div className="cm-att-label">{a.label}</div>
                      <div className="cm-att-bar-wrap">
                        <div className={`cm-att-bar ${attClass(a.pct)}`} style={{ width: `${a.pct}%` }}></div>
                      </div>
                      <div className="cm-att-pct">{a.pct}%</div>
                    </div>
                  ))}
                </div>

                {/* Engagement */}
                <div className="cm-engagement-block">
                  <div className="cm-engagement-title">Student Engagement</div>
                  {[
                    { label: 'Participation', pct: 82, color: 'high' },
                    { label: 'Quiz Completion', pct: 74, color: 'mid' },
                    { label: 'Hand Raises', pct: 61, color: 'low' },
                  ].map((e, i) => (
                    <div key={i} className="cm-att-row">
                      <div className="cm-att-label">{e.label}</div>
                      <div className="cm-att-bar-wrap">
                        <div className={`cm-att-bar ${e.color}`} style={{ width: `${e.pct}%` }}></div>
                      </div>
                      <div className="cm-att-pct">{e.pct}%</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity Feed */}
              <div className="cm-card">
                <div className="cm-card-header">
                  <div className="cm-card-title">
                    <div className="cm-card-title-icon">🕒</div>
                    Recent Activity
                  </div>
                </div>
                <div className="cm-activity-list">
                  {MOCK_ACTIVITY.map((a, i) => (
                    <div key={i} className="cm-activity-item">
                      <div className={`cm-activity-icon ${a.color}`}>{a.icon}</div>
                      <div className="cm-activity-body">
                        <div className="cm-activity-text">{a.text}</div>
                        <div className="cm-activity-time">{a.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        );

      /* ───────── MY CLASSES ───────── */
      case 'classes':
        return (
          <div className="cm-card">
            <div className="cm-card-header">
              <div className="cm-card-title">
                <div className="cm-card-title-icon">📚</div>
                My Classes
              </div>
              <button className="cm-card-action" onClick={() => setShowModal(true)}>+ Create Class</button>
            </div>
            {filteredRooms.length === 0 ? (
              <div className="cm-empty">
                <div className="cm-empty-icon">📚</div>
                <div className="cm-empty-title">No Classes Yet</div>
                <div className="cm-empty-desc">Create your first live classroom session to get started.</div>
                <button className="cm-empty-btn" onClick={() => setShowModal(true)}>+ Create First Class</button>
              </div>
            ) : (
              <div className="cm-table-wrap">
                <table className="cm-table">
                  <thead>
                    <tr>
                      <th>Class Name</th>
                      <th>Room Code</th>
                      <th>Duration</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRooms.map(room => (
                      <tr key={room._id}>
                        <td><span className="cm-table-class-name">{room.title}</span></td>
                        <td><span className="cm-table-code">{room.roomCode}</span></td>
                        <td>{room.duration} min</td>
                        <td>
                          <span className={`cm-badge ${room.isActive ? 'live' : 'done'}`}>
                            {room.isActive ? '● Live' : 'Completed'}
                          </span>
                        </td>
                        <td>
                          {room.isActive ? (
                            <button className="cm-tbl-btn primary" onClick={() => navigate(`/room/${room._id}`)}>Enter →</button>
                          ) : (
                            <button className="cm-tbl-btn" onClick={() => handleStartRoom(room._id)}>▶ Start</button>
                          )}
                          <button className="cm-tbl-btn" onClick={() => handleViewAttendance(room._id)}>📊 Report</button>
                          <button className="cm-tbl-btn" onClick={() => handleExportAttendance(room._id)}>📥 Excel</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );

      /* ───────── SCHEDULE ───────── */
      case 'schedule':
        return (
          <div className="cm-card">
            <div className="cm-card-header">
              <div className="cm-card-title"><div className="cm-card-title-icon">📅</div>Schedule & Calendar</div>
            </div>
            <div className="cm-schedule-list">
              {MOCK_SCHEDULE.map((s, i) => (
                <div key={i} className="cm-schedule-item">
                  <div className="cm-schedule-time-badge">
                    <span className="cm-schedule-time">{s.time}</span>
                    <span className="cm-schedule-ampm">{s.ampm}</span>
                  </div>
                  <div className="cm-schedule-info">
                    <div className="cm-schedule-class-name">{s.name}</div>
                    <div className="cm-schedule-meta">
                      <span>📅 {s.date}</span>
                      <span className="cm-schedule-dot">·</span>
                      <span>⏱ {s.duration}</span>
                      <span className="cm-schedule-dot">·</span>
                      <span>👥 {s.students} students</span>
                    </div>
                  </div>
                  <span className={`cm-schedule-status ${s.status}`}>
                    {s.status === 'today' ? 'Today' : 'Upcoming'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );

      /* ───────── STUDENTS ───────── */
      case 'students':
        return (
          <div className="cm-placeholder-page">
            <div className="cm-placeholder-icon">👥</div>
            <div className="cm-placeholder-title">Student Management</div>
            <div className="cm-placeholder-desc">
              View and manage student lists, profiles, and enrollment. Advanced student management features are coming soon.
            </div>
            <span className="cm-coming-pill">🚀 Coming Soon</span>
          </div>
        );

      /* ───────── ATTENDANCE & REPORTS ───────── */
      case 'attendance':
        return (
          <>
            <div className="cm-card" style={{ marginBottom: 20 }}>
              <div className="cm-card-header">
                <div className="cm-card-title"><div className="cm-card-title-icon">📊</div>Attendance & Reports</div>
              </div>
              <div className="cm-attendance-list">
                {MOCK_ATTENDANCE.map((a, i) => (
                  <div key={i} className="cm-att-row">
                    <div className="cm-att-label">{a.label}</div>
                    <div className="cm-att-bar-wrap">
                      <div className={`cm-att-bar ${attClass(a.pct)}`} style={{ width: `${a.pct}%` }}></div>
                    </div>
                    <div className="cm-att-pct">{a.pct}%</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="cm-card">
              <div className="cm-card-header">
                <div className="cm-card-title"><div className="cm-card-title-icon">📥</div>Export Reports</div>
              </div>
              {filteredRooms.length === 0 ? (
                <div className="cm-empty">
                  <div className="cm-empty-icon">📂</div>
                  <div className="cm-empty-title">No classes yet</div>
                </div>
              ) : (
                <div className="cm-table-wrap">
                  <table className="cm-table">
                    <thead>
                      <tr>
                        <th>Class Name</th>
                        <th>Code</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRooms.map(room => (
                        <tr key={room._id}>
                          <td><span className="cm-table-class-name">{room.title}</span></td>
                          <td><span className="cm-table-code">{room.roomCode}</span></td>
                          <td>
                            <button className="cm-tbl-btn" onClick={() => handleViewAttendance(room._id)}>📊 View Report</button>
                            <button className="cm-tbl-btn" onClick={() => handleExportAttendance(room._id)}>📥 Export Excel</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        );

      /* ───────── NOTIFICATIONS ───────── */
      case 'notifications':
        return (
          <div className="cm-card">
            <div className="cm-card-header">
              <div className="cm-card-title"><div className="cm-card-title-icon">🔔</div>Notifications</div>
            </div>
            <div className="cm-activity-list">
              {MOCK_ACTIVITY.map((a, i) => (
                <div key={i} className="cm-activity-item">
                  <div className={`cm-activity-icon ${a.color}`}>{a.icon}</div>
                  <div className="cm-activity-body">
                    <div className="cm-activity-text">{a.text}</div>
                    <div className="cm-activity-time">{a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      /* ───────── SETTINGS ───────── */
      case 'help':
        return <HelpSupportView />;
      case 'settings':
        return <SettingsView />;
      case 'account':
        return <AccountView profilePic={profilePic} setProfilePic={setProfilePic} profileName={profileName} setProfileName={setProfileName} profileDesignation={profileDesignation} setProfileDesignation={setProfileDesignation} />;

      default:
        return null;
    }
  };

  /* ── Page title lookup ───────────────────────────────── */
  const PAGE_INFO = {
    dashboard:     { title: 'Dashboard',             sub: "Here's what's happening in your classroom today." },
    classes:       { title: 'My Classes',             sub: 'Manage, monitor, and enter your interactive classrooms.' },
    schedule:      { title: 'Schedule',               sub: 'View your upcoming classes and teaching calendar.' },
    students:      { title: 'Students',               sub: 'Manage student lists and individual profiles.' },
    attendance:    { title: 'Attendance & Reports',   sub: 'AI-powered attendance tracking and detailed reports.' },
    notifications: { title: 'Notifications',          sub: 'System and student alerts.' },
    settings:      { title: 'Settings',               sub: 'Manage classroom, AI, and proctoring rules.' },
    help:          { title: 'Help & Support',          sub: 'Get help and report issues.' },
    account:       { title: 'Account',                sub: 'Manage your profile and account settings.' },
  };
  const page = PAGE_INFO[activeTab] || PAGE_INFO['dashboard'];

  /* ══════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════ */
  return (
    <div className="cm-dashboard">

      {/* ═══ SIDEBAR ═══ */}
      <aside className="cm-sidebar">

        {/* Logo */}
        <div className="cm-sidebar-logo">
          <div className="cm-logo-wrap">
            <div className="cm-logo-icon">🎓</div>
            <div>
              <div className="cm-logo-text">ClassMeet</div>
              <div className="cm-logo-badge">Teacher Panel</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="cm-nav">
          {NAV_SECTIONS.map((group, gi) => (
            <div key={gi} className="cm-nav-section">
              {group.section && (
                <div className="cm-nav-section-title">{group.section}</div>
              )}
              {group.items.map(item => (
                <div key={item.id}>
                  <button
                    className={`cm-nav-item ${activeTab === item.id ? 'active' : ''} ${openMenus[item.id] ? 'open' : ''}`}
                    onClick={() => handleNavClick(item.id, item.subs.length > 0)}
                  >
                    <span className="cm-nav-item-icon"><item.icon size={18} /></span>
                    <span className="cm-nav-item-label">{item.label}</span>
                    {item.subs.length > 0 && (
                      <span className="cm-nav-item-arrow">›</span>
                    )}
                  </button>

                  {/* Sub-menu */}
                  {item.subs.length > 0 && (
                    <div className={`cm-nav-submenu ${openMenus[item.id] ? 'open' : ''}`}>
                      {item.subs.map((sub, si) => (
                        <button
                          key={si}
                          className="cm-nav-subitem"
                          onClick={() => setActiveTab(item.id)}
                        >
                          <span className="cm-nav-subitem-dot"></span>
                          {sub}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="cm-sidebar-footer">
          <div className="cm-profile-wrap" ref={profileRef}>
            <div className="cm-user-card" onClick={() => setProfileOpen(p => !p)}>
              <div className="cm-user-avatar">
                {profilePic ? (
                  <img src={profilePic} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  user?.name?.charAt(0)?.toUpperCase() || 'T'
                )}
              </div>
              <div>
                <div className="cm-user-name">{profileName || 'Educator'}</div>
                <div className="cm-user-role">Teacher</div>
              </div>
            </div>
            {profileOpen && (
              <div className="cm-profile-dropdown sidebar">
                <button className="cm-profile-dropdown-item" onClick={() => { setProfileOpen(false); logoutUser(); }}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ═══ MAIN AREA ═══ */}
      <div className="cm-main">

        {/* Top Bar */}
        <header className="cm-topbar">
          <div className="cm-topbar-left">
            <div className="cm-topbar-greeting">{activeTab === 'dashboard' ? `Welcome back, ${user?.name?.split(' ')[0] || 'Teacher'}!` : (page.title || 'Dashboard')}</div>
            <div className="cm-topbar-sub">{page.sub}</div>
          </div>

          <div className="cm-topbar-right">
            {/* Search */}
            <div className="cm-search-wrap">
              <span className="cm-search-icon"><FiSearch size={15} /></span>
              <input
                type="text"
                className="cm-search-input"
                placeholder="Search classes, students..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Notification bell */}
            <button className="cm-notif-btn" title="Notifications" onClick={() => setActiveTab('notifications')}>
              <FiBell size={17} />
              <span className="cm-notif-badge">{unreadCount}</span>
            </button>


            {/* Create CTA */}
            <button className="cm-create-btn" onClick={() => setShowModal(true)}>
              + Create Class
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="cm-content">
          {/* Page header */}
          <div className="cm-page-header">
            <div>
              <div className="cm-page-title">{page.title}</div>
            </div>
          </div>

          {renderContent()}
        </main>
      </div>

      {/* ═══ CREATE CLASS MODAL ═══ */}
      {showModal && (
        <div className="cm-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="cm-modal-box" onClick={e => e.stopPropagation()}>
            <div className="cm-modal-header">
              <div>
                <div className="cm-modal-title">Create Live Session</div>
                <div className="cm-modal-sub">Configure your intelligent interactive live classroom</div>
              </div>
              <button className="cm-modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            {error && <div className="cm-modal-error">{error}</div>}

            <form onSubmit={handleCreateRoom}>
              <div className="cm-form-group">
                <label className="cm-form-label">Class Title</label>
                <input
                  type="text"
                  className="cm-form-input"
                  placeholder="e.g. Advanced Mathematics — Chapter 5"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="cm-form-group">
                <label className="cm-form-label">Duration</label>
                <select
                  className="cm-form-select"
                  value={isCustom ? 'custom' : duration}
                  onChange={e => {
                    if (e.target.value === 'custom') { setIsCustom(true); setDuration(''); }
                    else { setIsCustom(false); setDuration(Number(e.target.value)); }
                  }}
                >
                  <option value={30}>30 Minutes</option>
                  <option value={45}>45 Minutes</option>
                  <option value={60}>60 Minutes (Standard)</option>
                  <option value={90}>90 Minutes</option>
                  <option value={120}>120 Minutes</option>
                  <option value="custom">Custom...</option>
                </select>
                {isCustom && (
                  <input
                    type="number"
                    className="cm-form-input"
                    style={{ marginTop: 8 }}
                    placeholder="Enter duration in minutes"
                    min="1"
                    value={duration}
                    onChange={e => setDuration(Number(e.target.value))}
                    required
                  />
                )}
              </div>

              <div className="cm-modal-actions">
                <button type="button" className="cm-modal-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="cm-modal-submit" disabled={loading}>
                  {loading ? 'Creating...' : '🚀 Launch Class'}
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
