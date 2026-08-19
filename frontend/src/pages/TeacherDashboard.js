import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRoom, getMyRooms, startRoom } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const TeacherDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [rooms, setRooms] = useState([]);
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(60);
  const [isCustom, setIsCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

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
      console.error(err);
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
      console.error(err);
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
        { headers: { authorization: `Bearer ${userData.token}` }, responseType: 'blob' }
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
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'classes', icon: '📚', label: 'My Classes' },
    { id: 'attendance', icon: '✅', label: 'Attendance' },
    { id: 'performance', icon: '📈', label: 'Performance' },
    { id: 'quiz', icon: '🏆', label: 'Quiz Score' },
    { id: 'export', icon: '📥', label: 'Export to Excel' },
    { id: 'recording', icon: '🎬', label: 'Recording' },
    { id: 'message', icon: '💬', label: 'Message' },
  ];

  const activeRooms = rooms.filter(r => r.isActive);

  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard':
        return (
          <div>
            {/* Stats Cards */}
            <div style={styles.statsGrid}>
              <div style={styles.statCardCustom}>
                <div style={styles.statRow}>
                  <p style={styles.statLabel}>Total Active Classes</p>
                  <span style={{fontSize:'20px'}}>📚</span>
                </div>
                <p style={styles.statNum}>{activeRooms.length.toString().padStart(2,'0')}</p>
              </div>
              <div style={styles.statCardCustom}>
                <div style={styles.statRow}>
                  <p style={styles.statLabel}>Avg. Attendance (Face AI)</p>
                  <span style={{fontSize:'20px'}}>👤</span>
                </div>
                <p style={styles.statNum}>92.4%</p>
              </div>
              <div style={styles.statCardCustom}>
                <div style={styles.statRow}>
                  <p style={styles.statLabel}>Total Classes</p>
                  <span style={{fontSize:'20px'}}>🏆</span>
                </div>
                <p style={styles.statNum}>{rooms.length.toString().padStart(2,'0')}</p>
              </div>
            </div>

            {/* Active Classes Section */}
            <div style={styles.scheduleBox}>
              <h3 style={styles.scheduleTitle}>🕐 Active Classes</h3>
              {activeRooms.length === 0 ? (
                <p style={styles.emptyText}>No active classes right now.</p>
              ) : (
                <div style={styles.classesGrid}>
                  {activeRooms.map(room => (
                    <div key={room._id} style={styles.classCardWhite}>
                      <div style={styles.cardHeaderCustom}>
                        <span style={{...styles.statusBadgeCustom, backgroundColor: '#76c8eb', color: '#004e77'}}>🟢 Live</span>
                        <span style={styles.durationBadgeCustom}>⏱️ {room.duration} Mins</span>
                      </div>
                      <h4 style={styles.cardTitleCustom}>{room.title}</h4>
                      <p style={styles.cardMetaText}>Code: <strong>{room.roomCode}</strong></p>
                      <div style={styles.cardFooterCustom}>
                        <button style={styles.enterBtn} onClick={() => navigate(`/room/${room._id}`)}>🔥 Enter Live Room</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* All Classes Overview */}
            <div style={styles.scheduleBox}>
              <h3 style={styles.scheduleTitle}>📋 All Classes Overview</h3>
              {rooms.length === 0 ? (
                <p style={styles.emptyText}>No classes yet. Create one!</p>
              ) : (
                <div style={styles.classesGrid}>
                  {rooms.map(room => (
                    <div key={room._id} style={styles.classCardWhite}>
                      <div style={styles.cardHeaderCustom}>
                        <span style={{...styles.statusBadgeCustom, backgroundColor: room.isActive ? '#cff1ff' : '#f1f5f9', color: room.isActive ? '#004e77' : '#64748b'}}>{room.isActive ? '🟢 Active' : '🔴 Inactive'}</span>
                        <span style={styles.durationBadgeCustom}>⏱️ {room.duration} Min</span>
                      </div>
                      <h4 style={styles.cardTitleCustom}>{room.title}</h4>
                      <p style={styles.cardMetaText}>Code: <strong>{room.roomCode}</strong></p>
                      <div style={{...styles.cardFooterCustom, display: 'flex', flexDirection:'column', gap: '8px'}}>
                        <div style={{display: 'flex', gap: '8px'}}>
                          {room.isActive ? (
                            <button style={{...styles.enterBtn, flex: 1}} onClick={() => navigate(`/room/${room._id}`)}>Enter</button>
                          ) : (
                            <button style={{...styles.startBtn, flex: 1}} onClick={() => handleStartRoom(room._id)}>Start</button>
                          )}
                          <button style={{...styles.enterBtn, backgroundColor: '#f1f5f9', color: '#004e77', border: '1px solid #cff1ff', flex: 1}} onClick={() => navigate(`/room/${room._id}`)}>📁 Re-open</button>
                        </div>
                        <div style={{display: 'flex', gap: '8px'}}>
                          <button style={{...styles.reportBtn, flex: 1}} onClick={() => handleViewAttendance(room._id)}>📊 Report</button>
                          <button style={{...styles.exportBtn, flex: 1}} onClick={() => handleExportAttendance(room._id)}>📥 Excel</button>
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
          <div>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={styles.tabTitle}>📚 My Classes</h3>
              <p style={styles.tabDesc}>Manage and check all your live classroom hubs here.</p>
            </div>
            {rooms.length === 0 ? (
              <div style={styles.centerContent}><p style={styles.emptyText}>No classes yet.</p></div>
            ) : (
              <div style={styles.classesGrid}>
                {rooms.map(room => (
                  <div key={room._id} style={styles.classCardWhite}>
                    <div style={styles.cardHeaderCustom}>
                      <span style={{...styles.statusBadgeCustom, backgroundColor: room.isActive ? '#cff1ff' : '#e2e8f0', color: room.isActive ? '#004e77' : '#475569'}}>{room.isActive ? '🟢 Live' : '🔴 Complete'}</span>
                      <span style={styles.durationBadgeCustom}>⏱️ {room.duration} Mins</span>
                    </div>
                    <h4 style={styles.cardTitleCustom}>{room.title}</h4>
                    <p style={styles.cardMetaText}>Room Code: <strong>{room.roomCode}</strong></p>
                    <div style={{...styles.cardFooterCustom, display: 'flex', flexDirection: 'column', gap: '8px'}}>
                      {room.isActive ? (
                        <button style={{...styles.enterBtn, width: '100%'}} onClick={() => navigate(`/room/${room._id}`)}>🔥 Enter Live Room</button>
                      ) : (
                        <button style={{...styles.enterBtn, backgroundColor: '#004e77', color: '#ffffff', width: '100%'}} onClick={() => navigate(`/room/${room._id}`)}>📁 Re-enter Room</button>
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
          <div>
            <div style={{marginBottom: '20px'}}>
              <h3 style={styles.tabTitle}>✅ Attendance Logs</h3>
              <p style={styles.tabDesc}>View and check attendance reports inside white cards.</p>
            </div>
            <div style={styles.classesGrid}>
              {rooms.map(room => (
                <div key={room._id} style={styles.classCardWhite}>
                  <h4 style={styles.cardTitleCustom}>{room.title}</h4>
                  <p style={{color: '#64748b', fontSize: '13px', margin: '4px 0'}}>Code: {room.roomCode}</p>
                  <div style={styles.cardFooterCustom}>
                    <button style={{...styles.reportBtn, width: '100%'}} onClick={() => handleViewAttendance(room._id)}>📊 View Report</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'quiz':
        return (
          <div>
            <div style={{marginBottom: '20px'}}>
              <h3 style={styles.tabTitle}>🏆 Quiz Score Hub</h3>
              <p style={styles.tabDesc}>Manage student quiz results and performance leaderboards.</p>
            </div>
            <div style={styles.classesGrid}>
              {rooms.map(room => (
                <div key={room._id} style={styles.classCardWhite}>
                  <h4 style={styles.cardTitleCustom}>{room.title}</h4>
                  <p style={{color: '#5fa5cb', fontSize: '13px', margin: '4px 0'}}>Code: {room.roomCode}</p>
                  <div style={styles.cardFooterCustom}>
                    <button style={{...styles.enterBtn, width: '100%', backgroundColor: '#004e77', color: '#ffffff'}} onClick={() => alert('Opening Quiz Sheet...')}>🏆 View Quiz Scores</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'export':
        return (
          <div style={styles.centerContent}>
            <div style={{fontSize:'60px', marginBottom:'16px'}}>📥</div>
            <h3 style={styles.tabTitle}>Export to Excel</h3>
            <p style={styles.tabDesc}>Download reports directly to spreadsheet format.</p>
            <div style={{marginTop:'24px', display:'flex', flexDirection:'column', gap:'12px'}}>
              {rooms.map(room => (
                <div key={room._id} style={styles.classItem}>
                  <div>
                    <h4 style={styles.className}>{room.title}</h4>
                    <p style={styles.classMeta}>Code: {room.roomCode}</p>
                  </div>
                  <button style={styles.exportBtn} onClick={() => handleExportAttendance(room._id)}>📥 Download Excel</button>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        const tabInfo = {
          performance: { icon: '📊', title: 'Performance Analytics', desc: 'Analytical charts tracking individual student performance metrics.' },
          recording: { icon: '🎬', title: 'Cloud Recordings', desc: 'Access prior class stream recordings.' },
          message: { icon: '💬', title: 'Messages & Chat', desc: 'Communicate with your students.' },
        };
        const info = tabInfo[activeTab] || { icon: '📄', title: activeTab, desc: '' };
        return (
          <div style={styles.centerContent}>
            <div style={{fontSize:'60px', marginBottom:'16px'}}>{info.icon}</div>
            <h3 style={styles.tabTitle}>{info.title}</h3>
            <p style={styles.tabDesc}>{info.desc}</p>
            <p style={{color:'#94a3b8', fontSize:'13px', marginTop:'12px'}}>Coming soon...</p>
          </div>
        );
    }
  };

  return (
    <div style={styles.page}>
      {/* SIDEBAR */}
      <aside style={styles.sidebar}>
        <div>
          <div style={styles.sidebarLogo}>
            <h1 style={styles.logoText}>Teacher Panel</h1>
            
          </div>
          <nav style={styles.nav}>
            {menuItems.map(item => (
              <button
                key={item.id}
                style={{...styles.menuBtn, ...(activeTab === item.id ? styles.menuBtnActive : {})}}
                onClick={() => setActiveTab(item.id)}
              >
                <span style={{fontSize:'18px'}}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div style={styles.sidebarBottom}>
          <div style={styles.userInfo}>
            <div style={styles.userAvatar}>{user?.name?.charAt(0)?.toUpperCase()}</div>
            <div>
              <p style={styles.userName}>{user?.name}</p>
              <p style={styles.userRole}>Teacher</p>
            </div>
          </div>
          <button style={styles.logoutBtn} onClick={logoutUser}>🚪 Logout</button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={styles.main}>
        <div style={styles.mainHeader}>
          <div>
            <h2 style={styles.pageTitle}>
              {activeTab === 'dashboard' ? 'Overview' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </h2>
            <p style={styles.pageSub}>Welcome back, {user?.name}! 👋</p>
          </div>
          <button style={styles.createBtn} onClick={() => setShowModal(true)}>➕ Create Class</button>
        </div>
        <div style={styles.contentBox}>{renderContent()}</div>
      </main>

      {/* CREATE CLASS MODAL */}
      {showModal && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Create New Live Session</h3>
            {error && <p style={styles.error}>{error}</p>}
            <form onSubmit={handleCreateRoom} style={styles.modalForm}>
              <div style={styles.formGroup}>
                <label style={styles.label}>CLASS TITLE</label>
                <input style={styles.input} type="text" placeholder="e.g. Computer Vision" value={title} onChange={e => setTitle(e.target.value)} required />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>DURATION</label>
                <select style={styles.input} value={isCustom ? 'custom' : duration} onChange={e => { if (e.target.value === 'custom') { setIsCustom(true); setDuration(''); } else { setIsCustom(false); setDuration(Number(e.target.value)); } }}>
                  <option value={30}>30 Minutes</option>
                  <option value={45}>45 Minutes</option>
                  <option value={60}>60 Minutes</option>
                  <option value={90}>90 Minutes</option>
                  <option value={120}>120 Minutes</option>
                </select>
                {isCustom && <input style={{...styles.input, marginTop:'8px'}} type="number" placeholder="Enter minutes" min="1" value={duration} onChange={e => setDuration(Number(e.target.value))} required />}
              </div>
              <div style={styles.modalBtns}>
                <button type="button" style={styles.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" style={styles.submitBtn} disabled={loading}>{loading ? 'Creating...' : 'Create Class'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  // ফুল স্ক্রিনের মেইন ব্যাকগ্রাউন্ড এখন স্ক্রিনশটের লাইট স্কাই-ব্লু (#cff1ff) কালার করা হয়েছে
  page: { display:'flex', height:'100vh', overflow:'hidden', backgroundColor:'#2c7391', fontFamily:'var(--font-sans)' },
  
  sidebar: { width:'240px', backgroundColor:'#ffffff', borderRight:'1px solid #bce6f7', display:'flex', flexDirection:'column', justifyComtent:'space-between', height:'100%', boxShadow:'2px 0 12px rgba(0,78,119,0.05)' },
  sidebarLogo: { padding:'30px 20px 16px', borderBottom:'1px solid #f1f5f9' },
  logoText: { fontSize:'30px', fontWeight:'800', color:'#004e77', letterSpacing:'-0.02em' },
  logoSub: { fontSize:'11px', fontWeight:'600', color:'#004e77', opacity: 0.7, marginTop:'2px' },
  nav: { padding:'12px 10px', display:'flex', flexDirection:'column', gap:'4px' },
  menuBtn: { width:'100%', display:'flex', alignItems:'center', gap:'12px', padding:'10px 14px', borderRadius:'12px', fontSize:'13px', fontWeight:'600', color:'#475569', border:'none', background:'transparent', cursor:'pointer', textAlign:'left', transition:'all 0.2s' },
  menuBtnActive: { backgroundColor:'#e2f5ff', color:'#004e77', fontWeight: '700' },
  sidebarBottom: { padding:'12px 10px', borderTop:'1px solid #f1f5f9' },
  userInfo: { display:'flex', alignItems:'center', gap:'10px', padding:'10px 14px', marginBottom:'8px' },
  userAvatar: { width:'36px', height:'36px', borderRadius:'50%', backgroundColor:'#cff1ff', color:'#004e77', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:'700', flexShrink:0 },
  userName: { color:'#004e77', fontSize:'13px', fontWeight:'600' },
  userRole: { color:'#64748b', fontSize:'11px' },
  logoutBtn: { width:'100%', padding:'10px 14px', borderRadius:'12px', fontSize:'13px', fontWeight:'600', color:'#ef4444', border:'none', background:'transparent', cursor:'pointer', textAlign:'left' },
  
  // ড্যাশবোর্ড কন্টেন্ট সেকশনের ব্যাকগ্রাউন্ডও স্ক্রিনশটের থিম কালার
  main: { flex:1, overflowY:'auto', padding:'28px', backgroundColor: '#cff1ff' },
  mainHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' },
  pageTitle: { fontSize:'26px', fontWeight:'800', color:'#004e77' },
  pageSub: { fontSize:'13px', color:'#475569', marginTop:'4px' },
  createBtn: { display:'flex', alignItems:'center', gap:'8px', backgroundColor:'#004e77', color:'white', padding:'10px 20px', borderRadius:'12px', fontWeight:'700', border:'none', cursor:'pointer', boxShadow:'0 4px 14px rgba(0,78,119,0.2)', fontSize:'14px' },
  
  // ভেতরের রেপার বক্সটিকে স্বচ্ছ সাদা রাখা হয়েছে যাতে কন্টেন্ট সুন্দর ফুটে ওঠে
  contentBox: { backgroundColor:'rgba(255, 255, 255, 0.4)', borderRadius:'20px', padding:'4px', border: 'none' },
  
  // বক্সগুলোর ডিসট্যান্স বা গ্যাপ 32px রাখা হয়েছে 
  statsGrid: { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'32px', marginBottom:'32px' },
  statCardCustom: { padding:'24px', backgroundColor:'#ffffff', border:'1px solid #e2e8f0', borderRadius:'16px', boxShadow:'0 4px 20px rgba(0,78,119,0.06)' },
  statRow: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' },
  statLabel: { fontSize:'12px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.05em', color:'#64748b' },
  statNum: { fontSize:'36px', fontWeight:'900', color:'#004e77', lineHeight:1 },
  scheduleBox: { backgroundColor:'rgba(255, 255, 255, 0.6)', backdropFilter: 'blur(8px)', borderRadius:'16px', padding:'24px', marginBottom:'32px', border:'1px solid rgba(255, 255, 255, 0.5)' },
  scheduleTitle: { fontSize:'16px', fontWeight:'700', color:'#004e77', marginBottom:'20px', display:'flex', alignItems:'center', gap:'8px' },
  classItem: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 16px', backgroundColor:'white', borderRadius:'12px', border:'1px solid #e2e8f0', marginBottom:'8px' },
  className: { fontSize:'14px', fontWeight:'700', color:'#004e77', marginBottom:'4px' },
  classMeta: { fontSize:'12px', color:'#64748b' },
  startBtn: { backgroundColor:'#cff1ff', color:'#004e77', padding:'8px 16px', borderRadius:'8px', fontWeight:'700', fontSize:'12px', border:'none', cursor:'pointer' },
  enterBtn: { backgroundColor:'#004e77', color:'white', padding:'8px 16px', borderRadius:'8px', fontWeight:'700', fontSize:'12px', border:'none', cursor:'pointer' },
  reportBtn: { backgroundColor:'#f1f5f9', color:'#475569', padding:'8px 16px', borderRadius:'8px', fontWeight:'700', fontSize:'12px', border:'none', cursor:'pointer' },
  exportBtn: { backgroundColor:'#dcfce7', color:'#092146', padding:'8px 16px', borderRadius:'8px', fontWeight:'700', fontSize:'12px', border:'none', cursor:'pointer' },
  emptyText: { color:'#94a3b8', fontSize:'13px', textAlign:'center', padding:'20px' },
  centerContent: { textAlign:'center', paddingTop:'40px', backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px' },
  tabTitle: { fontSize:'22px', fontWeight:'800', color:'#004e77', marginBottom:'8px' },
  tabDesc: { fontSize:'14px', color:'#64748b', maxWidth:'400px', margin:'0 auto' },
  modalOverlay: { position:'fixed', inset:0, backgroundColor:'rgba(0, 78, 119, 0.3)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 },
  modal: { backgroundColor:'white', padding:'28px', borderRadius:'20px', width:'440px', border:'1px solid #e2e8f0', boxShadow:'0 20px 60px rgba(0,0,0,0.1)' },
  modalTitle: { fontSize:'18px', fontWeight:'800', color:'#004e77', marginBottom:'20px' },
  modalForm: { display:'flex', flexDirection:'column', gap:'16px' },
  formGroup: { display:'flex', flexDirection:'column', gap:'6px' },
  label: { fontSize:'11px', fontWeight:'700', color:'#64748b', letterSpacing:'0.08em' },
  input: { padding:'12px 14px', border:'1px solid #e2e8f0', borderRadius:'12px', backgroundColor:'#f8fafc', fontSize:'14px', outline:'none', color:'#004e77' },
  modalBtns: { display:'flex', gap:'12px', marginTop:'8px' },
  cancelBtn: { flex:1, padding:'12px', border:'1px solid #e2e8f0', borderRadius:'12px', fontSize:'14px', fontWeight:'700', color:'#475569', backgroundColor:'transparent', cursor:'pointer' },
  submitBtn: { flex:1, padding:'12px', backgroundColor:'#004e77', color:'white', border:'none', borderRadius:'12px', fontSize:'14px', fontWeight:'700', cursor:'pointer' },
  error: { color:'#ef4444', fontSize:'13px', marginBottom:'12px', backgroundColor:'#fef2f2', padding:'10px', borderRadius:'8px' },

  // ক্লাস বক্সগুলোর ডিসট্যান্স গ্যাপ বাড়িয়ে 32px করা হয়েছে
  classesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '32px', marginTop: '15px' },
  cardHeaderCustom: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  statusBadgeCustom: { fontSize: '11px', fontWeight: 'bold', padding: '4px 12px', borderRadius: '20px', textTransform: 'uppercase' },
  durationBadgeCustom: { fontSize: '12px', fontWeight: '700', color: '#64748b' },
  cardTitleCustom: { fontSize: '17px', fontWeight: '800', color: '#99dafd', margin: '6px 0' },
  cardMetaText: { margin: 0, fontSize: '13px', color: '#475569' },
  cardFooterCustom: { marginTop: 'auto', paddingTop: '14px' },

  // ক্লাস বক্সগুলো সলিড White কালার
  classCardWhite: { 
    backgroundColor: '#f1f5f9', 
    border: '1px solid #e2e8f0', 
    borderRadius: '16px', 
    padding: '24px', 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '14px', 
    boxShadow: '0 10px 25px rgba(0, 78, 119, 0.04)',
    transition: 'transform 0.2s ease'
  }
};

export default TeacherDashboard;