import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const initialProfile = {
  fullName: '',
  designation: 'Lecturer',
  department: 'Department of Educational Technology and Engineering',
  institution: 'UFTB',
  email: '',
  phone: '',
  role: 'Teacher',
  currentPassword: '',
  newPassword: '',
  googleConnected: true,
};

const Field = ({ label, desc, children }) => (
  <div className="mb-4">
    <label className="block text-sm font-semibold text-slate-700 mb-1">{label}</label>
    {desc && <p className="text-xs text-slate-500 mb-2">{desc}</p>}
    {children}
  </div>
);

const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4E8EA2] focus:border-[#4E8EA2] bg-white';

const Card = ({ title, children }) => (
  <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 mb-6">
    {title && <h3 className="text-base font-bold text-slate-900 mb-4">{title}</h3>}
    {children}
  </div>
);

const AccountView = ({ profilePic, setProfilePic, profileName, setProfileName, profileDesignation, setProfileDesignation }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    ...initialProfile,
    fullName: user?.name || initialProfile.fullName,
    email: user?.email || initialProfile.email,
    role: user?.role === 'teacher' ? 'Teacher' : (user?.role || initialProfile.role),
    designation: user?.designation || initialProfile.designation,
    department: user?.department || initialProfile.department,
    institution: user?.institution || initialProfile.institution,
    phone: user?.phone || initialProfile.phone,
  });
  const [editing, setEditing] = useState(false);
  const [localPic, setLocalPic] = useState(profilePic);

  useEffect(() => {
    setLocalPic(profilePic);
  }, [profilePic]);

  const initials = (profile.fullName || 'T').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setLocalPic(url);
    setProfilePic(url);
    localStorage.setItem('profilePic', url);
  };

  const handleSave = () => {
    setEditing(false);
    setProfileName(profile.fullName);
    setProfileDesignation(profile.designation);
    const raw = localStorage.getItem('user');
    try {
      const u = raw ? JSON.parse(raw) : {};
      u.name = profile.fullName;
      u.designation = profile.designation;
      localStorage.setItem('user', JSON.stringify(u));
    } catch (e) {}
  };

  return (
    <div className="w-full space-y-6">
      {/* Top profile card (no heading) */}
      <Card title={null}>
        <div className="flex items-center gap-4">
          <label className="relative w-16 h-16 rounded-full bg-[#4E8EA2] text-white flex items-center justify-center text-xl font-bold overflow-hidden cursor-pointer group">
            {localPic ? (
              <img src={localPic} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              initials
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </label>
          <div>
            <p className="text-sm font-semibold text-slate-800">{profile.fullName}</p>
            <p className="text-xs text-slate-500">{profile.designation}</p>
          </div>
          <button onClick={() => (editing ? handleSave() : setEditing(true))} className="ml-auto px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50">
            {editing ? 'Save' : 'Edit'}
          </button>
        </div>
      </Card>

      {/* Account Information card */}
      <Card title="Account Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Full Name">
            <input className={inputCls} value={profile.fullName} disabled={!editing} onChange={e => setProfile({ ...profile, fullName: e.target.value })} />
          </Field>
          <Field label="Designation">
            <input className={inputCls} value={profile.designation} disabled={!editing} onChange={e => setProfile({ ...profile, designation: e.target.value })} />
          </Field>
          <Field label="Department">
            <input className={inputCls} value={profile.department} disabled={!editing} onChange={e => setProfile({ ...profile, department: e.target.value })} />
          </Field>
          <Field label="Institution">
            <input className={inputCls} value={profile.institution} disabled={!editing} onChange={e => setProfile({ ...profile, institution: e.target.value })} />
          </Field>
          <Field label="Email" desc="Read-only">
            <input className={inputCls + ' bg-slate-50 cursor-not-allowed'} value={profile.email} readOnly />
          </Field>
          <Field label="Phone">
            <input className={inputCls} value={profile.phone} disabled={!editing} onChange={e => setProfile({ ...profile, phone: e.target.value })} />
          </Field>
          <Field label="Role">
            <input className={inputCls + ' bg-slate-50 cursor-not-allowed'} value={profile.role} readOnly />
          </Field>
        </div>
      </Card>

      <Card title="Security & Authentication">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Current Password">
            <input type="password" className={inputCls} value={profile.currentPassword} onChange={e => setProfile({ ...profile, currentPassword: e.target.value })} />
          </Field>
          <Field label="New Password">
            <input type="password" className={inputCls} value={profile.newPassword} onChange={e => setProfile({ ...profile, newPassword: e.target.value })} />
          </Field>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-sm text-slate-700">Google OAuth</span>
          <span className={`text-xs px-2 py-1 rounded-full border ${profile.googleConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
            {profile.googleConnected ? 'Connected' : 'Not Connected'}
          </span>
        </div>
      </Card>

      <Card title="Default Audio/Video Devices">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Camera">
            <select className={inputCls} defaultValue="Default Camera">
              <option>Default Camera</option>
              <option>Integrated Webcam</option>
            </select>
          </Field>
          <Field label="Microphone">
            <select className={inputCls} defaultValue="Default Microphone">
              <option>Default Microphone</option>
              <option>Built-in Mic</option>
            </select>
          </Field>
          <Field label="Speaker">
            <select className={inputCls} defaultValue="Default Speaker">
              <option>Default Speaker</option>
              <option>Headphones</option>
            </select>
          </Field>
        </div>
        <div className="mt-4 border border-slate-200 rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-500">
          Media preview box (Test Media)
        </div>
      </Card>
    </div>
  );
};

export default AccountView;