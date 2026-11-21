import React, { useState } from 'react';

const initialNotifications = [
  { id: 1, category: 'Class Reminders', title: 'Upcoming Class', message: 'Advanced Mathematics starts in 30 minutes.', time: '10 min ago', read: false, target: 'schedule' },
  { id: 2, category: 'Attendance & Report Ready', title: 'Report Ready', message: 'Attendance report for Physics - Wave Optics is ready to export.', time: '1 hr ago', read: false, target: 'attendance' },
  { id: 3, category: 'Proctoring Summary', title: 'Proctoring Summary', message: '2 tab-switch violations detected in CS Lab quiz.', time: '2 hr ago', read: true, target: 'attendance' },
  { id: 4, category: 'Account & System Notices', title: 'Password Updated', message: 'Your account password was changed successfully.', time: 'Yesterday', read: true, target: 'account' },
];

const NotificationsView = ({ onNavigate }) => {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [filter, setFilter] = useState('All');
  const [enabled, setEnabled] = useState(true);

  const markRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const filtered = notifications.filter(n => filter === 'All' ? true : !n.read);

  const handleClick = (n) => {
    markRead(n.id);
    if (onNavigate) onNavigate(n.target);
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex gap-2">
          {['All', 'Unread'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f ? 'bg-[#4E8EA2] text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <span>Notifications</span>
            <input type="checkbox" className="sr-only peer" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
            <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-[#4E8EA2] transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5 relative" />
          </label>
          <button onClick={markAllRead} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50">
            Mark all as read
          </button>
        </div>
      </div>

      {!enabled && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-2">
          New alerts are paused. Past notification history remains visible.
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm divide-y divide-slate-100">
        {filtered.length === 0 && (
          <div className="p-6 text-center text-sm text-slate-500">No notifications.</div>
        )}
        {filtered.map(n => (
          <button
            key={n.id}
            onClick={() => handleClick(n)}
            className={`w-full text-left px-5 py-4 transition-colors hover:bg-slate-50 ${n.read ? 'bg-white' : 'bg-slate-50'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-[#4E8EA2] uppercase tracking-wide">{n.category}</p>
                <p className={`text-sm mt-1 ${n.read ? 'text-slate-700' : 'text-slate-900 font-semibold'}`}>{n.title}</p>
                <p className="text-xs text-slate-500 mt-1">{n.message}</p>
              </div>
              <span className="text-xs text-slate-400 whitespace-nowrap">{n.time}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default NotificationsView;