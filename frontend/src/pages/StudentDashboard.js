import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { joinRoom } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { FiBookOpen, FiCalendar, FiCheckCircle, FiBell, FiSettings, FiHelpCircle, FiUser } from 'react-icons/fi';

const NAV = [
  { label: 'My Classes', icon: FiBookOpen },
  { label: 'Schedule', icon: FiCalendar },
  { label: 'My Attendance', icon: FiCheckCircle },
  { label: 'Notifications', icon: FiBell },
  { label: 'Settings', icon: FiSettings },
  { label: 'Help & Support', icon: FiHelpCircle },
  { label: 'Account', icon: FiUser },
];

const StudentDashboard = () => {
  const [active, setActive] = useState('My Classes');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [joinedRooms, setJoinedRooms] = useState([]);
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await joinRoom({ roomCode });
      setJoinedRooms(prev => {
        if (prev.find(r => r._id === data.room._id)) return prev;
        return [...prev, data.room];
      });
      if (data.live) {
        navigate(`/room/${data.room._id}`);
      } else {
        setError(data.message || 'Class has not started yet. Classroom opened.');
        navigate(`/student-classroom/${data.room._id}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired room code.');
    }
    setLoading(false);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ backgroundColor: '#8FA7B2' }}>
      <aside className="w-64 shrink-0 flex flex-col" style={{ backgroundColor: '#4A6570' }}>
        <div className="p-5 border-b border-white/10">
          <div className="text-white text-xl font-bold">ClassMeet</div>
          <div className="text-white/70 text-xs mt-1">Student Panel</div>
        </div>
        <nav className="flex-1 p-3 flex flex-col justify-center space-y-2">
          {NAV.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => setActive(item.label)}
                className={`w-full text-left px-4 py-3 rounded-full text-sm font-medium transition-colors flex items-center gap-3 ${
                  active === item.label ? 'bg-white/15 text-white border border-white/20' : 'text-white/80 hover:bg-white/10'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center font-bold">
              {(user?.name || 'S').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-white text-sm font-semibold">{user?.name || 'Student'}</div>
              <div className="text-white/70 text-xs">Student</div>
            </div>
          </div>
          <button onClick={logoutUser} className="w-full px-4 py-2 rounded-lg border border-white/20 text-white text-sm hover:bg-white/10">
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 flex items-center px-6">
          <div>
            <div className="text-lg font-bold text-slate-900">{active}</div>
            <div className="text-xs text-slate-600">Welcome, {user?.name || 'Student'}</div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {active === 'My Classes' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-base font-bold text-slate-900 mb-3">Join a Class</h3>
                {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
                <form onSubmit={handleJoinRoom} className="flex gap-2 flex-wrap">
                  <input
                    type="text"
                    placeholder="Enter Room Code"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]"
                    required
                  />
                  <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-[#4E8EA2] text-white text-sm font-semibold">
                    {loading ? 'Joining...' : 'Join Class'}
                  </button>
                </form>
              </div>

              {joinedRooms.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {joinedRooms.map(room => (
                    <div key={room._id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#4E8EA2] text-white flex items-center justify-center font-bold">
                        {(room.teacher?.name || 'T').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-800">{room.title}</p>
                        <p className="text-xs text-slate-500">{room.roomCode}</p>
                      </div>
                      <button onClick={() => navigate(`/student-classroom/${room._id}`)} className="px-3 py-1.5 rounded-lg bg-[#4E8EA2] text-white text-xs font-semibold">
                        Open
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {active === 'Schedule' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 mb-3">Schedule</h3>
              <p className="text-sm text-slate-500">No scheduled classes available.</p>
            </div>
          )}

          {active === 'My Attendance' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 mb-3">My Attendance</h3>
              <p className="text-sm text-slate-500">No attendance records available.</p>
            </div>
          )}

          {active === 'Notifications' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 mb-3">Notifications</h3>
              <p className="text-sm text-slate-500">No notifications.</p>
            </div>
          )}

          {active === 'Settings' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 mb-3">Settings</h3>
              <p className="text-sm text-slate-500">Camera & microphone readiness options.</p>
            </div>
          )}

          {active === 'Help & Support' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-3">
              <h3 className="text-base font-bold text-slate-900 mb-3">Help & Support</h3>
              <p className="text-sm text-slate-600">Joining via Room Code: enter the code provided by your teacher in My Classes.</p>
              <p className="text-sm text-slate-600">Direct Join Link: open the link shared by your teacher to enter the class directly.</p>
              <p className="text-sm text-slate-600">Camera/Microphone: allow browser permissions and test devices before joining.</p>
              <p className="text-sm text-slate-600">Contact support via your institution administrator for further help.</p>
            </div>
          )}

          {active === 'Account' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-3">
              <h3 className="text-base font-bold text-slate-900 mb-3">Account</h3>
              <p className="text-sm text-slate-600">Name: {user?.name || 'Student'}</p>
              <p className="text-sm text-slate-600">Email: {user?.email || '-'}</p>
              <p className="text-sm text-slate-600">Role: {user?.role || 'student'}</p>
              <p className="text-sm text-slate-600">Camera/Microphone readiness: ensure browser permissions are granted.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default StudentDashboard;