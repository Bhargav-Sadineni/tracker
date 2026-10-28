import { useEffect, useMemo, useState } from 'react';
import {
  api,
  ymd,
  addDays,
  isDone,
  unit,
  timeToMinutes,
  formatTime12h,
  minutesToTime,
  calculateSleepDuration,
  formatDuration,
  parseDurationInput,
  formatGoalText,
  formatDaysLeft,
  getDaysLeft,
  getChallengeInfo,
} from '../lib/api';
import NewActivityModal from '../components/NewActivityModal';
import GlobalInsightsModal from '../components/GlobalInsightsModal';
import ThemeToggle from '../components/ThemeToggle';
import MobileHabitCard from '../components/MobileHabitCard';
import { triggerConfetti } from '../lib/confetti';

export default function Dashboard({ onSelectActivity, onNavigate }) {
  const [activities, setActivities] = useState([]);
  const [entries, setEntries] = useState({}); // key: `${activityId}|${date}` -> { value, timeStr, sleepTime, wakeTime }
  const [goals, setGoals] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [open, setOpen] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [dayRange, setDayRange] = useState(14);
  const [filterCategory, setFilterCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('auto'); // 'auto', 'cards', 'table'

  const days = useMemo(
    () => Array.from({ length: dayRange }, (_, i) => ymd(addDays(i - dayRange + 1))),
    [dayRange]
  );
  const today = days[days.length - 1];

  const load = async () => {
    try {
      setLoading(true);
      const [acts, ents, gls, exps] = await Promise.all([
        api('/activities'),
        api(`/entries?from=${days[0]}&to=${today}`),
        api('/goals').catch(() => []),
        api('/expenses').catch(() => []),
      ]);
      setActivities(acts);
      setGoals(gls || []);
      setExpenses(exps || []);
      setEntries(
        Object.fromEntries(
          ents.map((e) => [
            `${e.activity}|${e.date}`,
            {
              value: e.value || 0,
              timeStr: e.timeStr || '',
              sleepTime: e.sleepTime || '',
              wakeTime: e.wakeTime || '',
            },
          ])
        )
      );
      setError('');
    } catch {
      setError('Cannot connect to the server. Please check the backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [days]);

  const applies = (a, d) => {
    if (a.frequency === 'daily') return true;
    if (a.frequency === 'challenge') {
      if (!a.startDate) return true;
      return d >= a.startDate && (!a.date || d <= a.date);
    }
    if (a.frequency === 'specific') {
      return a.date === d || (d === today && !a.completed);
    }
    return true;
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

  const setValue = async (a, d, value, timeStr, sleepTime, wakeTime) => {
    const prev = entries[`${a._id}|${d}`] || {};
    const effectiveSleep = sleepTime !== undefined ? sleepTime : (prev.sleepTime || '');
    const effectiveWake = wakeTime !== undefined ? wakeTime : (prev.wakeTime || '');
    let effectiveVal = value;

    if (a.measure === 'sleep_wake') {
      if (effectiveSleep && effectiveWake) {
        const dur = calculateSleepDuration(effectiveSleep, effectiveWake);
        effectiveVal = dur ? dur.hours : 0;
      } else {
        effectiveVal = 0;
      }
    } else if (effectiveVal === undefined) {
      effectiveVal = timeStr ? timeToMinutes(timeStr) : 0;
    }

    const wasDone = isDone(a, prev.value, prev.timeStr, prev.sleepTime, prev.wakeTime);
    const nowDone = isDone(a, effectiveVal, timeStr, effectiveSleep, effectiveWake);

    const newObj = {
      value: effectiveVal,
      timeStr: timeStr !== undefined ? timeStr : (prev.timeStr || ''),
      sleepTime: effectiveSleep,
      wakeTime: effectiveWake,
    };

    setEntries((p) => ({ ...p, [`${a._id}|${d}`]: newObj }));

    if (!wasDone && nowDone) {
      triggerConfetti();
    }

    try {
      await api('/entries', 'PUT', {
        activity: a._id,
        date: d,
        value: newObj.value,
        timeStr: newObj.timeStr,
        sleepTime: newObj.sleepTime,
        wakeTime: newObj.wakeTime,
      });
    } catch (err) {
      console.error('Failed to save entry', err);
    }
  };

  const create = async (data) => {
    const a = await api('/activities', 'POST', data);
    setActivities((p) => [...p, a]);
    setOpen(false);
  };


  // Unified Targets: combines specific milestone Goals AND deadline/challenge Habits (e.g. EMI, 10-day challenge)
  const unifiedTargets = useMemo(() => {
    const list = [];

    // 1. Specific Milestone Goals & Reminders
    goals.forEach((g) => {
      const days = getDaysLeft(g.targetDate);
      const isReminder = g.kind === 'reminder';
      list.push({
        id: g._id,
        key: `goal_${g._id}`,
        isActivity: false,
        itemType: isReminder ? 'reminder' : 'goal',
        typeBadge: isReminder ? '🔔 Reminder' : '🎯 Specific Goal',
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
        targetValue: isReminder ? 1 : (g.targetValue || 1),
        unit: isReminder ? 'reminder' : (g.unit || ''),
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

  const activeTargets = unifiedTargets.filter((t) => !t.completed);
  const completedTargets = unifiedTargets.filter((t) => t.completed);

  // Closest upcoming deadline across all goals and deadline habits
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



  const [filterType, setFilterType] = useState('all'); // 'all' | 'positive' | 'negative'

  const filteredActivities = useMemo(() => {
    return activities.filter((a) => {
      const isPos = a.habitType !== 'negative';
      const matchType =
        filterType === 'all' ||
        (filterType === 'positive' && isPos) ||
        (filterType === 'negative' && !isPos);

      const matchCat = filterCategory === 'All' || a.category === filterCategory;
      const matchSearch =
        !searchQuery.trim() ||
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.description && a.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchType && matchCat && matchSearch;
    });
  }, [activities, filterType, filterCategory, searchQuery]);

  const todaysActivities = activities.filter((a) => applies(a, today));
  const doneTodayCount = todaysActivities.filter((a) => {
    const ent = entries[`${a._id}|${today}`] || {};
    return isDone(a, ent.value, ent.timeStr, ent.sleepTime, ent.wakeTime);
  }).length;
  const todayCompletionRate = todaysActivities.length
    ? Math.round((doneTodayCount / todaysActivities.length) * 100)
    : 0;

  const totalCheckinsInWindow = Object.values(entries).filter(
    (e) => (e.value && e.value > 0) || (e.timeStr && e.timeStr.length > 0) || (e.sleepTime && e.sleepTime.length > 0)
  ).length;

  const allCategories = ['All', ...new Set(activities.map((a) => a.category || 'General'))];

  // Current month expenditure for home page
  const currentMonthStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const monthExpenseStats = useMemo(() => {
    let spendings = 0;
    let income = 0;
    let spendCount = 0;
    expenses.forEach((e) => {
      if (e.date && e.date.startsWith(currentMonthStr)) {
        const amt = Number(e.amount) || 0;
        if (e.type === 'income') {
          income += amt;
        } else {
          spendings += amt;
          spendCount++;
        }
      }
    });
    const net = income - spendings;
    return { spendings, income, spendCount, net };
  }, [expenses, currentMonthStr]);

  // Total spend mapped by day string YYYY-MM-DD
  const daySpendMap = useMemo(() => {
    const map = {};
    expenses.forEach((e) => {
      if (e.date && e.type !== 'income') {
        map[e.date] = (map[e.date] || 0) + (Number(e.amount) || 0);
      }
    });
    return map;
  }, [expenses]);

  const topStreak = useMemo(() => {
    let max = 0;
    let topName = '';
    activities.forEach((a) => {
      if (a.frequency !== 'daily') return;
      let streak = 0;
      for (
        let i = isDone(a, entries[`${a._id}|${today}`]?.value, entries[`${a._id}|${today}`]?.timeStr, entries[`${a._id}|${today}`]?.sleepTime, entries[`${a._id}|${today}`]?.wakeTime) ? 0 : -1;
        isDone(a, entries[`${a._id}|${ymd(addDays(i))}`]?.value, entries[`${a._id}|${ymd(addDays(i))}`]?.timeStr, entries[`${a._id}|${ymd(addDays(i))}`]?.sleepTime, entries[`${a._id}|${ymd(addDays(i))}`]?.wakeTime);
        i--
      ) {
        streak++;
      }
      if (streak > max) {
        max = streak;
        topName = a.name;
      }
    });
    return { count: max, name: topName };
  }, [activities, entries, today]);

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md px-3.5 sm:px-8 py-3 transition-colors">
        <div className="w-full max-w-[1700px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Brand & Navigation Tabs */}
          <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-4 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div>
                <span className="font-black text-2xl sm:text-3xl font-display tracking-tight text-slate-900 dark:text-white">
                  Tracker
                </span>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                  {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Page Navigation Tabs (Desktop only - Mobile uses bottom dock) */}
            <nav className="hidden sm:flex items-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-800/80 p-1 text-xs font-bold shadow-inner">
              <button
                type="button"
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm transition flex items-center gap-1.5 font-extrabold"
              >
                <span>📊</span>
                <span>Habits Matrix</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('targets')}
                className="px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition flex items-center gap-1.5 cursor-pointer"
                title="Switch to Targets & Deadlines"
              >
                <span>🎯</span>
                <span>Targets & Deadlines</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-violet-600 text-white font-extrabold">
                  {activeTargets.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('expenditure')}
                className="px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition flex items-center gap-1.5 cursor-pointer"
                title="Switch to Monthly Expenditure"
              >
                <span>💳</span>
                <span>Monthly Expenditure</span>
              </button>
            </nav>

            {/* Mobile-only Header Action: Prominent, larger New Habit button */}
            <div className="sm:hidden flex items-center gap-2">
              <ThemeToggle />
              <button
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-xs font-black text-white shadow-md shadow-indigo-600/30 active:scale-95 transition min-h-[40px]"
                title="Create New Habit"
              >
                <span className="text-base font-black leading-none">+</span>
                <span>New Habit</span>
              </button>
            </div>
          </div>

          {/* Desktop/Tablet Header Actions */}
          <div className="hidden sm:flex items-center flex-wrap gap-2.5">
            {/* Day range toggle */}
            <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/60 p-1 text-xs font-semibold">
              {[
                { label: '7D', value: 7 },
                { label: '14D', value: 14 },
                { label: '21D', value: 21 },
              ].map((r) => (
                <button
                  key={r.value}
                  onClick={() => setDayRange(r.value)}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    dayRange === r.value
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* Analytics button */}
            <button
              onClick={() => setShowInsights(true)}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm backdrop-blur hover:border-slate-300 dark:hover:border-slate-700 transition"
              title="View system-wide analytics"
            >
              <span>📊</span>
              <span>Analytics</span>
            </button>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* New Habit button */}
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/25 hover:from-indigo-500 hover:to-violet-500 active:scale-95 transition"
            >
              <span className="text-base font-bold leading-none">+</span>
              <span>New Habit</span>
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

        {/* 4 Enhanced Goal & Specific Target Overview Cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* 1. Daily Habit Goals */}
          <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Daily Habit Goals
              </span>
              <span className="text-sm sm:text-base">📅</span>
            </div>
            <div className="mt-2 sm:mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black font-display text-slate-900 dark:text-white">
                {doneTodayCount}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                of {todaysActivities.length} done
              </span>
            </div>
            <div className="mt-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 sm:h-2 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
                style={{ width: `${todayCompletionRate}%` }}
              />
            </div>
            <div className="mt-1.5 text-[10px] sm:text-xs font-medium text-indigo-600 dark:text-indigo-400 truncate">
              {todayCompletionRate === 100 && todaysActivities.length > 0 ? '✨ All daily habits done!' : `${todayCompletionRate}% of daily routines`}
            </div>
          </div>

          {/* 2. Specific Target Goals (Clickable -> Targets Page) */}
          <div
            onClick={() => onNavigate && onNavigate('targets')}
            className="group cursor-pointer rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-4 sm:p-5 shadow-sm hover:border-violet-400 dark:hover:border-violet-600 hover:shadow-md transition"
            title="Open Targets & Deadlines Page"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition flex items-center gap-1">
                Target Deadlines →
              </span>
              <span className="text-sm sm:text-base">🎯</span>
            </div>
            <div className="mt-2 sm:mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black font-display text-violet-600 dark:text-violet-400">
                {activeTargets.length}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">active targets</span>
            </div>
            <div className="mt-2.5 truncate text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">
              {completedTargets.length} completed · click to manage targets
            </div>
          </div>

          {/* 3. Nearest Goal/Habit Deadline (Clickable -> Targets Page) */}
          <div
            onClick={() => onNavigate && onNavigate('targets')}
            className="group cursor-pointer rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-4 sm:p-5 shadow-sm hover:border-violet-400 dark:hover:border-violet-600 hover:shadow-md transition"
            title="Open Targets & Deadlines Page"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition flex items-center gap-1">
                Nearest Deadline →
              </span>
              <span className="text-sm sm:text-base">⏳</span>
            </div>
            <div className="mt-2 sm:mt-3 flex items-baseline gap-1.5 truncate">
              <span className={`text-xl sm:text-2xl font-black font-display truncate ${
                closestDaysLeft !== null && closestDaysLeft <= 3
                  ? 'text-rose-600 dark:text-rose-400 animate-pulse'
                  : 'text-slate-900 dark:text-white'
              }`}>
                {closestDaysInfo ? closestDaysInfo.text : 'All Clear'}
              </span>
            </div>
            <div className="mt-2.5 truncate text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
              {closestTarget ? `${closestTarget.title} · ${closestTarget.targetDate}` : 'No upcoming deadlines'}
            </div>
          </div>

          {/* 4. Monthly Expenditure (Clickable -> Expenditure Page) */}
          <div
            onClick={() => onNavigate && onNavigate('expenditure')}
            className="group cursor-pointer rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-4 sm:p-5 shadow-sm hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-md transition"
            title="Open Monthly Expenditure Page"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition flex items-center gap-1">
                Expenditure →
              </span>
              <span className="text-sm sm:text-base">💳</span>
            </div>
            <div className="mt-2 sm:mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black font-display text-rose-600 dark:text-rose-400">
                ₹{monthExpenseStats.spendings.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">spent this month</span>
            </div>
            <div className="mt-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 sm:h-2 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                style={{
                  width: monthExpenseStats.income > 0
                    ? `${Math.min(100, Math.round((monthExpenseStats.spendings / monthExpenseStats.income) * 100))}%`
                    : '100%',
                }}
              />
            </div>
            <div className="mt-1.5 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
              {monthExpenseStats.spendCount} expenses recorded · click to view
            </div>
          </div>
        </section>


        {/* Filter and View Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {/* Habit Type Filter */}
            <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/90 p-0.5 mr-1.5 shrink-0">
              <button
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  filterType === 'all'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('positive')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  filterType === 'positive'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                }`}
              >
                <span>🟢</span>
                <span>Positive (+)</span>
              </button>
              <button
                onClick={() => setFilterType('negative')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  filterType === 'negative'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                }`}
              >
                <span>🔴</span>
                <span>Limits (−)</span>
              </button>
            </div>

            {/* Category Chips */}
            {allCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  filterCategory === cat
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-60">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 text-xs">🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
          </div>
        </div>

        {/* Mobile 3-Day Spend Summary Strip */}
        <div className="sm:hidden flex items-center justify-between px-4 py-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-sm text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
            <span>💳</span>
            <span>Total Spend:</span>
          </div>
          <div className="flex items-center gap-2.5 font-black">
            {days.slice(-3).map((d, idx) => {
              const isToday = d === today;
              const dateObj = new Date(d + 'T00:00');
              const name = isToday ? 'Today' : idx === 1 ? 'Yest' : dateObj.toLocaleDateString('en-US', { weekday: 'short' });
              const spend = daySpendMap[d] || 0;
              return (
                <div key={d} className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{name}:</span>
                  <span className={`text-xs ${spend > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}`}>
                    ₹{spend.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile Cards View (Optimized for iPhone 17: Habit Name + Last 3 Days) */}
        <div className="sm:hidden space-y-3 block">
          {filteredActivities.map((a) => (
            <MobileHabitCard
              key={a._id}
              activity={a}
              days={days}
              entries={entries}
              today={today}
              onSetValue={setValue}
              onSelect={onSelectActivity}
            />
          ))}

          {filteredActivities.length === 0 && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-slate-500">
              <div className="text-3xl mb-2">🌱</div>
              <p className="text-xs font-semibold">No habits found</p>
              <button
                onClick={() => setOpen(true)}
                className="mt-3 px-4 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold"
              >
                + Add Habit
              </button>
            </div>
          )}
        </div>

        {/* Desktop/Tablet Matrix Table */}
        <section className="hidden sm:block rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900/90 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="sticky left-0 z-20 bg-slate-50 dark:bg-slate-900 px-6 py-4 font-bold min-w-[240px] shadow-[1px_0_0_0_rgba(0,0,0,0.05)] dark:shadow-[1px_0_0_0_rgba(255,255,255,0.05)]">
                    Habit Details
                  </th>
                  {days.map((d) => {
                    const isCurrentDay = d === today;
                    const dateObj = new Date(d + 'T00:00');
                    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                    const dateFmt = `${d.slice(8)}/${d.slice(5, 7)}`;

                    return (
                      <th
                        key={d}
                        className={`px-3 py-3.5 text-center font-semibold transition-colors ${
                          isCurrentDay
                            ? 'bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-x border-indigo-200/60 dark:border-indigo-800/40'
                            : ''
                        }`}
                      >
                        <div className="text-[11px] font-bold">{dayName}</div>
                        <div className="text-[10px] opacity-80 mt-0.5">{dateFmt}</div>
                        {isCurrentDay && (
                          <span className="inline-block mt-0.5 px-1.5 py-0.2 text-[9px] font-extrabold rounded-full bg-indigo-600 text-white uppercase">
                            Today
                          </span>
                        )}
                        {/* Daily Total Spend Badge */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onNavigate) onNavigate('expenditure');
                          }}
                          title={`Total Spend on ${d}: ₹${(daySpendMap[d] || 0).toLocaleString()} (Click to open expenditure)`}
                          className={`mt-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-extrabold cursor-pointer transition active:scale-95 ${
                            (daySpendMap[d] || 0) > 0
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                              : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                          }`}
                        >
                          <span>₹{(daySpendMap[d] || 0).toLocaleString()}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredActivities.map((a) => {
                  const habitColor = a.color || '#6366f1';

                  return (
                    <tr
                      key={a._id}
                      className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/90 px-6 py-4 min-w-[240px] shadow-[1px_0_0_0_rgba(0,0,0,0.05)] dark:shadow-[1px_0_0_0_rgba(255,255,255,0.05)]">
                        <div className="flex items-start gap-3">
                          <span
                            className="mt-1.5 h-3 w-3 shrink-0 rounded-full shadow-sm"
                            style={{ backgroundColor: habitColor }}
                          />
                          <div className="min-w-0 flex-1">
                            <button
                              onClick={() => onSelectActivity(a)}
                              className="text-left font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate block max-w-[200px]"
                              title="Click to view analytics"
                            >
                              {a.name}
                            </button>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                              <span
                                className={`rounded-md px-1.5 py-0.5 font-bold text-[10px] ${
                                  a.habitType === 'negative'
                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                                }`}
                              >
                                {a.habitType === 'negative' ? '− Limit' : '+ Routine'}
                              </span>
                              {a.frequency === 'challenge' && (
                                <span className="rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 px-1.5 py-0.5 font-bold text-[10px]">
                                  ⏱️ {a.challengeDays || 10}d Challenge
                                </span>
                              )}
                              {a.frequency === 'specific' && (
                                <span className="rounded-md bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 px-1.5 py-0.5 font-bold text-[10px]">
                                  {a.completed ? '✓ Completed' : `📅 Due ${a.date}`}
                                </span>
                              )}
                              <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-medium">
                                {a.category || 'General'}
                              </span>
                              <span>·</span>
                              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                                {formatGoalText(a)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {days.map((d) => {
                        const isCurrentDay = d === today;
                        const ent = entries[`${a._id}|${d}`] || {};
                        const v = ent.value || 0;
                        const tStr = ent.timeStr || (a.measure === 'time_of_day' && v > 0 ? minutesToTime(v) : '');
                        const sTime = ent.sleepTime || '';
                        const wTime = ent.wakeTime || '';
                        const valid = applies(a, d);
                        const done = isDone(a, v, tStr, sTime, wTime);

                        if (!valid) {
                          return (
                            <td
                              key={d}
                              className={`px-2 py-3 text-center text-slate-300 dark:text-slate-700 ${
                                isCurrentDay ? 'bg-indigo-50/30 dark:bg-indigo-950/20 border-x border-indigo-200/40' : ''
                              }`}
                            >
                              –
                            </td>
                          );
                        }

                        return (
                          <td
                            key={d}
                            className={`px-2 py-3 text-center ${
                              isCurrentDay ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-x border-indigo-200/40 dark:border-indigo-800/30' : ''
                            }`}
                          >
                            {a.measure === 'checkbox' && (
                              <button
                                aria-label={`${a.name} on ${d}`}
                                aria-pressed={done}
                                onClick={() => setValue(a, d, done ? 0 : 1)}
                                style={done ? { backgroundColor: habitColor } : {}}
                                className={`mx-auto h-8 w-8 rounded-xl border flex items-center justify-center font-bold text-xs transition-all active:scale-85 ${
                                  done
                                    ? 'text-white shadow-md animate-pop border-transparent'
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-slate-400 text-transparent'
                                }`}
                              >
                                ✓
                              </button>
                            )}

                            {a.measure === 'sleep_wake' && (
                              <div className="flex flex-col items-center gap-1 min-w-[84px] py-1">
                                <div className="flex items-center gap-1" title="Bedtime">
                                  <span className="text-[10px]">🌙</span>
                                  <input
                                    type="time"
                                    value={sTime}
                                    onChange={(e) => setValue(a, d, undefined, undefined, e.target.value, wTime)}
                                    className="h-6 w-16 px-1 rounded-md border text-[10px] text-center font-bold bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  />
                                </div>
                                <div className="flex items-center gap-1" title="Wake Up Time">
                                  <span className="text-[10px]">☀️</span>
                                  <input
                                    type="time"
                                    value={wTime}
                                    onChange={(e) => setValue(a, d, undefined, undefined, sTime, e.target.value)}
                                    className="h-6 w-16 px-1 rounded-md border text-[10px] text-center font-bold bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  />
                                </div>
                                {v > 0 && (
                                  <span
                                    className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${
                                      done
                                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                                        : 'text-slate-500 dark:text-slate-400'
                                    }`}
                                  >
                                    {v} hrs {done ? '✓' : ''}
                                  </span>
                                )}
                              </div>
                            )}

                            {a.measure === 'time_of_day' && (
                              <div className="flex flex-col items-center">
                                <input
                                  type="time"
                                  value={tStr}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setValue(a, d, val ? timeToMinutes(val) : 0, val);
                                  }}
                                  style={done ? { borderColor: habitColor } : {}}
                                  className={`mx-auto h-7 px-1 rounded-lg border text-center text-[11px] font-bold transition focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                                    done
                                      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                  }`}
                                />
                                {tStr && (
                                  <span className="text-[9px] font-bold mt-0.5 opacity-80" style={{ color: habitColor }}>
                                    {formatTime12h(tStr)}
                                  </span>
                                )}
                              </div>
                            )}

                            {a.measure === 'time' && (
                              <div className="flex flex-col items-center">
                                <input
                                  type="text"
                                  defaultValue={v ? formatDuration(v) : ''}
                                  key={`${a._id}-${d}-${v}`}
                                  placeholder="0m"
                                  title={`Logged: ${formatDuration(v)} (${v}m). Goal: ${formatGoalText(a)}`}
                                  onBlur={(e) => {
                                    const mins = parseDurationInput(e.target.value);
                                    if (mins !== v) setValue(a, d, mins);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') e.target.blur();
                                  }}
                                  style={done ? { borderColor: habitColor } : (v > 0 && a.goalOperator === 'lte' ? { borderColor: '#f43f5e' } : {})}
                                  className={`mx-auto h-8 w-16 px-1 rounded-xl border text-center text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                    done
                                      ? 'bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-extrabold'
                                      : v > 0 && a.goalOperator === 'lte'
                                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400'
                                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200'
                                  }`}
                                />
                                {v > 0 && (
                                  <span className={`text-[9px] font-extrabold mt-0.5 ${done ? 'text-indigo-600 dark:text-indigo-400' : a.goalOperator === 'lte' ? 'text-rose-500' : 'text-amber-500'}`}>
                                    {done ? '✓ Met' : a.goalOperator === 'lte' ? '✕ Over' : `${v}m/${a.goal || 30}m`}
                                  </span>
                                )}
                              </div>
                            )}

                            {a.measure === 'count' && (
                              <div className="flex flex-col items-center">
                                <input
                                  type="number"
                                  min="0"
                                  defaultValue={v || ''}
                                  key={`${a._id}-${d}-${v}`}
                                  placeholder="0"
                                  title={`Logged: ${v}. Goal: ${formatGoalText(a)}`}
                                  onBlur={(e) => {
                                    const n = Number(e.target.value) || 0;
                                    if (n !== v) setValue(a, d, n);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') e.target.blur();
                                  }}
                                  style={done ? { borderColor: habitColor } : (v > 0 && a.goalOperator === 'lte' ? { borderColor: '#f43f5e' } : {})}
                                  className={`mx-auto h-8 w-14 rounded-xl border text-center text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                    done
                                      ? 'bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-extrabold'
                                      : v > 0 && a.goalOperator === 'lte'
                                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400'
                                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200'
                                  }`}
                                />
                                {v > 0 && (
                                  <span className={`text-[9px] font-extrabold mt-0.5 ${done ? 'text-indigo-600 dark:text-indigo-400' : a.goalOperator === 'lte' ? 'text-rose-500' : 'text-slate-400'}`}>
                                    {done ? '✓ Met' : a.goalOperator === 'lte' ? '✕ Over' : `${v}/${a.goal}`}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {filteredActivities.length === 0 && (
                  <tr>
                    <td colSpan={days.length + 1} className="px-6 py-14 text-center text-slate-500 dark:text-slate-400">
                      <div className="max-w-md mx-auto space-y-2">
                        <div className="text-3xl">🌱</div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          No habits found
                        </h4>
                        <button
                          onClick={() => setOpen(true)}
                          className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-700 transition"
                        >
                          + Create Habit
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>

              {/* Bottom Row: Total Daily Spend on Each Day */}
              <tfoot>
                <tr className="border-t-2 border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 text-xs font-black">
                  <td
                    onClick={() => onNavigate && onNavigate('expenditure')}
                    className="sticky left-0 z-20 bg-slate-50 dark:bg-slate-900 px-6 py-3.5 text-slate-800 dark:text-slate-200 cursor-pointer hover:text-indigo-600 transition flex items-center gap-1.5 shadow-[1px_0_0_0_rgba(0,0,0,0.05)] dark:shadow-[1px_0_0_0_rgba(255,255,255,0.05)]"
                  >
                    <span>💳</span>
                    <span>Total Daily Spend →</span>
                  </td>
                  {days.map((d) => {
                    const spend = daySpendMap[d] || 0;
                    const isCurrentDay = d === today;
                    return (
                      <td
                        key={`spend-foot-${d}`}
                        onClick={() => onNavigate && onNavigate('expenditure')}
                        title={`Total Spend on ${d}: ₹${spend.toLocaleString()}`}
                        className={`px-3 py-3.5 text-center cursor-pointer transition hover:bg-slate-100 dark:hover:bg-slate-800 ${
                          isCurrentDay
                            ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-x border-indigo-200/60 dark:border-indigo-800/40'
                            : ''
                        }`}
                      >
                        <span
                          className={`text-xs font-black ${
                            spend > 0 ? 'text-rose-600 dark:text-rose-400 font-extrabold' : 'text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          ₹{spend.toLocaleString()}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      </main>

      {/* Mobile Floating Action Button: Quick, large + New Habit button */}
      <div className="sm:hidden fixed bottom-20 right-4 z-30">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 text-white font-black text-xs shadow-xl shadow-indigo-600/40 active:scale-90 transition cursor-pointer border border-white/20"
          title="Create New Habit"
        >
          <span className="text-lg leading-none font-black">+</span>
          <span>New Habit</span>
        </button>
      </div>

      {/* Modals */}
      {open && (
        <NewActivityModal
          activities={activities}
          onClose={() => setOpen(false)}
          onSave={create}
        />
      )}

      {showInsights && (
        <GlobalInsightsModal
          activities={activities}
          entries={entries}
          onClose={() => setShowInsights(false)}
        />
      )}
    </div>
  );
}
