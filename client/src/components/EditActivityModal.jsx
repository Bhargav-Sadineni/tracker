import { useState } from 'react';
import { CATEGORIES } from '../lib/constants';
import ColorPicker from './ColorPicker';
import { ymd, addDays, getDaysLeft, formatDuration } from '../lib/api';

export default function EditActivityModal({ activity, activities = [], onClose, onSave }) {
  const [f, setF] = useState({
    name: activity.name,
    description: activity.description || '',
    habitType: activity.habitType || (activity.goalOperator === 'lte' ? 'negative' : 'positive'),
    hasGoal: activity.hasGoal !== undefined ? activity.hasGoal : true,
    category: activity.category || 'General',
    color: activity.color || '#6366f1',
    frequency: activity.frequency || 'daily',
    challengeDays: activity.challengeDays || 10,
    startDate: activity.startDate || ymd(new Date()),
    date: activity.date || ymd(addDays(10)),
    goal: activity.goal !== undefined && activity.goal !== null ? activity.goal : (activity.measure === 'time' ? 30 : 1),
    goalOperator: activity.goalOperator || (activity.habitType === 'negative' ? 'lte' : 'gte'),
    measure: activity.measure,
    linkedActivity: activity.linkedActivity || '',
  });
  const [saving, setSaving] = useState(false);

  const up = (k) => (v) => setF((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!f.name.trim()) return;
    try {
      setSaving(true);

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

      await onSave({
        ...f,
        name: f.name.trim(),
        frequency: f.frequency,
        challengeDays: cDays,
        startDate: sDate,
        date: targetDate,
        habitType: f.habitType,
        hasGoal: f.hasGoal,
        goal: f.hasGoal ? (f.measure === 'checkbox' ? 1 : Number(f.goal) || 1) : null,
        goalOperator: f.habitType === 'negative' ? 'lte' : f.goalOperator || 'gte',
        linkedActivity: f.linkedActivity || null,
      });
      onClose();
    } catch (err) {
      console.error(err);
      setSaving(false);
    }
  };

  const otherActivities = activities.filter((act) => act._id !== activity._id);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white">Edit Habit</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Update configuration for "{activity.name}"</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {/* Habit Nature Selector: Positive (+) vs Negative (-) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Habit Nature / Direction
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  up('habitType')('positive');
                  up('goalOperator')('gte');
                }}
                className={`py-3 px-3 rounded-2xl border text-center transition flex items-center justify-center ${
                  f.habitType === 'positive'
                    ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/50 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
                  <span>🟢</span> Positive Routine (+)
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  up('habitType')('negative');
                  up('goalOperator')('lte');
                }}
                className={`py-3 px-3 rounded-2xl border text-center transition flex items-center justify-center ${
                  f.habitType === 'negative'
                    ? 'border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 ring-2 ring-rose-500/50 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-rose-600 dark:text-rose-400">
                  <span>🔴</span> Negative Habit (−)
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Habit Name
            </label>
            <input
              required
              value={f.name}
              onChange={(e) => up('name')(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Description (optional)
            </label>
            <input
              value={f.description}
              onChange={(e) => up('description')(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
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
                Frequency & Schedule
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

            {/* Mode 2: Multi-day challenge */}
            {f.frequency === 'challenge' && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Challenge Presets:
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
                        className={`px-2 py-0.5 rounded-lg text-xs font-bold transition ${
                          Number(f.challengeDays) === d
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Duration (Days)
                    </label>
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
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Start Date
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
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between text-xs">
                  <span className="text-amber-900 dark:text-amber-200 font-semibold">
                    Finish Target: {f.date}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white font-black text-[11px]">
                    ⏳ {getDaysLeft(f.date)} days left
                  </span>
                </div>
              </div>
            )}

            {/* Mode 3: Specific target date */}
            {f.frequency === 'specific' && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Quick Shortcuts:
                  </span>
                  <div className="flex items-center gap-1.5">
                    {[
                      { label: '+2d', d: 2 },
                      { label: '+7d', d: 7 },
                      { label: '+10d', d: 10 },
                      { label: 'Next Month (30d)', d: 30 },
                    ].map((btn) => (
                      <button
                        key={btn.label}
                        type="button"
                        onClick={() => up('date')(ymd(addDays(btn.d)))}
                        className="px-2 py-0.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 border border-slate-200 dark:border-slate-700"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Target / Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={f.date}
                    onChange={(e) => up('date')(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 flex items-center justify-between text-xs">
                  <span className="text-sky-900 dark:text-sky-200 font-semibold">
                    Due: {f.date}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-sky-600 text-white font-black text-[11px]">
                    ⏳ {getDaysLeft(f.date)} days away
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Goal Setting (Optional) */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>🎯</span> Daily Goal Setting <span className="text-[10px] font-normal text-slate-400">(Optional)</span>
                </span>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {f.hasGoal
                    ? f.habitType === 'negative'
                      ? 'Limit goal active: stay under budget for success'
                      : 'Target goal active: reach or exceed target'
                    : 'Free tracking: no pass/fail targets'}
                </p>
              </div>

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

            {f.hasGoal && (
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-3">
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

                {f.measure === 'count' && (
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {f.habitType === 'negative' ? 'Maximum Reps / Count Limit' : 'Target Reps Needed'}
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
              </div>
            )}
          </div>


          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-bold text-white rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
