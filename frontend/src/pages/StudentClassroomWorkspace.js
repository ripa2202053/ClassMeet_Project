import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../utils/api';

const StudentClassroomWorkspace = () => {
  const { classroomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('Stream');
  const [announcements, setAnnouncements] = useState([]);
  const [classwork, setClasswork] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await API.get(`/rooms/${classroomId}`); // may be teacher-only; fallback
        setRoom(data);
      } catch (e) {
        setError(e.response?.data?.message || 'Failed to load classroom.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [classroomId]);

  useEffect(() => {
    if (activeTab === 'Stream' && classroomId) {
      API.get(`/announcements/${classroomId}`).then(r => setAnnouncements(r.data || [])).catch(() => setAnnouncements([]));
    }
    if (activeTab === 'Classwork' && classroomId) {
      API.get(`/classwork/${classroomId}`).then(r => setClasswork(r.data || [])).catch(() => setClasswork([]));
    }
  }, [activeTab, classroomId]);

  if (loading) return <div className="w-full p-6 text-slate-500">Loading classroom...</div>;
  if (error) return <div className="w-full p-6 text-red-500">{error}</div>;
  if (!room) return null;

  return (
    <div className="w-full space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <button onClick={() => navigate('/student-dashboard')} className="mb-3 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold">Back to My Classes</button>
        <h2 className="text-xl font-bold text-slate-900">{room.title}</h2>
        <p className="text-sm text-slate-500 mt-1">{room.subject} {room.section ? `• ${room.section}` : ''}</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-2 flex flex-wrap gap-2">
        {['Stream', 'Classwork', 'Live Classroom', 'Attendance'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === t ? 'bg-[#4E8EA2] text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        {activeTab === 'Stream' && (
          <div className="space-y-3">
            {announcements.length === 0 && <p className="text-sm text-slate-500">No announcements.</p>}
            {announcements.map(a => (
              <div key={a._id} className="border border-slate-200 rounded-lg p-4">
                <p className="text-sm font-bold text-slate-900">{a.title}</p>
                <p className="text-xs text-slate-500 mt-1">{a.teacher?.name} • {new Date(a.createdAt).toLocaleString()}</p>
                <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{a.content}</p>
                {a.attachments?.length > 0 && a.attachments.map((att, i) => (
                  <a key={i} href={att.url} target="_blank" rel="noreferrer" className="block text-xs text-[#4E8EA2] hover:underline mt-1">{att.name || att.url}</a>
                ))}
              </div>
            ))}
          </div>
        )}
        {activeTab === 'Classwork' && (
          <div className="space-y-3">
            {classwork.length === 0 && <p className="text-sm text-slate-500">No classwork.</p>}
            {classwork.map(c => (
              <div key={c._id} className="border border-slate-200 rounded-lg p-4">
                <p className="text-sm font-bold text-slate-900">{c.title} <span className="text-xs text-slate-400">({c.type})</span></p>
                {c.description && <p className="text-xs text-slate-500 mt-1">{c.description}</p>}
                {c.attachments?.length > 0 && c.attachments.map((a, i) => (
                  <a key={i} href={a.url} target="_blank" rel="noreferrer" className="block text-xs text-[#4E8EA2] hover:underline mt-1">{a.name || a.url}</a>
                ))}
                {(c.type === 'assignment' || c.type === 'quiz') && (
                  <div className="mt-3 space-y-2">
                    <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs" rows={2} placeholder="Your submission..." onChange={e => { c._draft = e.target.value; }} />
                    <button onClick={async () => {
                      const content = c._draft || '';
                      try { await API.post(`/classwork/${c._id}/submit`, { content }); alert('Submitted'); } catch (e) { alert('Failed'); }
                    }} className="px-3 py-1.5 rounded-lg bg-[#4E8EA2] text-white text-xs font-semibold">Submit</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {activeTab === 'Live Classroom' && (
          <div>
            <button onClick={() => navigate(`/room/${classroomId}`)} className="px-4 py-2 rounded-lg bg-[#4E8EA2] text-white text-sm font-semibold">Join Live Classroom</button>
          </div>
        )}
        {activeTab === 'Attendance' && (
          <p className="text-sm text-slate-500">Attendance history for this class will appear here.</p>
        )}
      </div>
    </div>
  );
};

export default StudentClassroomWorkspace;