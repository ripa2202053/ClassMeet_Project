import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../utils/api';

const TABS = ['Stream', 'Classwork', 'People', 'Grades', 'Live Classroom', 'Class Settings'];

const ClassroomWorkspace = ({ classroomId: propId, onBack }) => {
  const params = useParams();
  const classroomId = propId || params.classroomId;
  const navigate = useNavigate();
  const back = onBack || (() => navigate('/teacher-dashboard'));
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('Stream');
  const [editTitle, setEditTitle] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editSection, setEditSection] = useState('');
  const [saving, setSaving] = useState(false);

  const [announcements, setAnnouncements] = useState([]);
  const [annLoading, setAnnLoading] = useState(false);
  const [annError, setAnnError] = useState('');
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annAttachment, setAnnAttachment] = useState('');
  const [posting, setPosting] = useState(false);
  const [commentText, setCommentText] = useState({});

  const [classwork, setClasswork] = useState([]);
  const [cwLoading, setCwLoading] = useState(false);
  const [attendanceReport, setAttendanceReport] = useState(null);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [cwType, setCwType] = useState('assignment');
  const [cwTitle, setCwTitle] = useState('');
  const [cwDesc, setCwDesc] = useState('');
  const [cwTopic, setCwTopic] = useState('');
  const [cwDue, setCwDue] = useState('');
  const [cwPoints, setCwPoints] = useState(0);
  const [cwAttachment, setCwAttachment] = useState('');
  const [collapsedTopics, setCollapsedTopics] = useState({});

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await API.get(`/rooms/${classroomId}`);
      setRoom(data);
      setEditTitle(data.title || '');
      setEditSubject(data.subject || '');
      setEditSection(data.section || '');
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load classroom.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [classroomId]);

  useEffect(() => {
    if ((activeTab !== 'People' && activeTab !== 'Grades') || !classroomId) return;
    const fetchReport = async () => {
      setPeopleLoading(true);
      try {
        const { data } = await API.get(`/attendance/room/${classroomId}`);
        setAttendanceReport(data);
      } catch (e) {
        setAttendanceReport(null);
      } finally {
        setPeopleLoading(false);
      }
    };
    fetchReport();
  }, [activeTab, classroomId]);

  useEffect(() => {
    if (activeTab !== 'Classwork' || !classroomId) return;
    const fetchCw = async () => {
      setCwLoading(true);
      try {
        const { data } = await API.get(`/classwork/${classroomId}`);
        setClasswork(data || []);
      } catch (e) { console.error(e); }
      finally { setCwLoading(false); }
    };
    fetchCw();
  }, [activeTab, classroomId]);

  useEffect(() => {
    if (activeTab !== 'Stream' || !classroomId) return;
    const fetchAnns = async () => {
      setAnnLoading(true);
      setAnnError('');
      try {
        const { data } = await API.get(`/announcements/${classroomId}`);
        setAnnouncements(data || []);
      } catch (e) {
        setAnnError('Failed to load announcements.');
      } finally {
        setAnnLoading(false);
      }
    };
    fetchAnns();
  }, [activeTab, classroomId]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const { data } = await API.put(`/rooms/${classroomId}`, { title: editTitle, subject: editSubject, section: editSection });
      setRoom(data);
    } catch (e) {
      alert('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!window.confirm('Archive this classroom?')) return;
    await API.put(`/rooms/${classroomId}/archive`);
    navigate('/teacher-dashboard');
  };

  const handleRestore = async () => {
    await API.put(`/rooms/${classroomId}/restore`);
    load();
  };

  const handleDelete = async () => {
    if (!window.confirm('Permanently delete this classroom?')) return;
    await API.delete(`/rooms/${classroomId}`);
    navigate('/teacher-dashboard');
  };

  if (loading) return <div className="w-full p-6 text-slate-500">Loading classroom...</div>;
  if (error) return <div className="w-full p-6 text-red-500">{error}</div>;
  if (!room) return null;

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <button onClick={back} className="mb-3 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold">Back to Classes</button>
        <h2 className="text-xl font-bold text-slate-900">{room.title}</h2>
        <p className="text-sm text-slate-500 mt-1">{room.subject} {room.section ? `• ${room.section}` : ''}</p>
        <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-600">
          <span>Code: {room.roomCode}</span>
          <span>Link: {room.joinLink}</span>
          <span>Status: {room.isActive ? 'Live' : 'Completed'}</span>
          {room.archived && <span className="text-amber-600">Archived</span>}
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={() => navigator.clipboard?.writeText(room.roomCode)} className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs">Copy Code</button>
          <button onClick={() => navigator.clipboard?.writeText(room.joinLink)} className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs">Copy Link</button>
          {room.isActive && <button onClick={() => navigate(`/room/${room._id}`)} className="px-3 py-1.5 rounded-lg bg-[#4E8EA2] text-white text-xs">Open Live Classroom</button>}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-2 flex flex-wrap gap-2">
        {TABS.map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === t ? 'bg-[#4E8EA2] text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        {activeTab === 'Stream' && (
          <div className="space-y-4">
            {/* Composer */}
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-2" placeholder="Title" value={annTitle} onChange={e => setAnnTitle(e.target.value)} />
              <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-2" rows={3} placeholder="Message / content" value={annContent} onChange={e => setAnnContent(e.target.value)} />
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-2" placeholder="Attachment link (optional)" value={annAttachment} onChange={e => setAnnAttachment(e.target.value)} />
              <button
                onClick={async () => {
                  if (!annTitle.trim() || !annContent.trim()) return;
                  setPosting(true);
                  try {
                    const { data } = await API.post('/announcements', {
                      classroomId,
                      title: annTitle,
                      content: annContent,
                      attachments: annAttachment ? [{ name: 'Attachment', url: annAttachment }] : [],
                    });
                    setAnnouncements(prev => [data, ...prev]);
                    setAnnTitle(''); setAnnContent(''); setAnnAttachment('');
                  } catch (e) { alert('Failed to post'); }
                  finally { setPosting(false); }
                }}
                disabled={posting}
                className="px-4 py-2 rounded-lg bg-[#4E8EA2] text-white text-sm font-semibold disabled:opacity-50"
              >
                {posting ? 'Posting...' : 'Post'}
              </button>
            </div>

            {annLoading && <p className="text-sm text-slate-500">Loading announcements...</p>}
            {annError && <p className="text-sm text-red-500">{annError}</p>}
            {!annLoading && announcements.length === 0 && <p className="text-sm text-slate-500">No announcements yet.</p>}

            {announcements.map(a => (
              <div key={a._id} className="border border-slate-200 rounded-lg p-4 bg-white">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-900">{a.title}</p>
                      {a.pinned && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Pinned</span>}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{a.teacher?.name || 'Teacher'} • {new Date(a.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={async () => { try { const { data } = await API.put(`/announcements/${a._id}`, { pinned: !a.pinned }); setAnnouncements(prev => prev.map(x => x._id === a._id ? data : x)); } catch(e){ alert('Failed'); } }} className="text-xs text-slate-600 hover:underline">
                      {a.pinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button onClick={async () => { if(!window.confirm('Delete announcement?')) return; try { await API.delete(`/announcements/${a._id}`); setAnnouncements(prev => prev.filter(x => x._id !== a._id)); } catch(e){ alert('Failed'); } }} className="text-xs text-red-600 hover:underline">Delete</button>
                  </div>
                </div>
                <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{a.content}</p>
                {a.attachments && a.attachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {a.attachments.map((att, i) => (
                      <a key={i} href={att.url} target="_blank" rel="noreferrer" className="block text-xs text-[#4E8EA2] hover:underline">{att.name || att.url}</a>
                    ))}
                  </div>
                )}

                {/* Comments */}
                <div className="mt-3 border-t border-slate-100 pt-3 space-y-2">
                  {(a.comments || []).map((c, i) => (
                    <div key={i} className="text-xs text-slate-600">
                      <span className="font-semibold text-slate-800">{c.name || 'User'}:</span> {c.text}
                      <span className="text-slate-400 ml-2">{c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}</span>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-2">
                    <input
                      className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-xs"
                      placeholder="Write a comment..."
                      value={commentText[a._id] || ''}
                      onChange={e => setCommentText(prev => ({ ...prev, [a._id]: e.target.value }))}
                    />
                    <button
                      onClick={async () => {
                        const text = (commentText[a._id] || '').trim();
                        if (!text) return;
                        try {
                          const { data } = await API.post(`/announcements/${a._id}/comments`, { text });
                          setAnnouncements(prev => prev.map(x => x._id === a._id ? data : x));
                          setCommentText(prev => ({ ...prev, [a._id]: '' }));
                        } catch (e) { alert('Failed to comment'); }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#4E8EA2] text-white text-xs font-semibold"
                    >
                      Reply
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {activeTab === 'Classwork' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => setShowCreate(v => !v)} className="px-4 py-2 rounded-lg bg-[#4E8EA2] text-white text-sm font-semibold">
                {showCreate ? 'Cancel' : '+ Create'}
              </button>
            </div>

            {showCreate && (
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-2">
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={cwType} onChange={e => setCwType(e.target.value)}>
                  <option value="topic">Topic</option>
                  <option value="assignment">Assignment</option>
                  <option value="quiz">Quiz</option>
                  <option value="material">Study Material</option>
                </select>
                <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Title" value={cwTitle} onChange={e => setCwTitle(e.target.value)} />
                <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" rows={2} placeholder="Description" value={cwDesc} onChange={e => setCwDesc(e.target.value)} />
                <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Topic (group)" value={cwTopic} onChange={e => setCwTopic(e.target.value)} />
                {(cwType === 'assignment' || cwType === 'quiz') && (
                  <>
                    <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={cwDue} onChange={e => setCwDue(e.target.value)} />
                    <input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Points" value={cwPoints} onChange={e => setCwPoints(Number(e.target.value))} />
                  </>
                )}
                <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Attachment link (optional)" value={cwAttachment} onChange={e => setCwAttachment(e.target.value)} />
                <button
                  onClick={async () => {
                    if (!cwTitle.trim()) return;
                    try {
                      const { data } = await API.post('/classwork', {
                        classroomId,
                        type: cwType,
                        title: cwTitle,
                        description: cwDesc,
                        topic: cwTopic,
                        dueDate: cwDue || null,
                        points: cwPoints,
                        attachments: cwAttachment ? [{ name: 'Attachment', url: cwAttachment }] : [],
                      });
                      setClasswork(prev => [data, ...prev]);
                      setShowCreate(false);
                      setCwTitle(''); setCwDesc(''); setCwTopic(''); setCwDue(''); setCwPoints(0); setCwAttachment('');
                    } catch (e) { alert('Failed to create'); }
                  }}
                  className="px-4 py-2 rounded-lg bg-[#4E8EA2] text-white text-sm font-semibold"
                >
                  Create
                </button>
              </div>
            )}

            {cwLoading && <p className="text-sm text-slate-500">Loading classwork...</p>}
            {!cwLoading && classwork.length === 0 && <p className="text-sm text-slate-500">No classwork items yet.</p>}

            {/* Group by topic */}
            {Object.entries(
              classwork.reduce((acc, item) => {
                const key = item.topic || 'No Topic';
                if (!acc[key]) acc[key] = [];
                acc[key].push(item);
                return acc;
              }, {})
            ).map(([topic, items]) => (
              <div key={topic} className="border border-slate-200 rounded-lg p-4">
                <button onClick={() => setCollapsedTopics(prev => ({ ...prev, [topic]: !prev[topic] }))} className="text-sm font-bold text-slate-800 mb-2">
                  {collapsedTopics[topic] ? '▶' : '▼'} {topic}
                </button>
                {!collapsedTopics[topic] && (
                  <div className="space-y-2 mt-2">
                    {items.map(item => (
                      <div key={item._id} className="border border-slate-100 rounded-lg p-3 bg-slate-50">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{item.title} <span className="text-xs text-slate-400">({item.type})</span></p>
                            {item.description && <p className="text-xs text-slate-500 mt-1">{item.description}</p>}
                            {(item.type === 'assignment' || item.type === 'quiz') && (
                              <p className="text-xs text-slate-500 mt-1">Due: {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '—'} • Points: {item.points}</p>
                            )}
                            {item.attachments && item.attachments.length > 0 && (
                              <div className="mt-1">
                                {item.attachments.map((a, i) => (
                                  <a key={i} href={a.url} target="_blank" rel="noreferrer" className="block text-xs text-[#4E8EA2] hover:underline">{a.name || a.url}</a>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button onClick={async () => { if(!window.confirm('Delete item?')) return; try { await API.delete(`/classwork/${item._id}`); setClasswork(prev => prev.filter(x => x._id !== item._id)); } catch(e){ alert('Failed'); } }} className="text-xs text-red-600 hover:underline">Delete</button>
                          </div>
                        </div>
                        {/* Submissions (teacher view) */}
                        {item.submissions && item.submissions.length > 0 && (
                          <div className="mt-2 border-t border-slate-200 pt-2">
                            <p className="text-xs font-semibold text-slate-700 mb-1">Submissions</p>
                            {item.submissions.map((sub, i) => (
                              <div key={i} className="text-xs text-slate-600 mb-2">
                                <span className="font-medium">{sub.studentName || 'Student'}</span> — {sub.content}
                                <div className="flex gap-2 mt-1">
                                  <input type="number" placeholder="Marks" className="border border-slate-200 rounded px-2 py-1 text-xs w-20" value={sub.marks ?? ''} onChange={e => {
                                    const val = e.target.value;
                                    setClasswork(prev => prev.map(x => x._id === item._id ? { ...x, submissions: x.submissions.map((s, idx) => idx === i ? { ...s, marks: val } : s) } : x));
                                  }} />
                                  <input placeholder="Feedback" className="border border-slate-200 rounded px-2 py-1 text-xs flex-1" value={sub.feedback || ''} onChange={e => {
                                    const val = e.target.value;
                                    setClasswork(prev => prev.map(x => x._id === item._id ? { ...x, submissions: x.submissions.map((s, idx) => idx === i ? { ...s, feedback: val } : s) } : x));
                                  }} />
                                  <button onClick={async () => {
                                    try { await API.post(`/classwork/${item._id}/submissions`, { submissionIndex: i, marks: sub.marks, feedback: sub.feedback }); } catch(e){ alert('Failed'); }
                                  }} className="px-2 py-1 rounded bg-[#4E8EA2] text-white text-xs">Save</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {activeTab === 'People' && (
          <div className="space-y-4">
            <div className="border border-slate-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-slate-800">Teacher</p>
              <p className="text-xs text-slate-500">{room.teacher?.name || 'Teacher'}</p>
            </div>
            <div className="border border-slate-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-slate-800 mb-2">Enrolled Students</p>
              {peopleLoading && <p className="text-sm text-slate-500">Loading...</p>}
              {!peopleLoading && (!attendanceReport?.report || attendanceReport.report.length === 0) && <p className="text-sm text-slate-500">No students enrolled.</p>}
              <div className="space-y-2">
                {(attendanceReport?.report || []).map((r, i) => (
                  <div key={i} className="flex items-center justify-between border border-slate-100 rounded-lg p-2">
                    <div>
                      <p className="text-sm text-slate-800">{r.student?.name || 'Student'}</p>
                      <p className="text-xs text-slate-500">{r.student?._id}</p>
                    </div>
                    <button onClick={() => setSelectedStudent(r)} className="text-xs text-[#4E8EA2] hover:underline">View Profile</button>
                  </div>
                ))}
              </div>
            </div>
            {selectedStudent && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSelectedStudent(null)}>
                <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-base font-bold text-slate-900">{selectedStudent.student?.name}</h3>
                    <button onClick={() => setSelectedStudent(null)} className="text-slate-500">Close</button>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">Enrollment: {selectedStudent.student?._id}</p>
                  <p className="text-xs text-slate-500 mb-2">Attendance: {selectedStudent.isPresent ? 'Present' : 'Absent'}</p>
                  <p className="text-xs text-slate-500">Face time: {selectedStudent.faceDetectedTime || 0}s</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'Grades' && (
          <div className="space-y-4">
            {(() => {
              const activities = classwork.filter(c => c.type === 'assignment' || c.type === 'quiz');
              const students = attendanceReport?.report || [];
              if (activities.length === 0 || students.length === 0) {
                return <p className="text-sm text-slate-500">No grade data available.</p>;
              }
              const exportCsv = () => {
                const header = ['Student', ...activities.map(a => a.title), 'Total', 'Percentage'];
                const rows = students.map(s => {
                  const marks = activities.map(a => {
                    const sub = (a.submissions || []).find(x => String(x.student) === String(s.student?._id));
                    return sub?.marks ?? '';
                  });
                  const total = marks.reduce((a, v) => a + (Number(v) || 0), 0);
                  const maxTotal = activities.reduce((a, act) => a + (act.points || 0), 0) || 1;
                  const pct = Math.round((total / maxTotal) * 100);
                  return [s.student?.name || 'Student', ...marks, total, `${pct}%`];
                });
                const csv = [header, ...rows].map(r => r.join(',')).join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'grades.csv';
                link.click();
                URL.revokeObjectURL(url);
              };
              return (
                <>
                  <div className="flex justify-end mb-2">
                    <button onClick={exportCsv} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50">Export Grades CSV</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-500 border-b">
                          <th className="py-2">Student</th>
                          {activities.map(a => <th key={a._id} className="py-2">{a.title} ({a.points})</th>)}
                          <th className="py-2">Total</th>
                          <th className="py-2">%</th>
                          <th className="py-2">Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map(s => {
                          const marks = activities.map(a => {
                            const sub = (a.submissions || []).find(x => String(x.student) === String(s.student?._id));
                            return sub?.marks;
                          });
                          const total = marks.reduce((a, v) => a + (Number(v) || 0), 0);
                          const maxTotal = activities.reduce((a, act) => a + (act.points || 0), 0) || 1;
                          const pct = Math.round((total / maxTotal) * 100);
                          const grade = pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : 'F';
                          return (
                            <tr key={s.student?._id} className="border-b last:border-0">
                              <td className="py-2 text-slate-800 font-medium">{s.student?.name || 'Student'}</td>
                              {activities.map((a, i) => {
                                const sub = (a.submissions || []).find(x => String(x.student) === String(s.student?._id));
                                return (
                                  <td key={a._id} className="py-2">
                                    <input
                                      type="number"
                                      className="w-16 border border-slate-200 rounded px-2 py-1 text-xs"
                                      value={sub?.marks ?? ''}
                                      onChange={e => {
                                        const val = e.target.value;
                                        setClasswork(prev => prev.map(x => x._id === a._id ? {
                                          ...x,
                                          submissions: (x.submissions || []).map((subm, idx) => String(subm.student) === String(s.student?._id) ? { ...subm, marks: val } : subm)
                                        } : x));
                                      }}
                                      onBlur={async () => {
                                        const sub = (a.submissions || []).find(x => String(x.student) === String(s.student?._id));
                                        if (!sub) return;
                                        try { await API.post(`/classwork/${a._id}/submissions`, { submissionIndex: (a.submissions || []).indexOf(sub), marks: sub.marks, feedback: sub.feedback }); } catch (e) {}
                                      }}
                                    />
                                  </td>
                                );
                              })}
                              <td className="py-2 font-semibold">{total}</td>
                              <td className="py-2">{pct}%</td>
                              <td className="py-2">{grade}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              );
            })()}
          </div>
        )}
        {activeTab === 'Live Classroom' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">Launch or join the live video conferencing and AI proctoring room for this classroom.</p>
            <button onClick={() => navigate(`/room/${room._id}`)} className="px-4 py-2 rounded-lg bg-[#4E8EA2] text-white text-sm font-semibold">
              {room.isActive ? 'Join Live Classroom' : 'Start Live Classroom'}
            </button>
          </div>
        )}

        {activeTab === 'Class Settings' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Title</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Subject</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={editSubject} onChange={e => setEditSubject(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Section</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={editSection} onChange={e => setEditSection(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSaveSettings} disabled={saving} className="px-4 py-2 rounded-lg bg-[#4E8EA2] text-white text-sm font-semibold disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
              {room.archived ? (
                <button onClick={handleRestore} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm">Restore</button>
              ) : (
                <button onClick={handleArchive} className="px-4 py-2 rounded-lg border border-amber-300 text-amber-700 text-sm">Archive</button>
              )}
              <button onClick={handleDelete} className="px-4 py-2 rounded-lg border border-red-300 text-red-700 text-sm">Delete</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassroomWorkspace;