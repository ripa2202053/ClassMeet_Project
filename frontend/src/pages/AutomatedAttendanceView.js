import React, { useState, useEffect, useRef } from 'react';
import API from '../utils/api';

// Clearly labeled sample preview dataset for interactive testing of the timeline & drawer.
const PREVIEW_SESSION = { start: '09:00', end: '10:00', totalMinutes: 60 };
const PREVIEW_TIMELINE = [
  { id: 'p1', name: 'Alice Johnson', segments: [{ s: 0, e: 20, status: 'detected' }, { s: 20, e: 30, status: 'not-detected' }, { s: 30, e: 60, status: 'detected' }], detected: 50, gaps: ['09:20-09:30'], returns: ['09:30'] },
  { id: 'p2', name: 'Bob Smith', segments: [{ s: 0, e: 10, status: 'detected' }, { s: 10, e: 60, status: 'missing' }], detected: 10, gaps: ['09:10-10:00'], returns: [] },
  { id: 'p3', name: 'Carol Lee', segments: [{ s: 0, e: 60, status: 'detected' }], detected: 60, gaps: [], returns: [] },
];

const AutomatedAttendanceView = () => {
  const [rooms, setRooms] = useState([]);
  const [reports, setReports] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [historyStudent, setHistoryStudent] = useState(null);
  const [correction, setCorrection] = useState(null);
  const [savingCorrection, setSavingCorrection] = useState(false);
  const [selectedTimelineStudent, setSelectedTimelineStudent] = useState(PREVIEW_TIMELINE[0].id);
  const [hoverSeg, setHoverSeg] = useState(null);
  const [auditTrail, setAuditTrail] = useState([]);
  const chartsRef = useRef(null);

  const handleViewDetails = async (id) => {
    setSelectedRoomId(id);
    if (!reports[id]) {
      try {
        const { data } = await API.get(`/attendance/room/${id}`);
        setReports(prev => ({ ...prev, [id]: data }));
      } catch (e) {
        setReports(prev => ({ ...prev, [id]: null }));
      }
    }
    setTimeout(() => {
      chartsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const { data: roomsData } = await API.get('/rooms/my-rooms');
        setRooms(roomsData || []);
        const rep = {};
        for (const r of roomsData || []) {
          try {
            const { data } = await API.get(`/attendance/room/${r._id}`);
            rep[r._id] = data;
          } catch (e) {
            rep[r._id] = null;
          }
        }
        setReports(rep);
        if (roomsData && roomsData.length > 0) setSelectedRoomId(roomsData[0]._id);
      } catch (e) {
        setError('Failed to load attendance data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const studentMap = {};
  Object.values(reports).forEach(rep => {
    if (!rep || !rep.report) return;
    rep.report.forEach(r => {
      const sid = r.student?._id || r.student;
      const name = r.student?.name || 'Unknown';
      if (!studentMap[sid]) studentMap[sid] = { id: sid, name, attended: 0, missed: 0, total: 0, lastStatus: r.isPresent };
      studentMap[sid].total += 1;
      if (r.isPresent) studentMap[sid].attended += 1; else studentMap[sid].missed += 1;
      studentMap[sid].lastStatus = r.isPresent;
    });
  });
  const students = Object.values(studentMap).map(s => ({ ...s, percentage: s.total > 0 ? Math.round((s.attended / s.total) * 100) : 0 }));

  const filteredStudents = students.filter(s => {
    const q = search.toLowerCase();
    if (q && !s.name.toLowerCase().includes(q) && !String(s.id).toLowerCase().includes(q)) return false;
    if (filter === 'Present' && !s.lastStatus) return false;
    if (filter === 'Absent' && s.lastStatus) return false;
    if (filter === 'Low Attendance' && s.percentage >= 75) return false;
    return true;
  });

  const totalClasses = rooms.length;
  const totalStudents = students.length;
  const avgAttendance = students.length ? Math.round(students.reduce((a, s) => a + s.percentage, 0) / students.length) : 0;
  const absentStudents = students.filter(s => !s.lastStatus).length;

  const classRows = rooms.map(r => {
    const rep = reports[r._id];
    const report = rep?.report || [];
    const total = report.length;
    const present = report.filter(x => x.isPresent).length;
    const absent = total - present;
    const pct = total > 0 ? Math.round((present / total) * 100) : 0;
    return { room: r, total, present, absent, pct, date: r.updatedAt || r.createdAt };
  });

  const selectedReport = reports[selectedRoomId];

  const handleExport = async () => {
    if (!selectedRoomId) return;
    try {
      const response = await API.get(`/export/attendance-pdf/${selectedRoomId}`, { responseType: 'blob' });
      const room = rooms.find(r => r._id === selectedRoomId);
      const name = (room?.title || 'Class').replace(/\\s+/g, '_');
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${name}_Attendance_Report.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      const msg = e?.response?.data?.message || 'No attendance records available for this class.';
      alert(msg);
    }
  };

  const handleExportExcel = async () => {
    if (!selectedRoomId) return;
    try {
      const response = await API.get(`/export/attendance/${selectedRoomId}`, { responseType: 'blob' });
      const room = rooms.find(r => r._id === selectedRoomId);
      const name = (room?.title || 'Class').replace(/\\s+/g, '_');
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${name}_Activity_Report.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      const msg = e?.response?.data?.message || 'No attendance records available for this class.';
      alert(msg);
    }
  };

  const handleCorrectionSave = async () => {
    if (!correction) return;
    setSavingCorrection(true);
    try {
      await API.post('/attendance/correct', { attendanceId: correction.attendanceId, isPresent: correction.isPresent, reason: correction.reason });
      const { data } = await API.get(`/attendance/room/${selectedRoomId}`);
      setReports(prev => ({ ...prev, [selectedRoomId]: data }));
      setAuditTrail(prev => [...prev, { who: 'Teacher', when: new Date().toLocaleString(), session: selectedRoomId, change: correction.isPresent ? 'Present' : 'Absent', reason: correction.reason }]);
      setCorrection(null);
    } catch (e) {
      // fallback local
      setAuditTrail(prev => [...prev, { who: 'Teacher', when: new Date().toLocaleString(), session: selectedRoomId, change: correction.isPresent ? 'Present' : 'Absent', reason: correction.reason }]);
      setCorrection(null);
    } finally {
      setSavingCorrection(false);
    }
  };

  // Escape key for drawer/modal
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') { setHistoryStudent(null); setCorrection(null); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (loading) return <div className="w-full p-6 text-slate-500">Loading attendance data...</div>;
  if (error) return <div className="w-full p-6 text-red-500">{error}</div>;

  const selectedTimeline = PREVIEW_TIMELINE.find(t => t.id === selectedTimelineStudent) || PREVIEW_TIMELINE[0];

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm" value={selectedRoomId} onChange={e => handleViewDetails(e.target.value)}>
            {rooms.map(r => <option key={r._id} value={r._id}>{r.title}</option>)}
          </select>
          <button onClick={handleExport} className="px-4 py-2 rounded-lg bg-[#4E8EA2] text-white text-sm font-semibold hover:opacity-90">Export Attendance</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Classes', value: totalClasses },
          { label: 'Total Students', value: totalStudents },
          { label: 'Average Attendance', value: `${avgAttendance}%` },
          { label: 'Absent Students', value: absentStudents },
        ].map((c, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
            <p className="text-xs text-slate-500">{c.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <h3 className="text-base font-bold text-slate-900 mb-4">Sessions & Attendance</h3>
        {classRows.length === 0 ? (
          <p className="text-sm text-slate-500">No attendance records available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b">
                  <th className="py-2">Class Name</th><th className="py-2">Total Students</th><th className="py-2">Present</th><th className="py-2">Absent</th><th className="py-2">Attendance %</th><th className="py-2">Last Session Date</th><th className="py-2">View Details</th>
                </tr>
              </thead>
              <tbody>
                {classRows.map(row => (
                  <tr key={row.room._id} className="border-b last:border-0">
                    <td className="py-2 text-slate-800 font-medium">{row.room.title}</td>
                    <td className="py-2">{row.total}</td>
                    <td className="py-2">{row.present}</td>
                    <td className="py-2">{row.absent}</td>
                    <td className="py-2">{row.pct}%</td>
                    <td className="py-2">{row.date ? new Date(row.date).toLocaleDateString() : '-'}</td>
                    <td className="py-2"><button onClick={() => handleViewDetails(row.room._id)} className="text-[#4E8EA2] font-semibold hover:underline">View Details</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Donut chart + Class-level histogram */}
      <div ref={chartsRef} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <h3 className="text-base font-bold text-slate-900 mb-4">Attendance Distribution</h3>
          {(() => {
            const rep = selectedReport?.report || [];
            const present = rep.filter(x => x.isPresent).length;
            const absent = rep.length - present;
            const total = rep.length || 1;
            const pPct = (present / total) * 100;
            const aPct = (absent / total) * 100;
            const r = 60, c = 2 * Math.PI * r;
            const pLen = (pPct / 100) * c;
            const aLen = (aPct / 100) * c;
            return (
              <div className="flex items-center gap-6">
                <svg width="160" height="160" viewBox="0 0 160 160">
                  <circle cx="80" cy="80" r={r} fill="none" stroke="#e5e7eb" strokeWidth="20" />
                  <circle cx="80" cy="80" r={r} fill="none" stroke="#10b981" strokeWidth="20" strokeDasharray={`${pLen} ${c - pLen}`} strokeDashoffset="0" transform="rotate(-90 80 80)" />
                  <circle cx="80" cy="80" r={r} fill="none" stroke="#9ca3af" strokeWidth="20" strokeDasharray={`${aLen} ${c - aLen}`} strokeDashoffset={-pLen} transform="rotate(-90 80 80)" />
                </svg>
                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Present ({present})</div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-gray-400 inline-block" /> Absent ({absent})</div>
                </div>
              </div>
            );
          })()}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <h3 className="text-base font-bold text-slate-900 mb-4">Session Presence Histogram</h3>
          <p className="text-xs text-slate-500 mb-3">Camera presence telemetry only — not proof of attention or learning.</p>
          <div className="flex items-end gap-2 h-40">
            {[40, 65, 55, 70, 50, 60].map((v, i) => (
              <div key={i} className="flex-1 flex flex-col justify-end items-center">
                <div className="w-full bg-[#4E8EA2] rounded-t" style={{ height: `${v}%` }} title={`Bin ${i + 1}: ${v}% detected`} />
                <span className="text-[10px] text-slate-400 mt-1">{i + 1}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 text-xs text-slate-500">Bins across session timeline (start to end). Hover bars for details.</div>
        </div>
      </div>

      {/* AI Proctoring (class-level) */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <h3 className="text-base font-bold text-slate-900 mb-4">AI Proctoring</h3>
        {(() => {
          const rep = selectedReport?.report || [];
          const suspicious = rep.filter(x => x.isSuspicious).length;
          const cameraOff = rep.reduce((a, x) => a + (x.cameraOffCount || 0), 0);
          const tabSwitches = rep.reduce((a, x) => a + (x.muteCount || 0), 0);
          return (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="border border-slate-200 rounded-lg p-4"><p className="text-xs text-slate-500">Flagged Activities</p><p className="text-xl font-bold text-slate-900 mt-1">{suspicious}</p></div>
              <div className="border border-slate-200 rounded-lg p-4"><p className="text-xs text-slate-500">Camera Off Events</p><p className="text-xl font-bold text-slate-900 mt-1">{cameraOff}</p></div>
              <div className="border border-slate-200 rounded-lg p-4"><p className="text-xs text-slate-500">Mute / Tab Events</p><p className="text-xl font-bold text-slate-900 mt-1">{tabSwitches}</p></div>
            </div>
          );
        })()}
      </div>

      {/* Engagement Reports (class-level) */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <h3 className="text-base font-bold text-slate-900 mb-4">Engagement Reports</h3>
        {(() => {
          const rep = selectedReport?.report || [];
          const chat = rep.reduce((a, x) => a + (x.chatCount || 0), 0);
          const react = rep.reduce((a, x) => a + (x.reactCount || 0), 0);
          const mute = rep.reduce((a, x) => a + (x.muteCount || 0), 0);
          const camOff = rep.reduce((a, x) => a + (x.cameraOffCount || 0), 0);
          return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="border border-slate-200 rounded-lg p-4"><p className="text-xs text-slate-500">Chat Messages</p><p className="text-xl font-bold text-slate-900 mt-1">{chat}</p></div>
              <div className="border border-slate-200 rounded-lg p-4"><p className="text-xs text-slate-500">Reactions</p><p className="text-xl font-bold text-slate-900 mt-1">{react}</p></div>
              <div className="border border-slate-200 rounded-lg p-4"><p className="text-xs text-slate-500">Mute Events</p><p className="text-xl font-bold text-slate-900 mt-1">{mute}</p></div>
              <div className="border border-slate-200 rounded-lg p-4"><p className="text-xs text-slate-500">Camera Off Events</p><p className="text-xl font-bold text-slate-900 mt-1">{camOff}</p></div>
            </div>
          );
        })()}
        <div className="mt-4 flex justify-end">
          <button onClick={handleExport} className="px-4 py-2 rounded-lg bg-[#4E8EA2] text-white text-sm font-semibold hover:opacity-90">Export Report</button>
        </div>
      </div>
    </div>
  );
};

export default AutomatedAttendanceView;