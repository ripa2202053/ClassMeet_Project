import React, { useState } from 'react';
import { FiSliders, FiEye, FiShield, FiBarChart2 } from 'react-icons/fi';

const TABS = [
  'General & Classroom Defaults',
  'AI Attendance & Engagement',
  'Exam & Proctoring Rules',
  'Reports & Analytics',
];

const TAB_ICONS = [FiSliders, FiEye, FiShield, FiBarChart2];

const initial = {
  general: {
    waitingRoom: true,
    muteOnEntry: true,
    cameraOffOnEntry: false,
    whiteboardPermission: 'View Only',
    lockPdfNavigation: true,
    chatMode: 'Public & Private',
  },
  ai: {
    attendanceTracking: true,
    presenceThreshold: 75,
    inattentivenessThreshold: '20 seconds',
    audioOnlyException: true,
  },
  exam: {
    fullscreenEnforcement: true,
    tabSwitchLimit: 2,
    deviceDetection: true,
    randomizeQuestions: true,
    autoSubmitTimer: true,
  },
  reports: {
    autoExcelReport: true,
    reportColumns: {
      attendanceStatus: true,
      engagementScore: true,
      tabSwitchLogs: true,
      phoneAlerts: true,
      quizMarks: true,
    },
  },
};

const Toggle = ({ checked, onChange, label, desc, disabled }) => (
  <div className="flex items-start justify-between gap-4 py-3 border-b border-slate-100 last:border-0">
    <div>
      <p className="text-sm font-semibold text-slate-800">{label}</p>
      {desc && <p className="text-xs text-slate-500 mt-1">{desc}</p>}
      {disabled && <span className="text-xs text-amber-600 mt-1 inline-block">Disabled because student camera on entry is turned off</span>}
    </div>
    <label className={`relative inline-flex items-center shrink-0 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
      <input type="checkbox" className="sr-only peer" checked={checked} onChange={onChange} disabled={disabled} />
      <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-[#4E8EA2] transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
    </label>
  </div>
);

const Field = ({ label, desc, children }) => (
  <div className="mb-4">
    <label className="block text-sm font-semibold text-slate-700 mb-1">{label}</label>
    {desc && <p className="text-xs text-slate-500 mb-2">{desc}</p>}
    {children}
  </div>
);

const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4E8EA2] focus:border-[#4E8EA2] bg-white';

const SettingsView = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [settings, setSettings] = useState(initial);
  const [toast, setToast] = useState('');

  const update = (section, key, value) => {
    setSettings(prev => ({ ...prev, [section]: { ...prev[section], [key]: value } }));
  };
  const updateNested = (section, group, key, value) => {
    setSettings(prev => ({ ...prev, [section]: { ...prev[section], [group]: { ...prev[section][group], [key]: value } } }));
  };

  const handleSave = () => {
    setToast('Settings saved successfully.');
    setTimeout(() => setToast(''), 3000);
  };
  const handleReset = () => {
    setSettings(initial);
    setToast('Settings reset to default.');
    setTimeout(() => setToast(''), 3000);
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <aside className="lg:col-span-1">
          <div className="flex flex-col gap-2">
            {TABS.map((tab, idx) => {
              const Icon = TAB_ICONS[idx];
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(idx)}
                  className={`flex items-center gap-3 text-left w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === idx
                      ? 'bg-white text-slate-900 font-semibold shadow-sm rounded-lg'
                      : 'text-slate-700 hover:bg-white/60'
                  }`}
                >
                  <Icon size={18} />
                  {tab}
                </button>
              );
            })}
          </div>
        </aside>

        <section className="lg:col-span-3">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            {activeTab === 0 && (
              <>
                <h3 className="text-base font-bold text-slate-900 mb-4">General & Classroom Defaults</h3>
                <Toggle label="Waiting Room Approval" desc="Require teacher approval before students join." checked={settings.general.waitingRoom} onChange={e => update('general', 'waitingRoom', e.target.checked)} />
                <Toggle label="Mute student microphone on entry" checked={settings.general.muteOnEntry} onChange={e => update('general', 'muteOnEntry', e.target.checked)} />
                <Toggle label="Turn off student camera on entry" checked={settings.general.cameraOffOnEntry} onChange={e => {
                  const val = e.target.checked;
                  update('general', 'cameraOffOnEntry', val);
                  if (val) update('ai', 'attendanceTracking', false);
                }} />
                <Field label="Smart Whiteboard Permission" desc="Control who can draw on the whiteboard.">
                  <select className={inputCls} value={settings.general.whiteboardPermission} onChange={e => update('general', 'whiteboardPermission', e.target.value)}>
                    <option>View Only</option>
                    <option>Everyone Can Draw</option>
                  </select>
                </Field>
                <Toggle label="Synchronized PDF Viewer" desc="Lock page navigation to teacher." checked={settings.general.lockPdfNavigation} onChange={e => update('general', 'lockPdfNavigation', e.target.checked)} />
                <Field label="Classroom Chat Mode">
                  <select className={inputCls} value={settings.general.chatMode} onChange={e => update('general', 'chatMode', e.target.value)}>
                    <option>Public & Private</option>
                    <option>Public Only</option>
                    <option>Disabled</option>
                  </select>
                </Field>
              </>
            )}

            {activeTab === 1 && (
              <>
                <h3 className="text-base font-bold text-slate-900 mb-4">AI Attendance & Engagement</h3>
                <Toggle label="Automated AI Attendance" desc="Enable face & eye-gaze attendance tracking via face-api.js." checked={settings.general.cameraOffOnEntry ? false : settings.ai.attendanceTracking} onChange={e => update('ai', 'attendanceTracking', e.target.checked)} disabled={settings.general.cameraOffOnEntry} />
                <Field label="Minimum Presence Threshold" desc={`Minimum time required to mark student as Present: ${settings.ai.presenceThreshold}%`}>
                  <input type="range" min="50" max="100" value={settings.ai.presenceThreshold} onChange={e => update('ai', 'presenceThreshold', Number(e.target.value))} className="w-full accent-[#4E8EA2]" />
                  <div className="text-right text-sm font-semibold text-[#4E8EA2] mt-1">{settings.ai.presenceThreshold}%</div>
                </Field>
                <Field label="Inattentiveness Alert Threshold" desc="Eye-blink/gaze distraction alert.">
                  <select className={inputCls} value={settings.ai.inattentivenessThreshold} onChange={e => update('ai', 'inattentivenessThreshold', e.target.value)}>
                    <option>10 seconds</option>
                    <option>20 seconds</option>
                    <option>30 seconds</option>
                  </select>
                </Field>
                <Toggle label="Camera Issue Exception" desc="Allow students to request Audio-Only mode if camera fails." checked={settings.ai.audioOnlyException} onChange={e => update('ai', 'audioOnlyException', e.target.checked)} />
              </>
            )}

            {activeTab === 2 && (
              <>
                <h3 className="text-base font-bold text-slate-900 mb-4">Exam & Proctoring Rules</h3>
                <Toggle label="Mandatory Fullscreen Enforcement" desc="Require fullscreen during lectures/quizzes and alert on exit." checked={settings.exam.fullscreenEnforcement} onChange={e => update('exam', 'fullscreenEnforcement', e.target.checked)} />
                <Field label="Tab-Switch & Window Blur Limit" desc="Warnings before flagging/auto-submitting quiz.">
                  <select className={inputCls} value={settings.exam.tabSwitchLimit} onChange={e => update('exam', 'tabSwitchLimit', Number(e.target.value))}>
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                  </select>
                </Field>
                <Toggle label="AI Unauthorized Device Detection" desc="Enable COCO-SSD mobile phone detection during live quizzes." checked={settings.exam.deviceDetection} onChange={e => update('exam', 'deviceDetection', e.target.checked)} />
                <Toggle label="Randomize question order" checked={settings.exam.randomizeQuestions} onChange={e => update('exam', 'randomizeQuestions', e.target.checked)} />
                <Toggle label="Auto-submit when timer ends" checked={settings.exam.autoSubmitTimer} onChange={e => update('exam', 'autoSubmitTimer', e.target.checked)} />
              </>
            )}

            {activeTab === 3 && (
              <>
                <h3 className="text-base font-bold text-slate-900 mb-4">Reports & Analytics</h3>
                <Toggle label="Automated Excel Report" desc="Auto-generate Excel report via ExcelJS when class ends." checked={settings.reports.autoExcelReport} onChange={e => update('reports', 'autoExcelReport', e.target.checked)} />
                <div className="mb-4">
                  <p className="text-sm font-semibold text-slate-700 mb-2">Report Data Columns</p>
                  {[
                    ['attendanceStatus', 'Attendance Status'],
                    ['engagementScore', 'Active/Inactive Engagement Score'],
                    ['tabSwitchLogs', 'Tab-Switch Violation Logs'],
                    ['phoneAlerts', 'Phone Detection Alerts'],
                    ['quizMarks', 'Quiz Marks'],
                  ].map(([key, lbl]) => (
                    <label key={key} className="flex items-center gap-2 py-1 text-sm text-slate-700 cursor-pointer">
                      <input type="checkbox" checked={settings.reports.reportColumns[key]} onChange={e => updateNested('reports', 'reportColumns', key, e.target.checked)} className="rounded border-slate-300 text-[#4E8EA2] focus:ring-[#4E8EA2]" />
                      {lbl}
                    </label>
                  ))}
                </div>
              </>
            )}

            <div className="mt-8 pt-5 border-t border-slate-200 flex justify-end gap-3">
              <button onClick={handleReset} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50">
                Reset to Default
              </button>
              <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-[#4E8EA2] text-white text-sm font-semibold hover:opacity-90">
                Save Settings
              </button>
            </div>
          </div>
        </section>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
};

export default SettingsView;