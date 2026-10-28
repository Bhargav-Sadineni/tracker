import { useState } from 'react';
import { ymd, addDays, getDaysLeft, formatDuration } from '../lib/api';
import { CATEGORIES } from '../lib/constants';
import ColorPicker from './ColorPicker';

const POSITIVE_PRESETS = [
  {
    icon: '💻',
    label: 'Solve DSA',
    name: 'Solve DSA',
    description: 'Solve at least 10 DSA questions daily',
    habitType: 'positive',
    category: 'Learning & Skills',
    measure: 'count',
    hasGoal: true,
    goal: 10,
    goalOperator: 'gte',
    analyticsOption: 'cumulative',
    color: '#06b6d4',
  },
  {
    icon: '🏃',
    label: 'Daily Workout',
    name: 'Daily Workout',
    description: 'Exercise for at least 30 minutes',
    habitType: 'positive',
    category: 'Health & Fitness',
    measure: 'time',
    hasGoal: true,
    goal: 30,
    goalOperator: 'gte',
    analyticsOption: 'consistency',
    color: '#10b981',
  },
  {
    icon: '💧',
    label: 'Drink Water',
    name: 'Drink Water',
    description: 'Stay hydrated with at least 8 glasses',
    habitType: 'positive',
    category: 'Health & Fitness',
    measure: 'count',
    hasGoal: true,
    goal: 8,
    goalOperator: 'gte',
    analyticsOption: 'consistency',
    color: '#6366f1',
  },
  {
    icon: '📚',
    label: 'Read Books',
    name: 'Read Books',
    description: 'Read at least 25 minutes of high-value books',
    habitType: 'positive',
    category: 'Learning & Skills',
    measure: 'time',
    hasGoal: true,
    goal: 25,
    goalOperator: 'gte',
    analyticsOption: 'cumulative',
    color: '#f59e0b',
  },
  {
    icon: '🛌',
    label: 'Sleep Schedule',
    name: 'Sleep Schedule',
    description: 'Track Bedtime, Wake Up time & sleep hours',
    habitType: 'positive',
    category: 'Sleep & Recovery',
    measure: 'sleep_wake',
    hasGoal: true,
    goal: 8,
    goalOperator: 'gte',
    analyticsOption: 'moving_average',
    color: '#8b5cf6',
  },
  {
    icon: '💳',
    label: 'EMI on Next Month',
    name: 'EMI Payment',
    description: 'Monthly loan / installment due next month',
    habitType: 'positive',
    category: 'Finances & Bills',
    frequency: 'specific',
    date: ymd(addDays(30)),
    measure: 'checkbox',
    hasGoal: true,
    goal: 1,
    goalOperator: 'gte',
    analyticsOption: 'consistency',
    color: '#0ea5e9',
  },
  {
    icon: '🔥',
    label: '10-Day Habit Sprint',
    name: '10-Day Challenge',
    description: '10-day continuous habit sprint to build unstoppable momentum',
    habitType: 'positive',
    category: 'Productivity',
    frequency: 'challenge',
    challengeDays: 10,
    startDate: ymd(new Date()),
    date: ymd(addDays(10)),
    measure: 'checkbox',
    hasGoal: true,
    goal: 1,
    goalOperator: 'gte',
    analyticsOption: 'consistency',
    color: '#f97316',
  },
];

