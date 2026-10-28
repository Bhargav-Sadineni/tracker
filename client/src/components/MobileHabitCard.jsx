import { useState, useMemo } from 'react';
import {
  isDone,
  formatGoalText,
  formatDuration,
  parseDurationInput,
  timeToMinutes,
  minutesToTime,
} from '../lib/api';

export default function MobileHabitCard({ activity: a, days, entries, today, onSetValue, onSelect }) {
  const habitColor = a.color || '#6366f1';

  // Modal / Popover state for entering measurable values on a specific day
  const [activeDayEdit, setActiveDayEdit] = useState(null);
  const [editValue, setEditValue] = useState(0);
  const [editSleep, setEditSleep] = useState('');
  const [editWake, setEditWake] = useState('');
  const [editTimeStr, setEditTimeStr] = useState('');

  // Exactly the LAST 3 DAYS for mobile display
  const last3Days = useMemo(() => {
    if (!days || days.length === 0) return [today];
    return days.slice(-3);
  }, [days, today]);

  // Open quick edit sheet for a specific day
  const handleOpenDayEdit = (d, ent) => {
    const v = typeof ent === 'object' ? ent.value || 0 : typeof ent === 'number' ? ent : 0;
    setActiveDayEdit(d);
    setEditValue(v);
    setEditSleep(ent.sleepTime || '');
    setEditWake(ent.wakeTime || '');
    setEditTimeStr(ent.timeStr || '');
  };

  const handleSaveDayEdit = () => {
    if (!activeDayEdit) return;
    if (a.measure === 'sleep_wake') {
      onSetValue(a, activeDayEdit, undefined, undefined, editSleep, editWake);
    } else if (a.measure === 'time_of_day') {
      onSetValue(a, activeDayEdit, editTimeStr ? timeToMinutes(editTimeStr) : 0, editTimeStr);
    } else {
      onSetValue(a, activeDayEdit, Number(editValue) || 0);
    }
    setActiveDayEdit(null);
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 p-3.5 shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-700">
      <div className="flex items-center justify-between gap-3">
        {/* LEFT: Habit Name & Core Metadata (Tap to view full details) */}
        <div
          className="min-w-0 flex-1 cursor-pointer select-none"
          onClick={() => onSelect(a)}
          title="Tap to view full analytics"
        >
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: habitColor }}
            />
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate">
              {a.name}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
            <span
              className={`rounded px-1.5 py-0.2 font-bold text-[9px] ${
                a.habitType === 'negative'
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
              }`}
            >
              {a.habitType === 'negative' ? '− Limit' : '+ Routine'}
            </span>

            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              {formatGoalText(a)}
            </span>

            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span className="truncate opacity-80">{a.category || 'General'}</span>
          </div>
        </div>

        {/* RIGHT: LAST 3 DAYS CHECK-IN STRIP (Exactly 3 days on mobile) */}
        <div className="flex items-center gap-2 shrink-0">
          {last3Days.map((d, idx) => {
            const isToday = d === today;
            const ent = entries[`${a._id}|${d}`] || {};
            const val = typeof ent === 'object' ? ent.value || 0 : typeof ent === 'number' ? ent : 0;
            const timeStr = typeof ent === 'object' ? ent.timeStr || '' : '';
            const sTime = typeof ent === 'object' ? ent.sleepTime || '' : '';
            const wTime = typeof ent === 'object' ? ent.wakeTime || '' : '';
            const done = isDone(a, val, timeStr, sTime, wTime);
            const isBelow = !done && (val > 0 || (timeStr && timeStr.length > 0) || (sTime && wTime));

            // Clean Day Name
            const dateObj = new Date(d + 'T00:00');
            const dayName = isToday
              ? 'Today'
              : idx === 1
              ? 'Yest'
              : dateObj.toLocaleDateString('en-US', { weekday: 'short' });

            return (
              <div key={d} className="flex flex-col items-center gap-1">
                {/* Day Header Label */}
                <span
                  className={`text-[9px] font-bold tracking-tight uppercase ${
                    isToday
                      ? 'text-indigo-600 dark:text-indigo-400 font-black'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {dayName}
                </span>

                {/* Day Interactive Action Button (40x40px for iPhone 17 touch) */}
                {a.measure === 'checkbox' ? (
                  <button
                    type="button"
                    aria-label={`${a.name} on ${d}`}
                    onClick={() => onSetValue(a, d, done ? 0 : 1)}
                    style={done ? { backgroundColor: habitColor } : {}}
                    className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-sm transition-all duration-200 active:scale-85 ${
                      done
                        ? 'text-white shadow-md animate-pop border-transparent'
                        : 'border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-transparent hover:border-slate-400'
                    } ${isToday ? 'ring-2 ring-indigo-500/30 dark:ring-indigo-400/30' : ''}`}
                  >
                    ✓
                  </button>
                ) : (
                  <button
                    type="button"
                    aria-label={`${a.name} measure on ${d}`}
                    onClick={() => handleOpenDayEdit(d, ent)}
                    className={`h-10 w-10 rounded-xl flex flex-col items-center justify-center text-xs font-black transition-all duration-200 active:scale-90 border ${
                      done
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-sm animate-pop'
                        : isBelow
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 text-amber-600 dark:text-amber-400'
                        : val > 0 && a.goalOperator === 'lte'
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-600 dark:text-rose-400'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-400'
                    } ${isToday ? 'ring-2 ring-indigo-500/30 dark:ring-indigo-400/30' : ''}`}
                  >
                    {done ? (
                      <span>✓ {a.measure === 'count' ? val : a.measure === 'time' ? `${val}m` : ''}</span>
                    ) : isBelow ? (
                      <span className="text-[11px] leading-tight font-black">{a.measure === 'time' ? `${val}m` : val}</span>
                    ) : (
                      <span className="text-[11px] font-bold opacity-60">+0</span>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* QUICK LOGGING MODAL FOR MEASURABLE HABIT ON A DAY */}
      {activeDayEdit && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block">
                  Quick Log • {activeDayEdit}
                </span>
                <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {a.name}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setActiveDayEdit(null)}
                className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            {/* Habit Goal Target */}
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-semibold">Target Goal:</span>
              <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                {formatGoalText(a)}
              </span>
            </div>

            {/* Input according to habit measure */}
            {a.measure === 'count' && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block text-center">
                  Enter Count / Reps
                </label>
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEditValue((v) => Math.max(0, v - 1))}
                    className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xl font-bold active:scale-90"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={editValue}
                    onChange={(e) => setEditValue(Number(e.target.value) || 0)}
                    className="h-12 w-24 text-center rounded-2xl border-2 border-indigo-500 text-xl font-black bg-white dark:bg-slate-850 text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setEditValue((v) => v + 1)}
                    className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xl font-bold active:scale-90"
                  >
                    +
                  </button>
                </div>

                {/* Quick Preset Buttons */}
                <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                  {[1, 5, a.goal || 10].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setEditValue(preset)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 active:scale-95"
                    >
                      +{preset}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setEditValue(0)}
                    className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-xs font-bold text-rose-600 active:scale-95"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {a.measure === 'time' && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block text-center">
                  Duration Logged
                </label>
                <div className="flex items-center justify-center gap-2">
                  <input
                    type="text"
                    defaultValue={editValue ? formatDuration(editValue) : ''}
                    placeholder="e.g. 30m or 1h 15m"
                    onBlur={(e) => setEditValue(parseDurationInput(e.target.value))}
                    className="h-11 w-44 text-center rounded-2xl border-2 border-indigo-500 text-base font-black bg-white dark:bg-slate-850 text-slate-900 dark:text-white"
                  />
                </div>
                <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                  {[15, 30, 45, 60].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setEditValue((v) => v + m)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 active:scale-95"
                    >
                      +{m}m
                    </button>
                  ))}
                </div>
              </div>
            )}

            {a.measure === 'sleep_wake' && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    🌙 Bedtime
                  </label>
                  <input
                    type="time"
                    value={editSleep}
                    onChange={(e) => setEditSleep(e.target.value)}
                    className="w-full h-10 px-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold bg-white dark:bg-slate-850 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    ☀️ Wake Up
                  </label>
                  <input
                    type="time"
                    value={editWake}
                    onChange={(e) => setEditWake(e.target.value)}
                    className="w-full h-10 px-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold bg-white dark:bg-slate-850 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            {a.measure === 'time_of_day' && (
              <div className="pt-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1 text-center">
                  Clock Time
                </label>
                <input
                  type="time"
                  value={editTimeStr}
                  onChange={(e) => setEditTimeStr(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border-2 border-indigo-500 text-sm font-bold bg-white dark:bg-slate-850 text-slate-900 dark:text-white text-center"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveDayEdit(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDayEdit}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md active:scale-95"
              >
                Save Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
