import { useState } from 'react';
import { ymd, addDays, getDaysLeft } from '../lib/api';
import ColorPicker from './ColorPicker';

const REMINDER_PRESETS = [
  {
    icon: '💻',
    label: 'Online Assessment (OA)',
    title: 'Online Assessment (OA)',
    category: 'Exams & OA',
    color: '#6366f1',
    time: '18:00',
    platform: 'HackerRank / HackerEarth',
    description: 'Round 1 online coding assessment. Revise DSA, Arrays, Trees, DP.',
    daysOffset: 0, // Today!
  },
  {
    icon: '💼',
    label: 'Technical Interview',
    title: 'Technical Interview',
    category: 'Career & Placement',
    color: '#0ea5e9',
    time: '14:00',
    platform: 'Google Meet',
    description: '1:1 technical interview with hiring engineer.',
    daysOffset: 2,
  },
  {
    icon: '🎓',
    label: 'Semester Exam',
    title: 'Semester Exam',
    category: 'Academics',
    color: '#f59e0b',
    time: '10:00',
    platform: 'Exam Hall',
    description: 'Final examination. Bring admit card and stationary.',
    daysOffset: 3,
  },
  {
    icon: '📁',
    label: 'Project Submission',
    title: 'Project Submission',
    category: 'Productivity',
    color: '#10b981',
    time: '23:59',
    platform: 'GitHub / Portal',
    description: 'Submit final report, clean repo code, and demo video link.',
    daysOffset: 5,
  },
  {
    icon: '💳',
    label: 'Bill / Fee Due',
    title: 'Bill Payment',
    category: 'Finances & Bills',
    color: '#ec4899',
    time: '12:00',
    platform: 'Payment Gateway',
    description: 'Due date for monthly bill / fee installment.',
    daysOffset: 7,
  },
];

const REMINDER_CATEGORIES = [
  'Exams & OA',
  'Career & Placement',
  'Academics',
  'Finances & Bills',
  'Productivity',
  'Personal & Health',
  'General',
];

export default function NewReminderModal({ onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(ymd(new Date())); // default today
  const [time, setTime] = useState('');
  const [platform, setPlatform] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Exams & OA');
  const [color, setColor] = useState('#f59e0b');
  const [priority, setPriority] = useState('high');

  const applyPreset = (p) => {
    setTitle(p.title);
    setDate(ymd(addDays(p.daysOffset)));
    setTime(p.time || '');
    setPlatform(p.platform || '');
    setDescription(p.description || '');
    setCategory(p.category || 'Exams & OA');
    setColor(p.color || '#f59e0b');
    setPriority('high');
  };

  const daysLeft = getDaysLeft(date);

  const submit = (e) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    onSave({
      title: title.trim(),
      targetDate: date,
      time: time.trim(),
      link: platform.trim(),
      description: description.trim(),
      category: category,
      color: color,
      kind: 'reminder',
      currentValue: 0,
      targetValue: 1,
      unit: 'reminder',
      completed: false,
      priority: priority,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm transition-all"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-xl md:max-w-2xl rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-7 shadow-2xl transition-all max-h-[92vh] overflow-y-auto space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
              <span>🔔</span> Add Reminder / Event
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Schedule date-specific reminders for OAs, exams, tests, interviews, and deadlines
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Quick Presets */}
        <div>
          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
            Quick Templates
          </span>
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
            {REMINDER_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  title === p.title
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <span>{p.icon}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4 sm:space-y-5">
          {/* Reminder Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Reminder / Event Title *
            </label>
            <input
              autoFocus
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Google Online Assessment, Semester Exam, Amazon OA"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
            />
          </div>

          {/* Date Picker with Quick Date Shortcuts */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Scheduled Date *
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { label: 'Today', d: 0 },
                  { label: 'Tomorrow', d: 1 },
                  { label: '+2 Days', d: 2 },
                  { label: '+7 Days', d: 7 },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    type="button"
                    onClick={() => setDate(ymd(addDays(btn.d)))}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                      date === ymd(addDays(btn.d))
                        ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
            />

            {/* Date status banner */}
            <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-bold ${
              daysLeft === 0
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 animate-pulse'
                : daysLeft === 1
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                : daysLeft > 1
                ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}>
              <div className="flex items-center gap-2">
                <span>{daysLeft === 0 ? '🚨' : daysLeft === 1 ? '⏰' : '⏳'}</span>
                <span>
                  {daysLeft === 0
                    ? 'Due TODAY!'
                    : daysLeft === 1
                    ? 'Scheduled for Tomorrow'
                    : daysLeft > 1
                    ? `${daysLeft} days away`
                    : `${Math.abs(daysLeft)} days past`}
                </span>
              </div>
              <span className="text-[11px] font-mono opacity-80">{date}</span>
            </div>
          </div>

          {/* Time & Platform / Venue */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Time (optional)
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
              />
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className="text-[10px] uppercase font-bold text-slate-400">Quick:</span>
                {['10:00', '14:00', '18:00', '20:00'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTime(t)}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border transition ${
                      time === t
                        ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                    }`}
                  >
                    {t}
                  </button>
                ))}
                {time && (
                  <button
                    type="button"
                    onClick={() => setTime('')}
                    className="text-[11px] text-rose-500 hover:underline font-bold ml-1"
                  >
                    ✕ Clear
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Platform / Venue / Link
              </label>
              <input
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                placeholder="e.g. HackerRank, Google Meet, Hall 3"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
              />
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
                Online test link, meeting room, or exam center
              </p>
            </div>
          </div>

          {/* Category & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
              >
                {REMINDER_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Priority
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'low', label: 'Low', badge: 'bg-slate-100 dark:bg-slate-800' },
                  { id: 'medium', label: 'Medium', badge: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700' },
                  { id: 'high', label: 'High 🔥', badge: 'bg-rose-100 dark:bg-rose-950/40 text-rose-700' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPriority(p.id)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold border transition text-center capitalize ${
                      priority === p.id
                        ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Color Tag & Custom Color Selection */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
            <ColorPicker
              value={color}
              onChange={setColor}
              label="Color Tag & Theme"
              helperText="Choose a preset palette or enter/pick any custom color"
            />
          </div>

          {/* Description / Instructions */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Notes & Instructions (optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 90 minutes duration, 2 coding problems + 10 MCQs. Revise Graphs & Two Pointers."
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition font-medium"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3.5 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-sm font-bold text-white rounded-xl shadow-lg bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 shadow-amber-500/20 transition active:scale-95"
            >
              Save Reminder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
