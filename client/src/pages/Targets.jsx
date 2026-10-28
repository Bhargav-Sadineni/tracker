import { useEffect, useMemo, useState } from 'react';
import {
  api,
  ymd,
  addDays,
  formatDaysLeft,
  getDaysLeft,
  getChallengeInfo,
} from '../lib/api';
import ThemeToggle from '../components/ThemeToggle';
import NewGoalModal from '../components/NewGoalModal';
import NewReminderModal from '../components/NewReminderModal';
import GoalDetailModal from '../components/GoalDetailModal';
import NewActivityModal from '../components/NewActivityModal';
import { triggerConfetti } from '../lib/confetti';

export default function Targets({ onNavigate, onSelectActivity }) {
  const [goals, setGoals] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'reminder' | 'goal' | 'habit'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'in_progress' | 'urgent' | 'completed'
  const [filterCategory, setFilterCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewGoalModal, setShowNewGoalModal] = useState(false);
  const [showNewReminderModal, setShowNewReminderModal] = useState(false);
  const [showNewActivityModal, setShowNewActivityModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const [acts, gls] = await Promise.all([
        api('/activities'),
        api('/goals').catch(() => []),
      ]);
      setActivities(acts || []);
      setGoals(gls || []);
      setError('');
    } catch {
      setError('Cannot load targets. Please check the backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createGoal = async (data) => {
    try {
      const g = await api('/goals', 'POST', data);
      setGoals((p) => [...p, g]);
      setShowNewGoalModal(false);
      setShowNewReminderModal(false);
      triggerConfetti();
    } catch (err) {
      console.error('Failed to create goal', err);
    }
  };

  const updateGoal = async (id, updatedFields) => {
    try {
      const updated = await api(`/goals/${id}`, 'PUT', updatedFields);
      setGoals((p) => p.map((g) => (g._id === id ? updated : g)));
      if (selectedGoal?._id === id) setSelectedGoal(updated);
      if (updatedFields.completed) {
        triggerConfetti();
      }
    } catch (err) {
      console.error('Failed to update goal', err);
    }
  };

  const deleteGoal = async (id) => {
    try {
      await api(`/goals/${id}`, 'DELETE');
      setGoals((p) => p.filter((g) => g._id !== id));
      if (selectedGoal?._id === id) setSelectedGoal(null);
    } catch (err) {
      console.error('Failed to delete goal', err);
    }
  };

  const createActivity = async (data) => {
    try {
      const a = await api('/activities', 'POST', data);
      setActivities((p) => [...p, a]);
      setShowNewActivityModal(false);
      triggerConfetti();
    } catch (err) {
      console.error('Failed to create activity', err);
    }
  };

  const toggleActivityCompleted = async (act) => {
    try {
      const nextCompleted = !act.completed;
      const updated = await api(`/activities/${act._id}`, 'PUT', {
        completed: nextCompleted,
        completedAt: nextCompleted ? new Date() : null,
      });
      setActivities((p) => p.map((a) => (a._id === act._id ? updated : a)));
      if (nextCompleted) {
        triggerConfetti();
      }
    } catch (err) {
      console.error('Failed to update activity completion', err);
    }
  };

  // Unified targets list: combines Goals, Reminders AND deadline/challenge Habits
  const unifiedTargets = useMemo(() => {
    const list = [];

    // 1. Specific Milestone Goals & Reminders
    goals.forEach((g) => {
      const days = getDaysLeft(g.targetDate);
      const isReminder = g.kind === 'reminder';
      const isOA = isReminder && (g.title.toLowerCase().includes('oa') || (g.category && g.category.toLowerCase().includes('oa')));
      const isCheckboxGoal = !isReminder && (g.goalType === 'checkbox' || g.targetValue === 1 || g.unit === 'task' || g.unit === 'checkbox' || g.unit === 'tickbox');
      list.push({
        id: g._id,
        key: `goal_${g._id}`,
        isActivity: false,
        itemType: isReminder ? 'reminder' : 'goal',
        goalType: isCheckboxGoal ? 'checkbox' : (g.goalType || 'numeric'),
        typeBadge: isReminder ? (isOA ? '💻 Online Assessment (OA)' : '🔔 Reminder') : (isCheckboxGoal ? '☑️ Target Task' : '🎯 Specific Goal'),
        title: g.title,
        description: g.description,
        category: g.category || (isReminder ? 'Exams & OA' : 'General'),
        color: g.color || (isReminder ? '#f59e0b' : '#8b5cf6'),
        targetDate: g.targetDate,
        time: g.time || '',
        link: g.link || '',
        daysLeft: days,
        completed: !!g.completed,
        currentValue: isReminder ? (g.completed ? 1 : 0) : (g.currentValue || 0),
        targetValue: isReminder || isCheckboxGoal ? 1 : (g.targetValue || 1),
        unit: isReminder ? 'reminder' : isCheckboxGoal ? 'task' : (g.unit || ''),
        raw: g,
      });
    });

    // 2. Activities that have a specific deadline (like EMI next month) or are multi-day challenges (e.g. 10-day habit)
    activities.forEach((a) => {
      if (a.frequency === 'specific') {
        const days = getDaysLeft(a.date);
        list.push({
          id: a._id,
          key: `act_${a._id}`,
          isActivity: true,
          itemType: 'specific_habit',
          typeBadge: '💳 Habit Deadline',
          title: a.name,
          description: a.description || `Target deadline: ${a.date}`,
          category: a.category || 'Finances & Bills',
          color: a.color || '#0ea5e9',
          targetDate: a.date,
          daysLeft: days,
          completed: !!a.completed,
          currentValue: a.completed ? 1 : 0,
          targetValue: 1,
          unit: 'task',
          raw: a,
        });
      } else if (a.frequency === 'challenge') {
        const cInfo = getChallengeInfo(a);
        const days = cInfo ? cInfo.daysLeft : getDaysLeft(a.date);
        list.push({
          id: a._id,
          key: `act_${a._id}`,
          isActivity: true,
          itemType: 'challenge_habit',
          typeBadge: `⏱️ ${a.challengeDays || 10}-Day Challenge`,
          title: a.name,
          description: a.description || `${a.challengeDays || 10}-day habit challenge`,
          category: a.category || 'Productivity',
          color: a.color || '#f97316',
          targetDate: a.date || (cInfo ? cInfo.targetDate : null),
          daysLeft: days,
          completed: !!a.completed || (cInfo && cInfo.isFinished && a.completed),
          currentValue: cInfo ? cInfo.currentDay : 1,
          targetValue: a.challengeDays || 10,
          unit: 'days',
          challengeInfo: cInfo,
          raw: a,
        });
      }
    });

    return list;
  }, [goals, activities]);

  const reminderTargets = unifiedTargets.filter((t) => t.itemType === 'reminder');
  const goalTargets = unifiedTargets.filter((t) => t.itemType === 'goal');
  const habitTargets = unifiedTargets.filter((t) => t.isActivity);
  const activeTargets = unifiedTargets.filter((t) => !t.completed);
  const completedTargets = unifiedTargets.filter((t) => t.completed);
  const urgentTargets = activeTargets.filter((t) => t.daysLeft <= 7);
  const todayReminders = reminderTargets.filter((t) => !t.completed && t.daysLeft === 0);

  // Closest upcoming target deadline
  const closestTarget = useMemo(() => {
    if (activeTargets.length === 0) return null;
    return [...activeTargets].sort((a, b) => a.daysLeft - b.daysLeft)[0];
  }, [activeTargets]);

  const closestDaysLeft = closestTarget ? closestTarget.daysLeft : null;
  const closestDaysInfo = closestTarget
    ? formatDaysLeft(closestTarget.targetDate, closestTarget.completed)
    : null;

  const targetCompletionPct = unifiedTargets.length
    ? Math.round((completedTargets.length / unifiedTargets.length) * 100)
    : 0;

  // Categories list
  const allCategories = ['All', ...new Set(unifiedTargets.map((t) => t.category || 'General'))];

  // STRICT ORDERING:
  // 2 days away strictly precedes 10 days away!
  const sortedFilteredTargets = useMemo(() => {
    return unifiedTargets
      .filter((t) => {
        // Type filter
        if (filterType === 'reminder' && t.itemType !== 'reminder') return false;
        if (filterType === 'goal' && t.itemType !== 'goal') return false;
        if (filterType === 'habit' && !t.isActivity) return false;

        // Status filter
        if (filterStatus === 'in_progress' && t.completed) return false;
        if (filterStatus === 'completed' && !t.completed) return false;
        if (filterStatus === 'urgent' && (t.completed || t.daysLeft > 7)) return false;

        // Category filter
        if (filterCategory !== 'All' && t.category !== filterCategory) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = t.title.toLowerCase().includes(q);
          const matchDesc = t.description && t.description.toLowerCase().includes(q);
          if (!matchTitle && !matchDesc) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // In 'all' view: show active items first, completed items at bottom
        if (filterStatus === 'all' && a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        // STRICT ASCENDING ORDER BY DAYS LEFT:
        // 2 days left strictly precedes 10 days left
        if (a.daysLeft !== b.daysLeft) {
          return a.daysLeft - b.daysLeft;
        }
        return a.title.localeCompare(b.title);
      });
  }, [unifiedTargets, filterType, filterStatus, filterCategory, searchQuery]);

  // On mobile view: show purely Reminders, filtered by status, category, and search
  const mobileReminders = useMemo(() => {
    return unifiedTargets
      .filter((t) => {
        // Purely Reminders on mobile
        if (t.itemType !== 'reminder') return false;

        // Status filter
        if (filterStatus === 'in_progress' && t.completed) return false;
        if (filterStatus === 'completed' && !t.completed) return false;
        if (filterStatus === 'urgent' && (t.completed || t.daysLeft > 7)) return false;

        // Category filter
        if (filterCategory !== 'All' && t.category !== filterCategory) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = t.title.toLowerCase().includes(q);
          const matchDesc = t.description && t.description.toLowerCase().includes(q);
          if (!matchTitle && !matchDesc) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (filterStatus === 'all' && a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        if (a.daysLeft !== b.daysLeft) {
          return a.daysLeft - b.daysLeft;
        }
        return a.title.localeCompare(b.title);
      });
  }, [unifiedTargets, filterStatus, filterCategory, searchQuery]);

  // Shared Card Renderer for both Laptop and Mobile views
  const renderTargetCard = (item) => {
    const daysLeft = item.daysLeft;
    const daysInfo = formatDaysLeft(item.targetDate, item.completed);
    const pct = Math.min(
      100,
      Math.round(((item.currentValue || 0) / (item.targetValue || 1)) * 100)
    );

    const isReminder = item.itemType === 'reminder';
    const isTodayReminder = isReminder && !item.completed && daysLeft === 0;

    return (
      <div
        key={item.key}
        className={`rounded-2xl border bg-white dark:bg-slate-900/90 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3 group ${
          item.completed
            ? 'border-emerald-200 dark:border-emerald-900/40 opacity-80'
            : isTodayReminder
            ? 'border-amber-400 dark:border-amber-500 ring-2 ring-amber-500/50 bg-amber-50/25 dark:bg-amber-950/20 shadow-md'
            : daysLeft <= 3
            ? 'border-rose-300 dark:border-rose-900/60 ring-1 ring-rose-500/30'
            : 'border-slate-200/90 dark:border-slate-800'
        }`}
      >
        <div>
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                {item.category || 'General'}
              </span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                item.itemType === 'reminder'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                  : item.itemType === 'goal'
                  ? 'bg-violet-100 text-violet-700 dark:bg-violet-950/80 dark:text-violet-300'
                  : item.itemType === 'challenge_habit'
                  ? 'bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-300'
                  : 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300'
              }`}>
                {item.typeBadge}
              </span>
            </div>

            {/* Prominent Days Left Badge */}
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border shrink-0 ${
              item.completed
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300'
                : isTodayReminder
                ? 'bg-rose-500 text-white border-rose-600 animate-pulse shadow-sm'
                : daysLeft <= 3
                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 animate-pulse'
                : daysLeft <= 7
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300'
                : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-200'
            }`}>
              {daysInfo.text}
            </span>
          </div>

          <h3
            onClick={() => {
              if (!item.isActivity) setSelectedGoal(item.raw);
              else onSelectActivity(item.raw);
            }}
            className="font-bold text-base text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition line-clamp-1"
          >
            {item.title}
          </h3>
          {item.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
              {item.description}
            </p>
          )}
        </div>

        {/* Target Date & Progress / Platform Details */}
        {item.itemType === 'reminder' ? (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5 flex-wrap">
                <span>📅 {item.targetDate || 'No date'}</span>
                {item.time && (
                  <span className="px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold text-[11px]">
                    ⏰ {item.time}
                  </span>
                )}
              </span>
              <span className={`font-bold ${item.completed ? 'text-emerald-600 dark:text-emerald-400' : daysLeft === 0 ? 'text-rose-600 dark:text-rose-400 font-black' : 'text-amber-600 dark:text-amber-400'}`}>
                {item.completed ? '✓ Attended' : daysLeft === 0 ? '🚨 TODAY!' : 'Scheduled'}
              </span>
            </div>

            {item.link ? (
              <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <span className="text-[13px]">📍</span>
                <span className="text-slate-400 dark:text-slate-500 text-[11px] font-semibold">Platform:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{item.link}</span>
              </div>
            ) : (
              <div className="h-1 bg-amber-100/60 dark:bg-amber-950/40 rounded-full" />
            )}
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>{item.itemType === 'challenge_habit' ? 'Finish' : 'Target'}: {item.targetDate || 'No date'}</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {item.itemType === 'challenge_habit' && item.challengeInfo
                  ? item.challengeInfo.label
                  : item.itemType === 'specific_habit'
                  ? (item.completed ? '✓ Completed' : 'Pending Payment / Check')
                  : item.goalType === 'checkbox'
                  ? (item.completed ? '✓ Completed' : 'Pending Completion')
                  : `${item.currentValue} / ${item.targetValue} ${item.unit} (${pct}%)`}
              </span>
            </div>

            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${item.itemType === 'specific_habit' || item.goalType === 'checkbox' ? (item.completed ? 100 : 0) : pct}%`,
                  backgroundColor: item.color || '#8b5cf6',
                }}
              />
            </div>
          </div>
        )}

        {/* Footer Controls */}
        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          {item.itemType === 'reminder' ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const nextVal = !item.completed;
                  updateGoal(item.id, { completed: nextVal, currentValue: nextVal ? 1 : 0 });
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95 ${
                  item.completed
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white'
                }`}
              >
                <span>{item.completed ? '✓' : '○'}</span>
                <span>{item.completed ? 'Attended / Done' : 'Mark Attended / Done'}</span>
              </button>

              <button
                type="button"
                onClick={() => deleteGoal(item.id)}
                className="h-8 w-8 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center text-xs transition"
                title="Delete Reminder"
              >
                🗑️
              </button>
            </div>
          ) : !item.isActivity ? (
            item.goalType === 'checkbox' ? (
              /* Checkbox / Single Tick Box Goal (e.g. Complete OS) */
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const nextDone = !item.completed;
                    updateGoal(item.id, {
                      completed: nextDone,
                      currentValue: nextDone ? 1 : 0,
                    });
                    if (nextDone) triggerConfetti();
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm active:scale-95 ${
                    item.completed
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300'
                      : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white'
                  }`}
                >
                  <span
                    className={`h-4 w-4 rounded-md border flex items-center justify-center text-xs font-black transition-all ${
                      item.completed
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-white/80 bg-white/20'
                    }`}
                  >
                    {item.completed ? '✓' : ''}
                  </span>
                  <span>{item.completed ? 'Completed / Done' : 'Mark as Done'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => deleteGoal(item.id)}
                  className="h-8 w-8 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center text-xs transition"
                  title="Delete Goal"
                >
                  🗑️
                </button>
              </div>
            ) : (
              /* Measurable Numeric Goal (e.g. Master 100 DSA Problems) */
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = Math.max(0, (item.currentValue || 0) - 1);
                    updateGoal(item.id, { currentValue: nextVal, completed: nextVal >= item.targetValue });
                  }}
                  className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold"
                >
                  -1
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = (item.currentValue || 0) + 1;
                    updateGoal(item.id, { currentValue: nextVal, completed: nextVal >= item.targetValue });
                  }}
                  className="px-2 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 text-xs font-bold"
                >
                  +1
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = (item.currentValue || 0) + 5;
                    updateGoal(item.id, { currentValue: nextVal, completed: nextVal >= item.targetValue });
                  }}
                  className="px-2 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 hover:bg-indigo-200 text-indigo-700 dark:text-indigo-300 text-xs font-bold"
                >
                  +5
                </button>
              </div>
            )
          ) : (
            /* Time-bound Habit: Mark Completed / Paid toggle button */
            <button
              type="button"
              onClick={() => toggleActivityCompleted(item.raw)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                item.completed
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300'
                  : item.itemType === 'specific_habit'
                  ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-sm'
                  : 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
              }`}
            >
              <span>{item.completed ? '✓' : '○'}</span>
              <span>{item.completed ? 'Completed' : item.itemType === 'specific_habit' ? 'Mark Paid / Done' : 'Complete Challenge'}</span>
            </button>
          )}

          {/* View Details Link */}
          <button
            type="button"
            onClick={() => {
              if (!item.isActivity) setSelectedGoal(item.raw);
              else onSelectActivity(item.raw);
            }}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            <span>{item.itemType === 'reminder' ? 'Reminder Details' : item.isActivity ? 'Open Habit' : 'All in Detail'}</span>
            <span>➔</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md px-3.5 sm:px-8 py-3 transition-colors">
        <div className="w-full max-w-[1700px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Brand & Navigation Tabs */}
          <div className="flex items-center justify-between sm:justify-start gap-4">
            <div className="flex items-center gap-2.5">
              <div>
                <span className="font-black text-2xl sm:text-3xl font-display tracking-tight text-slate-900 dark:text-white">
                  Tracker
                </span>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                  Target Deadlines, Reminders &amp; Milestones
                </p>
              </div>
            </div>

            {/* Page Navigation Tabs (Desktop only - Mobile uses bottom dock) */}
            <div className="hidden sm:flex items-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-800/80 p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition flex items-center gap-1.5"
              >
                <span>📊</span>
                <span>Habits Matrix</span>
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm transition flex items-center gap-1.5 font-extrabold"
              >
                <span>🎯</span>
                <span>Targets &amp; Deadlines</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  {activeTargets.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('expenditure')}
                className="px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition flex items-center gap-1.5 cursor-pointer"
                title="Switch to Monthly Expenditure"
              >
                <span>💳</span>
                <span>Monthly Expenditure</span>
              </button>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setShowNewReminderModal(true)}
              className="px-4 py-2 sm:px-3.5 sm:py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white text-xs font-black shadow-md shadow-amber-500/25 active:scale-95 transition flex items-center gap-1.5 min-h-[40px]"
            >
              <span>🔔</span>
              <span>+ Add Reminder</span>
            </button>
            <button
              type="button"
              onClick={() => setShowNewGoalModal(true)}
              className="hidden sm:inline-flex px-4 py-2 sm:px-3.5 sm:py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-black shadow-md shadow-violet-600/20 active:scale-95 transition items-center gap-1.5 min-h-[40px]"
            >
              <span>🎯</span>
              <span>+ New Goal</span>
            </button>
            <button
              type="button"
              onClick={() => setShowNewActivityModal(true)}
              className="hidden sm:inline-flex px-3.5 py-2 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-sm transition items-center gap-1.5 min-h-[40px]"
            >
              <span>⏱️</span>
              <span>+ Habit Deadline</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content with bottom padding for mobile dock */}
      <main className="flex-1 w-full max-w-[1700px] mx-auto px-3.5 sm:px-8 py-5 sm:py-6 pb-28 sm:pb-8 space-y-5 sm:space-y-6">
        {error && (
          <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 p-3.5 text-xs text-rose-700 dark:text-rose-400 flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button onClick={load} className="underline text-xs font-semibold ml-2">Retry</button>
          </div>
        )}

        {/* 4 Targets Overview Metric Cards (Laptop Only: Hidden on Mobile) */}
        <section className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* 1. Active Target Deadlines */}
          <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Active Targets
              </span>
              <span className="text-sm sm:text-base">🎯</span>
            </div>
            <div className="mt-2 sm:mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black font-display text-violet-600 dark:text-violet-400">
                {activeTargets.length}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">pending total</span>
            </div>
            <div className="mt-2.5 truncate text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">
              {goalTargets.length} Goals · {reminderTargets.length} Reminders · {habitTargets.length} Habits
            </div>
          </div>

          {/* 2. Reminders & OAs */}
          <div className={`rounded-2xl sm:rounded-3xl border p-4 sm:p-5 shadow-sm transition-all ${
            todayReminders.length > 0
              ? 'border-rose-400 dark:border-rose-700 bg-rose-50/50 dark:bg-rose-950/30 ring-1 ring-rose-500/30'
              : 'border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Reminders & OAs
              </span>
              <span className="text-sm sm:text-base">{todayReminders.length > 0 ? '🚨' : '🔔'}</span>
            </div>
            <div className="mt-2 sm:mt-3 flex items-baseline gap-1.5">
              <span className={`text-2xl sm:text-3xl font-black font-display ${
                todayReminders.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-amber-500 dark:text-amber-400'
              }`}>
                {reminderTargets.length}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">scheduled</span>
            </div>
            <div className="mt-2.5 truncate text-[10px] sm:text-xs font-bold">
              {todayReminders.length > 0 ? (
                <span className="text-rose-600 dark:text-rose-400 animate-pulse">
                  🚨 {todayReminders.length} Due TODAY!
                </span>
              ) : (
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  {reminderTargets.filter((r) => !r.completed).length} pending · {reminderTargets.filter((r) => r.completed).length} attended
                </span>
              )}
            </div>
          </div>

          {/* 3. Nearest Deadline / OA */}
          <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Nearest Event / Target
              </span>
              <span className="text-sm sm:text-base">⏳</span>
            </div>
            <div className="mt-2 sm:mt-3 flex items-baseline gap-1.5 truncate">
              <span className={`text-xl sm:text-2xl font-black font-display truncate ${
                closestDaysLeft !== null && closestDaysLeft <= 0
                  ? 'text-rose-600 dark:text-rose-400 animate-pulse'
                  : closestDaysLeft !== null && closestDaysLeft <= 3
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-900 dark:text-white'
              }`}>
                {closestDaysLeft === 0 ? '🚨 TODAY!' : closestDaysInfo ? closestDaysInfo.text : 'All Clear'}
              </span>
            </div>
            <div className="mt-2.5 truncate text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
              {closestTarget ? `${closestTarget.title} (${closestTarget.targetDate}${closestTarget.time ? ` ${closestTarget.time}` : ''})` : 'No upcoming deadlines'}
            </div>
          </div>

          {/* 4. Target Completion Rate */}
          <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Milestones & Reminders
              </span>
              <span className="text-sm sm:text-base">🏆</span>
            </div>
            <div className="mt-2 sm:mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black font-display text-emerald-600 dark:text-emerald-400">
                {targetCompletionPct}%
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">completed</span>
            </div>
            <div className="mt-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 sm:h-2 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                style={{ width: `${targetCompletionPct}%` }}
              />
            </div>
            <div className="mt-1.5 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
              {completedTargets.length} of {unifiedTargets.length} targets completed
            </div>
          </div>
        </section>

        {/* LAPTOP VIEW: Filter Bar & Controls */}
        <div className="hidden sm:flex flex-col gap-3.5 bg-white dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          {/* Row 1: Target Type Filters */}
          <div className="flex items-center overflow-x-auto gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800 scrollbar-none">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                filterType === 'all'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              All Targets ({unifiedTargets.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('reminder')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                filterType === 'reminder'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>🔔</span>
              <span>Reminders & OAs ({reminderTargets.length})</span>
              {todayReminders.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white animate-pulse">
                  {todayReminders.length} Today!
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setFilterType('goal')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                filterType === 'goal'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>🎯</span>
              <span>Milestone Goals ({goalTargets.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType('habit')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                filterType === 'habit'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>⏱️</span>
              <span>Habit Deadlines ({habitTargets.length})</span>
            </button>
          </div>

          {/* Row 2: Status Tabs, Category Pills & Laptop Search Bar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  filterStatus === 'all'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                All Status
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('in_progress')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  filterStatus === 'in_progress'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                ⏳ Active ({activeTargets.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('urgent')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  filterStatus === 'urgent'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                🚨 Urgent ({urgentTargets.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('completed')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  filterStatus === 'completed'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                ✓ Completed ({completedTargets.length})
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                {allCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                      filterCategory === cat
                        ? 'bg-indigo-600 text-white shadow-sm font-bold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Laptop Search Bar */}
              <div className="relative w-56 lg:w-64">
                <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 text-xs">🔍</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search targets..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/90 pl-8 pr-8 py-1.5 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-2.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* LAPTOP VIEW: Strict Time-Remaining Order Banner (Kept for Laptop, Hidden on Mobile) */}
        <div className="hidden sm:flex px-4 py-2.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 items-center justify-between text-xs text-indigo-900 dark:text-indigo-300">
          <div className="flex items-center gap-2">
            <span>⏱️</span>
            <span className="font-semibold">
              Strict Time-Remaining Order:
            </span>
            <span className="text-indigo-700/80 dark:text-indigo-300/80">
              Tasks with less time left automatically rise to the top.
            </span>
          </div>
          <span className="font-bold text-[11px] bg-indigo-100 dark:bg-indigo-900/60 px-2 py-0.5 rounded-md">
            Auto-prioritized
          </span>
        </div>

        {/* MOBILE VIEW: Filter Controls (No strict time text, Full-width search bar, Reminders-focused) */}
        <div className="sm:hidden flex flex-col gap-3 bg-white dark:bg-slate-900/90 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          {/* Status Tabs */}
          <div className="flex items-center overflow-x-auto gap-1.5 pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                filterStatus === 'all'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              All Reminders ({reminderTargets.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('in_progress')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                filterStatus === 'in_progress'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              ⏳ Pending ({reminderTargets.filter((r) => !r.completed).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('urgent')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                filterStatus === 'urgent'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              🚨 Urgent ({reminderTargets.filter((r) => !r.completed && r.daysLeft <= 7).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('completed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                filterStatus === 'completed'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              ✓ Attended ({reminderTargets.filter((r) => r.completed).length})
            </button>
          </div>

          {/* Category Filter Pills (Horizontal Scroll) */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
            {allCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                  filterCategory === cat
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Full-Width Search Bar for Mobile */}
          <div className="relative w-full">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 text-xs">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reminders, OA, exams, meetings..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/90 pl-8 pr-8 py-2.5 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-2.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* LAPTOP VIEW: All Targets Grid */}
        <div className="hidden sm:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedFilteredTargets.map(renderTargetCard)}

          {sortedFilteredTargets.length === 0 && (
            <div className="col-span-full rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center text-slate-500 dark:text-slate-400">
              <span className="text-4xl block mb-3">🎯</span>
              <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">No targets found</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Add specific goals (e.g. Master 100 DSA Problems), reminders (e.g. Online Assessment OA, Exam), or deadline habits (e.g. EMI payment next month, 10-day challenge).
              </p>
              <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowNewReminderModal(true)}
                  className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-600/20 hover:bg-amber-700"
                >
                  + Add Reminder / OA
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewGoalModal(true)}
                  className="px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold shadow-md shadow-violet-600/20 hover:bg-violet-700"
                >
                  + New Specific Goal
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewActivityModal(true)}
                  className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold shadow-md shadow-sky-600/20 hover:bg-sky-700"
                >
                  + New EMI / 10-Day Habit
                </button>
              </div>
            </div>
          )}
        </div>

        {/* MOBILE VIEW: Purely Reminders Grid */}
        <div className="sm:hidden flex flex-col gap-3.5">
          {mobileReminders.map(renderTargetCard)}

          {mobileReminders.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900/60">
              <span className="text-3xl block mb-2">🔔</span>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No reminders found</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Add exam dates, online assessments (OA), deadlines, or meetings to keep them right here.
              </p>
              <button
                type="button"
                onClick={() => setShowNewReminderModal(true)}
                className="mt-3.5 px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-600/20 hover:bg-amber-700"
              >
                + Add Reminder / OA
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      {showNewReminderModal && (
        <NewReminderModal
          onClose={() => setShowNewReminderModal(false)}
          onSave={createGoal}
        />
      )}

      {showNewGoalModal && (
        <NewGoalModal
          onClose={() => setShowNewGoalModal(false)}
          onSave={createGoal}
        />
      )}

      {selectedGoal && (
        <GoalDetailModal
          goal={selectedGoal}
          onClose={() => setSelectedGoal(null)}
          onUpdate={updateGoal}
          onDelete={deleteGoal}
        />
      )}

      {showNewActivityModal && (
        <NewActivityModal
          onClose={() => setShowNewActivityModal(false)}
          onSave={createActivity}
        />
      )}
    </div>
  );
}
