import { useState } from 'react';
import { ymd, getDaysLeft } from '../lib/api';
import { COLOR_PALETTE, CATEGORIES } from '../lib/constants';

const GOAL_PRESETS = [
  {
    title: 'Solve 100 DSA Problems',
    description: 'Master core data structures and algorithms for interviews',
    category: 'Learning & Skills',
    targetDays: 30,
    currentValue: 0,
    targetValue: 100,
    unit: 'problems',
    color: '#8b5cf6',
    milestones: ['Arrays & Two Pointers', 'Binary Search', 'Trees & Graphs', 'Dynamic Programming'],
  },
  {
    title: 'Read 3 High-Impact Books',
    description: 'Atomic Habits, Deep Work, and Clean Code',
    category: 'Learning & Skills',
    targetDays: 45,
    currentValue: 0,
    targetValue: 3,
    unit: 'books',
    color: '#06b6d4',
    milestones: ['Finish Atomic Habits', 'Finish Deep Work', 'Finish Clean Code'],
  },
  {
    title: 'Target Body Weight (70 kg)',
    description: 'Reach healthy target body weight through strength & nutrition',
    category: 'Health & Fitness',
    targetDays: 60,
    currentValue: 78,
    targetValue: 70,
    unit: 'kg',
    color: '#10b981',
    milestones: ['First 2kg loss', 'Midway check-in (74kg)', 'Final goal (70kg)'],
  },
  {
    title: 'Launch Web Portfolio',
    description: 'Deploy personal website with 3 showcase fullstack projects',
    category: 'Productivity',
    targetDays: 21,
    currentValue: 1,
    targetValue: 4,
    unit: 'milestones',
    color: '#f59e0b',
    milestones: ['Design UI in Figma', 'Develop Frontend & Backend', 'Deploy on Vercel', 'Share on LinkedIn'],
  },
];

export default function NewGoalModal({ onClose, onSave }) {
  const defaultTarget = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return ymd(d);
  })();

  const [f, setF] = useState({
    title: '',
    description: '',
    category: 'Learning & Skills',
    color: '#8b5cf6',
    targetDate: defaultTarget,
    currentValue: 0,
    targetValue: 100,
    unit: 'problems',
    priority: 'high',
    milestones: ['Phase 1 Checkpoint', 'Phase 2 Checkpoint'],
  });

  const [newMilestoneText, setNewMilestoneText] = useState('');

  const up = (k) => (v) => setF((p) => ({ ...p, [k]: v }));

  const applyPreset = (p) => {
    const d = new Date();
    d.setDate(d.getDate() + p.targetDays);
    setF({
      title: p.title,
      description: p.description,
      category: p.category,
      color: p.color,
      targetDate: ymd(d),
      currentValue: p.currentValue,
      targetValue: p.targetValue,
      unit: p.unit,
      priority: 'high',
      milestones: [...p.milestones],
    });
  };

  const addMilestone = () => {
    if (!newMilestoneText.trim()) return;
    setF((p) => ({ ...p, milestones: [...p.milestones, newMilestoneText.trim()] }));
    setNewMilestoneText('');
  };

  const removeMilestone = (idx) => {
    setF((p) => ({ ...p, milestones: p.milestones.filter((_, i) => i !== idx) }));
  };

  const daysLeft = getDaysLeft(f.targetDate);

  const submit = (e) => {
    e.preventDefault();
    if (!f.title.trim() || !f.targetDate) return;

    onSave({
      title: f.title.trim(),
      description: f.description.trim(),
      category: f.category,
      color: f.color,
      targetDate: f.targetDate,
      currentValue: Number(f.currentValue) || 0,
      targetValue: Number(f.targetValue) || 1,
      unit: f.unit || 'tasks',
      priority: f.priority,
      completed: false,
      milestones: f.milestones.map((m) => ({ title: m, done: false })),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm transition-all"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-2xl transition-all max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
              <span>🎯</span> Create Specific Target Goal
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Target-oriented milestone objective with a deadline countdown (separate from daily habits)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Presets */}
        <div className="mt-3.5">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
            Quick Goal Templates
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {GOAL_PRESETS.map((p) => (
              <button
                key={p.title}
                type="button"
                onClick={() => applyPreset(p)}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                  f.title === p.title
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <span>🎯</span>
                <span>{p.title}</span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={submit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Specific Goal Title *
            </label>
            <input
              autoFocus
              required
              value={f.title}
              onChange={(e) => up('title')(e.target.value)}
              placeholder="e.g. Solve 100 DSA Problems, Run 10km Marathon, Read 5 Books"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Why this goal matters / Description (optional)
            </label>
            <input
              value={f.description}
              onChange={(e) => up('description')(e.target.value)}
              placeholder="e.g. Land dream SDE job by winter"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-4 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>

          {/* Target Date with Days Left Countdown Preview */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>📅</span> Target Deadline Date *
              </label>
              <span className={`text-xs font-extrabold px-2 py-0.5 rounded-lg border ${
                daysLeft <= 3
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300'
                  : daysLeft <= 7
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300'
              }`}>
                {daysLeft < 0 ? `⚠️ Overdue (${Math.abs(daysLeft)}d ago)` : daysLeft === 0 ? '🚨 Due Today' : `⏳ ${daysLeft} Days Left`}
              </span>
            </div>

            <div className="flex items-center gap-1.5 pt-1">
              {[
                { label: '+2 Days', d: 2 },
                { label: '+7 Days', d: 7 },
                { label: '+10 Days', d: 10 },
                { label: '+30 Days (Next Month)', d: 30 },
              ].map((btn) => (
                <button
                  key={btn.label}
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + btn.d);
                    up('targetDate')(ymd(d));
                  }}
                  className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100"
                >
                  {btn.label}
                </button>
              ))}
            </div>

            <input
              type="date"
              required
              value={f.targetDate}
              onChange={(e) => up('targetDate')(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
            />
          </div>

          {/* Target Progress Values: Current vs Target */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Current Done
              </label>
              <input
                type="number"
                min="0"
                value={f.currentValue}
                onChange={(e) => up('currentValue')(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-center font-bold text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Target Value
              </label>
              <input
                type="number"
                min="1"
                required
                value={f.targetValue}
                onChange={(e) => up('targetValue')(parseFloat(e.target.value) || 1)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-center font-bold text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Unit / Metric
              </label>
              <input
                type="text"
                value={f.unit}
                onChange={(e) => up('unit')(e.target.value)}
                placeholder="problems, kg, pages"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-center font-medium text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Category & Color */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Color
              </label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    title={c.name}
                    onClick={() => up('color')(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={`h-7 w-7 rounded-full transition-transform hover:scale-110 flex items-center justify-center ${
                      f.color === c.hex ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white scale-110 shadow-md' : 'opacity-80'
                    }`}
                  >
                    {f.color === c.hex && <span className="text-white text-xs font-bold">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Category
              </label>
              <select
                value={f.category}
                onChange={(e) => up('category')(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Milestones Checkpoints */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-2">
            <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span>🚩 Milestone Checkpoints</span>
              <span className="text-[10px] text-slate-400 font-normal">Break down this goal</span>
            </label>

            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
              {f.milestones.map((m, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 text-xs text-slate-800 dark:text-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: f.color }} />
                    <span>{m}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMilestone(idx)}
                    className="text-slate-400 hover:text-rose-500 text-xs px-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newMilestoneText}
                onChange={(e) => setNewMilestoneText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addMilestone();
                  }
                }}
                placeholder="Add checkpoint step..."
                className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={addMilestone}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                + Add
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-bold text-white rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-indigo-600/25 transition active:scale-95"
            >
              Create Specific Goal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