const NEGATIVE_PRESETS = [
  {
    icon: '📱',
    label: 'Screen Time Limit',
    name: 'Screen Time',
    description: 'Keep screen time below 2h 30m daily',
    habitType: 'negative',
    category: 'Productivity',
    measure: 'time',
    hasGoal: true,
    goal: 150, // 2h 30m
    goalOperator: 'lte',
    analyticsOption: 'limit_control',
    color: '#f43f5e',
  },
  {
    icon: '☕',
    label: 'Caffeine Limit',
    name: 'Caffeine Intake',
    description: 'At most 2 cups of coffee per day',
    habitType: 'negative',
    category: 'Health & Fitness',
    measure: 'count',
    hasGoal: true,
    goal: 2,
    goalOperator: 'lte',
    analyticsOption: 'limit_control',
    color: '#f59e0b',
  },
  {
    icon: '🚭',
    label: 'No Smoking',
    name: 'No Smoking',
    description: 'Stay 100% clean and smoke-free today',
    habitType: 'negative',
    category: 'Health & Fitness',
    measure: 'checkbox',
    hasGoal: true,
    goal: 1,
    goalOperator: 'lte',
    analyticsOption: 'limit_control',
    color: '#ef4444',
  },
  {
    icon: '🍔',
    label: 'Junk Food Limit',
    name: 'Junk Food',
    description: 'Avoid fast food or limit to 0-1 snack',
    habitType: 'negative',
    category: 'Health & Fitness',
    measure: 'count',
    hasGoal: true,
    goal: 1,
    goalOperator: 'lte',
    analyticsOption: 'limit_control',
    color: '#d946ef',
  },
];

