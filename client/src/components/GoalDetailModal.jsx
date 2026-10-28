import { useState } from 'react';
import { formatDaysLeft, getDaysLeft } from '../lib/api';

export default function GoalDetailModal({ goal, onClose, onUpdate, onDelete }) {
  const [g, setG] = useState(goal);
  const [newMilestoneText, setNewMilestoneText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const goalColor = g.color || '#8b5cf6';
  const daysInfo = formatDaysLeft(g.targetDate, g.completed);
  const daysLeft = getDaysLeft(g.targetDate);

  const pct = Math.min(100, Math.round(((g.currentValue || 0) / (g.targetValue || 1)) * 100));

  const saveUpdates = async (updatedFields) => {
    const updated = { ...g, ...updatedFields };
    setG(updated);
    await onUpdate(g._id, updatedFields);
  };

  const adjustValue = (delta) => {
    const newVal = Math.max(0, (g.currentValue || 0) + delta);
    saveUpdates({ currentValue: newVal, completed: newVal >= g.targetValue });
  };

  const toggleMilestone = (idx) => {
    const updatedMilestones = [...(g.milestones || [])];
    updatedMilestones[idx].done = !updatedMilestones[idx].done;
    saveUpdates({ milestones: updatedMilestones });
  };

  const addMilestone = () => {
    if (!newMilestoneText.trim()) return;
    const updatedMilestones = [...(g.milestones || []), { title: newMilestoneText.trim(), done: false }];
    saveUpdates({ milestones: updatedMilestones });
    setNewMilestoneText('');
  };

  const removeMilestone = (idx) => {
    const updatedMilestones = (g.milestones || []).filter((_, i) => i !== idx);
    saveUpdates({ milestones: updatedMilestones });
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onDelete(g._id);
      onClose();
    } catch (err) {
      console.error(err);
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm transition-all"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-2xl transition-all max-h-[92vh] overflow-y-auto space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: goalColor }} />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {g.kind === 'reminder' ? '🔔 Reminder · Event / OA' : `${g.category || 'Goal'} · Specific Target`}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                g.completed
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : daysLeft <= 0
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                  : daysLeft <= 7
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                  : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
              }`}>
                {daysLeft === 0 ? '🚨 TODAY' : daysInfo.text}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black font-display text-slate-900 dark:text-white">
              {g.title}
            </h2>
            {g.description && (
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                {g.description}
              </p>
            )}
            {g.link && (
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 font-semibold">
                <span>📍</span>
                <span>Platform / Venue: {g.link}</span>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* 1. Days Remaining Big Timer & Deadline Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              {g.kind === 'reminder' ? 'Event Schedule' : 'Countdown to Deadline'}
            </span>
            <span className="text-xs font-bold text-indigo-300 bg-white/10 px-2 py-0.5 rounded-md">
              {g.targetDate} {g.time ? `• ${g.time}` : ''}
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className={`text-3xl sm:text-4xl font-black font-display ${
              daysLeft <= 0 ? 'text-rose-400' : daysLeft <= 3 ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {daysLeft === 0 ? 'TODAY' : daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
            </span>
            <span className="text-sm font-semibold text-slate-300">
              {daysLeft === 0 ? (g.time ? `at ${g.time}` : 'Scheduled for today') : daysLeft === 1 ? 'Tomorrow' : ''}
            </span>
          </div>

          <p className="text-[11px] text-slate-400">
            {g.completed
              ? '✨ Completed & attended!'
              : daysLeft === 0
              ? '🚨 Happening TODAY! Prepare your setup and link ahead of time.'
              : daysLeft < 0
              ? '⚠️ Date has passed. Mark as attended or reschedule.'
              : daysLeft <= 3
              ? '⏰ Approaching soon! Review key materials and preparation.'
              : 'Scheduled on calendar.'}
          </p>
        </div>

        {/* 2. Progress Tracker & Quick Stepper Controls */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              {g.kind === 'reminder' ? 'Attendance & Completion' : 'Goal Progress'}
            </span>
            <span className="text-sm font-black font-display text-indigo-600 dark:text-indigo-400">
              {g.completed ? '✓ Completed' : 'Pending'}
            </span>
          </div>

          {g.kind === 'reminder' || g.goalType === 'checkbox' || g.targetValue === 1 ? (
            <div className="py-2 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {g.kind === 'reminder' ? 'Status:' : 'Tick Box Completion:'}
              </span>
              <button
                type="button"
                onClick={() => saveUpdates({ completed: !g.completed, currentValue: g.completed ? 0 : 1 })}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  g.completed
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md active:scale-95'
                }`}
              >
                <span>{g.completed ? '✓' : '○'}</span>
                <span>{g.completed ? 'Completed' : 'Mark as Done (Tick Box)'}</span>
              </button>
            </div>
          ) : (
            <>
              {/* Progress bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: goalColor,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                <span>
                  Done: <strong className="text-slate-900 dark:text-white">{g.currentValue}</strong> {g.unit}
                </span>
                <span>
                  Target: <strong className="text-slate-900 dark:text-white">{g.targetValue}</strong> {g.unit}
                </span>
              </div>

              {/* Quick Adjustment Steppers */}
              <div className="pt-2 flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Quick Log:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => adjustValue(-5)}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300"
                  >
                    -5
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustValue(-1)}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300"
                  >
                    -1
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustValue(1)}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustValue(5)}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                  >
                    +5
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 3. Milestone Checkpoints Checklist */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>🚩</span> Milestone Steps ({g.milestones?.filter((m) => m.done).length || 0} / {g.milestones?.length || 0})
            </span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {(g.milestones || []).map((m, idx) => (
              <div
                key={idx}
                onClick={() => toggleMilestone(idx)}
                className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition ${
                  m.done
                    ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/30'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`h-4 w-4 rounded-md border flex items-center justify-center text-[10px] font-bold ${
                    m.done
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-slate-400 bg-transparent text-transparent'
                  }`}>
                    ✓
                  </div>
                  <span className={`text-xs ${m.done ? 'line-through text-slate-400 dark:text-slate-500 font-medium' : 'text-slate-800 dark:text-slate-200 font-semibold'}`}>
                    {m.title}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeMilestone(idx);
                  }}
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
              placeholder="Add next checkpoint step..."
              className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={addMilestone}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900"
            >
              Add Step
            </button>
          </div>
        </div>

        {/* 4. Complete & Delete Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 p-2 transition"
          >
            {isDeleting ? 'Deleting...' : g.kind === 'reminder' ? '🗑️ Delete Reminder' : '🗑️ Delete Goal'}
          </button>

          <button
            type="button"
            onClick={() => saveUpdates({ completed: !g.completed })}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-md active:scale-95 ${
              g.completed
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
            }`}
          >
            {g.completed ? '↩ Mark In Progress' : '✓ Mark Goal Completed'}
          </button>
        </div>
      </div>
    </div>
  );
}
