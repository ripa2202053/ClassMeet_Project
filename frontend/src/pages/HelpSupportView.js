import React, { useState } from 'react';

const HelpSupportView = () => {
  const [form, setForm] = useState({ subject: '', category: 'General', description: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
    setForm({ subject: '', category: 'General', description: '' });
  };

  const faqs = [
    { q: 'How do I handle a student camera issue during a live class?', a: 'Enable "Camera Issue Exception" in Settings so students can request Audio-Only mode.' },
    { q: 'How does client-side AI proctoring work?', a: 'face-api.js and COCO-SSD run in the browser to track attendance and detect unauthorized devices.' },
    { q: 'How do I export Excel reports?', a: 'Reports are auto-generated via ExcelJS when a class ends; you can also export manually from Attendance & Reports.' },
  ];

  return (
    <div className="w-full space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <h3 className="text-base font-bold text-slate-900 mb-4">Quick Troubleshooting & FAQ</h3>
        <div className="space-y-4">
          {faqs.map((f, i) => (
            <div key={i} className="border border-slate-100 rounded-lg p-4 bg-slate-50">
              <p className="text-sm font-semibold text-slate-800">{f.q}</p>
              <p className="text-xs text-slate-500 mt-1">{f.a}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <h3 className="text-base font-bold text-slate-900 mb-4">Support / Bug Report</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Subject</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4E8EA2]" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Category</label>
            <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4E8EA2]" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              <option>General</option>
              <option>Technical</option>
              <option>Account</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
            <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4E8EA2]" rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
          </div>
          <button type="submit" className="px-4 py-2 rounded-lg bg-[#4E8EA2] text-white text-sm font-semibold hover:opacity-90">
            Submit
          </button>
          {submitted && <span className="text-sm text-emerald-600 ml-3">Report submitted.</span>}
        </form>
      </div>
    </div>
  );
};

export default HelpSupportView;