export default function NewActivityModal({ onClose, onSave }) {
  const [f, setF] = useState({
    name: '',
    description: '',
    habitType: 'positive', // 'positive' | 'negative'
    hasGoal: true, // optional goal toggle
    frequency: 'daily', // 'daily' | 'challenge' | 'specific'
    challengeDays: 10,
    startDate: ymd(new Date()),
    date: ymd(addDays(10)),
    measure: 'checkbox',
    goal: 1,
    goalOperator: 'gte', // 'gte' (>= At least) or 'lte' (<= At most)
    color: '#6366f1',
    category: 'General',
  });

  const up = (k) => (v) => setF((p) => ({ ...p, [k]: v }));

  const applyPreset = (preset) => {
    const cDays = preset.challengeDays || 10;
    const sDate = preset.startDate || ymd(new Date());
    const tDate = preset.date || (preset.frequency === 'challenge' ? ymd(addDays(cDays, new Date(sDate + 'T00:00:00'))) : ymd(new Date()));

    setF((p) => ({
      ...p,
      name: preset.name,
      description: preset.description,
      habitType: preset.habitType || 'positive',
      hasGoal: preset.hasGoal !== undefined ? preset.hasGoal : true,
      category: preset.category,
      frequency: preset.frequency || 'daily',
      challengeDays: cDays,
      startDate: sDate,
      date: tDate,
      measure: preset.measure,
      goal: preset.goal,
      goalOperator: preset.goalOperator || (preset.habitType === 'negative' ? 'lte' : 'gte'),
      color: preset.color,
    }));
  };

  const submit = (e) => {
    e.preventDefault();
    if (!f.name.trim()) return;

    let targetGoal = 1;
    if (f.measure === 'checkbox' || f.measure === 'time_of_day') {
      targetGoal = 1;
    } else if (f.measure === 'sleep_wake') {
      targetGoal = Number(f.goal) || 8;
    } else {
      targetGoal = Number(f.goal) || 1;
    }

    let targetDate = null;
    let sDate = null;
    let cDays = null;

    if (f.frequency === 'specific') {
      targetDate = f.date;
    } else if (f.frequency === 'challenge') {
      cDays = Math.max(1, parseInt(f.challengeDays, 10) || 10);
      sDate = f.startDate || ymd(new Date());
      targetDate = f.date || ymd(addDays(cDays, new Date(sDate + 'T00:00:00')));
    }

    onSave({
      ...f,
      name: f.name.trim(),
      frequency: f.frequency,
      challengeDays: cDays,
      startDate: sDate,
      date: targetDate,
      hasGoal: f.hasGoal,
      goal: f.hasGoal ? targetGoal : null,
      goalOperator: f.habitType === 'negative' ? 'lte' : f.goalOperator || 'gte',
      linkedActivity: null,
    });
  };

  const activePresets = f.habitType === 'negative' ? NEGATIVE_PRESETS : POSITIVE_PRESETS;

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
            <h2 className="text-xl font-bold text-slate-900 dark:text-white font-display">Create New Habit</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Design a positive routine to build or a negative habit to limit
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

        <form onSubmit={submit} className="mt-4 space-y-4">
          {/* 1. Habit Nature: Positive (+) vs Negative (-) Option */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Habit Nature / Direction *
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  up('habitType')('positive');
                  up('goalOperator')('gte');
                  if (f.color === '#f43f5e') up('color')('#10b981');
                }}
                className={`py-3 px-3 rounded-2xl border text-center transition flex items-center justify-center ${
                  f.habitType === 'positive'
                    ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/50 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
                  <span className="text-base">🟢</span> Positive Routine (+)
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  up('habitType')('negative');
                  up('goalOperator')('lte');
                  if (f.color === '#6366f1') up('color')('#f43f5e');
                }}
                className={`py-3 px-3 rounded-2xl border text-center transition flex items-center justify-center ${
                  f.habitType === 'negative'
                    ? 'border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 ring-2 ring-rose-500/50 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-rose-600 dark:text-rose-400">
                  <span className="text-base">🔴</span> Negative Habit (−)
                </div>
              </button>
            </div>
          </div>

          {/* Quick Presets tailored to positive/negative */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Quick {f.habitType === 'negative' ? 'Negative Limit' : 'Positive Routine'} Presets
              </span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {activePresets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                    f.name === p.name
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

          {/* Habit Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Habit Name *
            </label>
            <input
              autoFocus
              required
              value={f.name}
              onChange={(e) => up('name')(e.target.value)}
              placeholder="Habit name"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>

          {/* Motivation / Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Motivation / Description (optional)
            </label>
            <input
              value={f.description}
              onChange={(e) => up('description')(e.target.value)}
              placeholder="Add motivation or notes"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-4 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>

          {/* Category & Color */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Category
              </label>
              <select
                value={f.category}
                onChange={(e) => up('category')(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition font-medium"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
              <ColorPicker
                value={f.color}
                onChange={up('color')}
                label="Habit Color & Theme"
                helperText="Select a preset or enter/pick custom color"
              />
            </div>
          </div>

          {/* Frequency & Duration Section */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Frequency & Schedule *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => up('frequency')('daily')}
                  className={`py-2.5 px-3 rounded-xl border text-center transition flex items-center justify-center ${
                    f.frequency === 'daily'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/30 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="font-bold text-xs sm:text-sm">🔁 Every Day</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    up('frequency')('challenge');
                    const cDays = f.challengeDays || 10;
                    const sDate = f.startDate || ymd(new Date());
                    up('date')(ymd(addDays(cDays, new Date(sDate + 'T00:00:00'))));
                  }}
                  className={`py-2.5 px-3 rounded-xl border text-center transition flex items-center justify-center ${
                    f.frequency === 'challenge'
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 ring-2 ring-amber-500/30 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="font-bold text-xs sm:text-sm">⏱️ Challenge Habit</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    up('frequency')('specific');
                    if (!f.date) up('date')(ymd(addDays(30)));
                  }}
                  className={`py-2.5 px-3 rounded-xl border text-center transition flex items-center justify-center ${
                    f.frequency === 'specific'
                      ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-200 ring-2 ring-sky-500/30 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="font-bold text-xs sm:text-sm">📅 Target Deadline</span>
                </button>
              </div>
            </div>

            {/* Mode 2: Multi-day challenge (e.g. 10 days habit) */}
            {f.frequency === 'challenge' && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Challenge Duration Presets:
                  </span>
                  <div className="flex items-center gap-1.5">
                    {[10, 14, 21, 30].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          up('challengeDays')(d);
                          const s = f.startDate || ymd(new Date());
                          up('date')(ymd(addDays(d, new Date(s + 'T00:00:00'))));
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                          Number(f.challengeDays) === d
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-amber-50'
                        }`}
                      >
                        {d} Days
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Total Days Duration *
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={f.challengeDays}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value, 10) || 10);
                          up('challengeDays')(val);
                          const s = f.startDate || ymd(new Date());
                          up('date')(ymd(addDays(val, new Date(s + 'T00:00:00'))));
                        }}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-bold text-slate-900 dark:text-white"
                      />
                      <span className="text-xs font-semibold text-slate-500">Days</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Challenge Start Date
                    </label>
                    <input
                      type="date"
                      value={f.startDate}
                      onChange={(e) => {
                        const s = e.target.value;
                        up('startDate')(s);
                        const c = Number(f.challengeDays) || 10;
                        up('date')(ymd(addDays(c, new Date(s + 'T00:00:00'))));
                      }}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Target Finish Date Preview */}
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-200 font-semibold">
                    <span>🔥</span>
                    <span>Finish Target: {f.date || ymd(addDays(Number(f.challengeDays) || 10))}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white font-black text-[11px]">
                    ⏳ {getDaysLeft(f.date)} days left
                  </span>
                </div>
              </div>
            )}

            {/* Mode 3: Specific Date / Target Deadline */}
            {f.frequency === 'specific' && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Quick Deadline Shortcuts:
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { label: '+2 Days', d: 2 },
                      { label: '+7 Days', d: 7 },
                      { label: '+10 Days', d: 10 },
                      { label: 'Next Month (30d)', d: 30 },
                    ].map((btn) => (
                      <button
                        key={btn.label}
                        type="button"
                        onClick={() => up('date')(ymd(addDays(btn.d)))}
                        className="px-2 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 border border-slate-200 dark:border-slate-700 hover:bg-sky-50"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Select Target / Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={f.date}
                    onChange={(e) => up('date')(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                {/* Days left live preview */}
                <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 flex items-center justify-between text-xs">
                  <div className="text-sky-900 dark:text-sky-200 font-semibold flex items-center gap-1.5">
                    <span>💳</span>
                    <span>Due: {f.date}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md font-black text-[11px] ${
                    getDaysLeft(f.date) <= 3
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-sky-600 text-white'
                  }`}>
                    ⏳ {getDaysLeft(f.date)} days away
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Measurement Options */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Habit Measurement Option
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'checkbox', label: '✓ Simple Tick' },
                { id: 'time', label: '⏱️ Duration (Time)' },
                { id: 'count', label: '🔢 Reps / Count' },
                { id: 'sleep_wake', label: '🛌 Sleep & Wake' },
                { id: 'time_of_day', label: '⏰ Clock Time' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    up('measure')(m.id);
                    if (m.id === 'sleep_wake') {
                      up('goal')(8);
                      up('category')('Sleep & Recovery');
                    } else if (m.id === 'time' && (f.goal === 1 || f.goal === 8)) {
                      up('goal')(f.habitType === 'negative' ? 150 : 30);
                    } else if (m.id === 'count' && (f.goal === 1 || f.goal === 8)) {
                      up('goal')(f.habitType === 'negative' ? 2 : 10);
                    }
                  }}
                  className={`py-2.5 px-3 text-center rounded-xl border transition flex items-center justify-center ${
                    f.measure === m.id
                      ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 shadow-sm ring-1 ring-indigo-500 font-bold'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 font-semibold'
                  }`}
                >
                  <span className="text-xs">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. GOAL AFTER HABIT MEASUREMENT (OPTIONAL) */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>🎯</span> Daily Goal Setting <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">(Optional)</span>
                </span>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {f.hasGoal
                    ? f.habitType === 'negative'
                      ? 'Limit goal active: staying under budget counts as success'
                      : 'Target goal active: reaching or exceeding marks completion'
                    : 'Free tracking: log values freely without target goals'}
                </p>
              </div>

              {/* Goal Toggle Button */}
              <button
                type="button"
                onClick={() => up('hasGoal')(!f.hasGoal)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${
                  f.hasGoal
                    ? f.habitType === 'negative'
                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300'
                      : 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300'
                    : 'border-slate-300 dark:border-slate-700 bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <span>{f.hasGoal ? '✓ Goal Enabled' : '○ Free Tracking'}</span>
              </button>
            </div>

            {/* When Goal is Enabled: Render customized goal input */}
            {f.hasGoal && (
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-3">
                {/* Goal Operator Condition */}
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Goal Condition Rule
                  </label>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                    f.habitType === 'negative' || f.goalOperator === 'lte'
                      ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300'
                      : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300'
                  }`}>
                    {f.habitType === 'negative' || f.goalOperator === 'lte' ? '🛡️ At Most (≤ Limit)' : '🎯 At Least (≥ Target)'}
                  </span>
                </div>

                {/* Duration / Time Goal Input */}
                {f.measure === 'time' && (
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {f.habitType === 'negative' ? 'Daily Maximum Allowed Limit' : 'Daily Target Needed'}
                      </span>
                      <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-800">
                        {f.habitType === 'negative' ? '≤' : '≥'} {formatDuration(f.goal)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          max="23"
                          value={Math.floor((Number(f.goal) || 0) / 60)}
                          onChange={(e) => {
                            const h = Math.max(0, parseInt(e.target.value, 10) || 0);
                            const m = (Number(f.goal) || 0) % 60;
                            up('goal')(h * 60 + m);
                          }}
                          className="w-16 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1.5 text-center text-sm font-bold text-slate-900 dark:text-white"
                        />
                        <span className="text-xs font-semibold text-slate-500">hours</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          max="59"
                          step="5"
                          value={(Number(f.goal) || 0) % 60}
                          onChange={(e) => {
                            const m = Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0));
                            const h = Math.floor((Number(f.goal) || 0) / 60);
                            up('goal')(h * 60 + m);
                          }}
                          className="w-16 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1.5 text-center text-sm font-bold text-slate-900 dark:text-white"
                        />
                        <span className="text-xs font-semibold text-slate-500">mins</span>
                      </div>

                      <div className="ml-auto text-[11px] text-slate-400">
                        Total: <span className="font-bold text-slate-700 dark:text-slate-300">{f.goal || 0}m</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reps / Count Goal Input */}
                {f.measure === 'count' && (
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {f.habitType === 'negative' ? 'Maximum Reps / Count Budget' : 'Minimum Reps Target'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="1"
                        max="9999"
                        value={f.goal}
                        onChange={(e) => up('goal')(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-20 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1.5 text-center text-sm font-bold text-slate-900 dark:text-white"
                      />
                      <span className="text-xs font-semibold text-slate-500">reps</span>
                    </div>
                  </div>
                )}

                {/* Sleep Goal Input */}
                {f.measure === 'sleep_wake' && (
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Target Sleep Hours</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="4"
                        max="14"
                        step="0.5"
                        value={f.goal || 8}
                        onChange={(e) => up('goal')(parseFloat(e.target.value) || 8)}
                        className="w-20 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1.5 text-center text-sm font-bold text-slate-900 dark:text-white"
                      />
                      <span className="text-xs font-semibold text-slate-500">hrs</span>
                    </div>
                  </div>
                )}
              </div>
            )}
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
              className={`px-5 py-2.5 text-sm font-bold text-white rounded-xl shadow-lg transition active:scale-95 ${
                f.habitType === 'negative'
                  ? 'bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 shadow-rose-500/20'
                  : 'bg-gradient-to-r from-indigo-500 to-emerald-600 hover:from-indigo-600 hover:to-emerald-700 shadow-indigo-500/20'
              }`}
            >
              Create {f.habitType === 'negative' ? 'Limit Habit' : 'Habit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
