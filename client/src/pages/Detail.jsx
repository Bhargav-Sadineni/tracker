import { useEffect, useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  LabelList,
  Line,
  Legend,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import {
  api,
  ymd,
  addDays,
  isDone,
  unit,
  minutesToTime,
  formatTime12h,
  calculateSleepDuration,
  formatGoalText,
  formatDuration,
  getDaysLeft,
  getChallengeInfo,
} from '../lib/api';
import ThemeToggle from '../components/ThemeToggle';
import EditActivityModal from '../components/EditActivityModal';

export default function Detail({ activity: initialActivity, onBack, onDelete }) {
  const [a, setA] = useState(initialActivity);
  const [allActivities, setAllActivities] = useState([]);
  const [entries, setEntries] = useState([]);
  const [partnerEntries, setPartnerEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [timeframe, setTimeframe] = useState(30);
  const [heatmapMode, setHeatmapMode] = useState('since_created'); // 'since_created' or 'full_year'
  const [barTimeframe, setBarTimeframe] = useState(14); // 7, 14, or 30 days

  const habitColor = a.color || '#6366f1';
  const todayStr = ymd(new Date());
  const isMeasurable = Boolean(a.measure && a.measure !== 'checkbox');

  // Date when this habit was created or earliest recorded entry
  const createdDateStr = useMemo(() => {
    let earliest = a.createdAt ? ymd(new Date(a.createdAt)) : todayStr;
    if (a.startDate) {
      const s = ymd(new Date(a.startDate));
      if (s && s < earliest) earliest = s;
    }
    if (entries && entries.length > 0) {
      entries.forEach((e) => {
        if (e.date && e.date < earliest) {
          earliest = e.date;
        }
      });
    }
    return earliest;
  }, [a.createdAt, a.startDate, entries, todayStr]);

  // Load activities and entries
  useEffect(() => {
    setLoading(true);
    Promise.all([
      api('/activities'),
      api(`/entries?activity=${a._id}`),
    ])
      .then(([acts, ents]) => {
        setAllActivities(acts);
        setEntries(ents);

        // Find partner activity for Sleep / Wake correlation
        const lowerName = a.name.toLowerCase();
        let partner = null;
        if (a.linkedActivity) {
          partner = acts.find((x) => x._id === a.linkedActivity);
        } else if (lowerName.includes('sleep') || lowerName.includes('bedtime')) {
          partner = acts.find((x) => x._id !== a._id && (x.name.toLowerCase().includes('wake') || x.name.toLowerCase().includes('alarm')));
        } else if (lowerName.includes('wake') || lowerName.includes('alarm')) {
          partner = acts.find((x) => x._id !== a._id && (x.name.toLowerCase().includes('sleep') || x.name.toLowerCase().includes('bedtime')));
        }

        if (partner) {
          api(`/entries?activity=${partner._id}`).then(setPartnerEntries);
        }
      })
      .finally(() => setLoading(false));
  }, [a._id, a.linkedActivity, a.name]);

  const map = useMemo(
    () =>
      Object.fromEntries(
        entries.map((e) => [
          e.date,
          {
            value: e.value || 0,
            timeStr: e.timeStr || (a.measure === 'time_of_day' && e.value ? minutesToTime(e.value) : ''),
            sleepTime: e.sleepTime || '',
            wakeTime: e.wakeTime || '',
          },
        ])
      ),
    [entries, a.measure]
  );

  // Partner map
  const partnerMap = useMemo(
    () =>
      Object.fromEntries(
        partnerEntries.map((e) => [
          e.date,
          {
            value: e.value || 0,
            timeStr: e.timeStr || (e.value ? minutesToTime(e.value) : ''),
            sleepTime: e.sleepTime || '',
            wakeTime: e.wakeTime || '',
          },
        ])
      ),
    [partnerEntries]
  );

  // Identify Sleep Pair (Sleep Time & Wake Up Time)
  const isSleepOrWake = useMemo(() => {
    const n = a.name.toLowerCase();
    return a.measure === 'sleep_wake' || n.includes('sleep') || n.includes('wake') || n.includes('bedtime') || a.measure === 'time_of_day';
  }, [a.name, a.measure]);

  const partnerHabit = useMemo(() => {
    if (a.measure === 'sleep_wake') return null; // Self-contained unified habit
    const lowerName = a.name.toLowerCase();
    if (a.linkedActivity) return allActivities.find((x) => x._id === a.linkedActivity);
    if (lowerName.includes('sleep') || lowerName.includes('bedtime')) {
      return allActivities.find((x) => x._id !== a._id && (x.name.toLowerCase().includes('wake') || x.name.toLowerCase().includes('alarm')));
    }
    if (lowerName.includes('wake') || lowerName.includes('alarm')) {
      return allActivities.find((x) => x._id !== a._id && (x.name.toLowerCase().includes('sleep') || x.name.toLowerCase().includes('bedtime')));
    }
    return null;
  }, [a, allActivities]);

  const daily = a.frequency === 'daily';
  const unitStr = unit(a);

  // Span & Completion Rate strictly since creation
  const daysSinceCreation = Math.max(
    1,
    Math.round((new Date(todayStr) - new Date(createdDateStr)) / 864e5) + 1
  );

  // Streaks calculation starting from creation date
  let current = 0,
    best = 0,
    run = 0;
  for (let d = new Date(createdDateStr + 'T00:00'); ymd(d) <= todayStr; d = addDays(1, d)) {
    const ent = map[ymd(d)] || {};
    if (isDone(a, ent.value, ent.timeStr, ent.sleepTime, ent.wakeTime)) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }
  for (
    let i = isDone(a, map[todayStr]?.value, map[todayStr]?.timeStr, map[todayStr]?.sleepTime, map[todayStr]?.wakeTime) ? 0 : -1;
    ymd(addDays(i)) >= createdDateStr && isDone(a, map[ymd(addDays(i))]?.value, map[ymd(addDays(i))]?.timeStr, map[ymd(addDays(i))]?.sleepTime, map[ymd(addDays(i))]?.wakeTime);
    i--
  ) {
    current++;
  }

  const doneDays = entries.filter((e) => isDone(a, e.value, e.timeStr, e.sleepTime, e.wakeTime)).length;
  const loggedDays = entries.filter(
    (e) => (e.value && e.value > 0) || (e.timeStr && e.timeStr.length > 0) || (e.sleepTime && e.wakeTime)
  ).length;
  const belowGoalDays = Math.max(0, loggedDays - doneDays);
  const total = entries.reduce((s, e) => s + (e.value || 0), 0);

  // Accurate completion rate since creation
  const rateVal = daily ? Math.min(100, Math.round((doneDays / daysSinceCreation) * 100)) : doneDays ? 100 : 0;
  const rate = daily ? `${rateVal}%` : doneDays ? 'Completed' : 'Pending';

  // Consistency Score based on days since created (up to 30 days)
  const windowDays = Math.min(30, daysSinceCreation);
  const recentDone = Array.from({ length: windowDays }, (_, i) => ymd(addDays(-i))).filter((d) => {
    const ent = map[d] || {};
    return isDone(a, ent.value, ent.timeStr, ent.sleepTime, ent.wakeTime);
  }).length;
  const consistencyScore = Math.min(100, Math.round((recentDone / windowDays) * 100));

  // Sleep Duration Dataset Calculation
  const isSleepWakeHabit = a.measure === 'sleep_wake';
  const sleepAnalysisData = useMemo(() => {
    if (!isSleepWakeHabit && !partnerHabit) return null;

    let totalSleepHours = 0;
    let validSleepNights = 0;

    const horizon = Math.min(30, daysSinceCreation);
    const daysList = Array.from({ length: horizon }, (_, i) => {
      const d = ymd(addDays(-i));
      let sleepTime = '';
      let wakeTime = '';
      let hours = 0;

      if (isSleepWakeHabit) {
        const entry = map[d];
        sleepTime = entry?.sleepTime || '';
        wakeTime = entry?.wakeTime || '';
        hours = entry?.value || 0;
      } else {
        const isCurrentSleep = a.name.toLowerCase().includes('sleep') || a.name.toLowerCase().includes('bedtime');
        const sleepMap = isCurrentSleep ? map : partnerMap;
        const wakeMap = isCurrentSleep ? partnerMap : map;
        const sleepEntry = sleepMap[d];
        const wakeEntry = wakeMap[d];
        sleepTime = sleepEntry?.timeStr || (sleepEntry?.value ? minutesToTime(sleepEntry.value) : '');
        wakeTime = wakeEntry?.timeStr || (wakeEntry?.value ? minutesToTime(wakeEntry.value) : '');
      }

      const sleepCalc = calculateSleepDuration(sleepTime, wakeTime);
      if (sleepCalc) {
        totalSleepHours += sleepCalc.hours;
        validSleepNights++;
        hours = sleepCalc.hours;
      } else if (hours > 0) {
        totalSleepHours += hours;
        validSleepNights++;
      }

      return {
        date: d.slice(5),
        fullDate: d,
        hours: hours || (sleepCalc ? sleepCalc.hours : 0),
        formatted: sleepCalc ? sleepCalc.formatted : (hours > 0 ? `${hours} hrs` : '–'),
        sleepFormatted: sleepCalc ? sleepCalc.sleepFormatted : (sleepTime ? formatTime12h(sleepTime) : '–'),
        wakeFormatted: sleepCalc ? sleepCalc.wakeFormatted : (wakeTime ? formatTime12h(wakeTime) : '–'),
      };
    }).reverse();

    const avgSleepHours = validSleepNights > 0 ? (totalSleepHours / validSleepNights).toFixed(1) : '0.0';

    return {
      daysList,
      avgSleepHours,
      validSleepNights,
      partnerName: partnerHabit ? partnerHabit.name : null,
      isUnified: isSleepWakeHabit,
    };
  }, [isSleepWakeHabit, partnerHabit, a.name, map, partnerMap, daysSinceCreation]);

  // Heatmap: starts from the week of createdDateStr (or full year if toggled)
  const heatmapStart = useMemo(() => {
    if (heatmapMode === 'since_created') {
      const d = new Date(createdDateStr + 'T00:00');
      d.setDate(d.getDate() - d.getDay()); // align with Sunday
      return d;
    }
    const d = addDays(-364);
    d.setDate(d.getDate() - d.getDay());
    return d;
  }, [heatmapMode, createdDateStr]);

  const weeks = useMemo(() => {
    const list = [];
    let currentWeek = [];
    for (let d = new Date(heatmapStart); ymd(d) <= todayStr; d = addDays(1, d)) {
      currentWeek.push(ymd(d));
      if (currentWeek.length === 7) {
        list.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) list.push(currentWeek);
    return list;
  }, [heatmapStart, todayStr]);

  const maxVal = Math.max(1, ...entries.map((e) => e.value || 0));
  const level = (v, tStr, sTime, wTime) => {
    const done = isDone(a, v, tStr, sTime, wTime);
    const hasLog = (typeof v === 'number' && v > 0) || (typeof tStr === 'string' && tStr.length > 0) || Boolean(sTime && wTime);
    if (!done && !hasLog) return 0;

    if (a.measure === 'time_of_day') return done ? 4 : 2;
    if (a.goalOperator === 'lte') {
      return done ? 4 : 1;
    }
    if (a.measure === 'sleep_wake') {
      const target = a.goal || 8;
      const r = v > 0 ? v / target : 0.5;
      if (done || r >= 1) return 4;
      if (r >= 0.75) return 3;
      if (r >= 0.5) return 2;
      return 1;
    }
    const target = a.measure === 'checkbox' ? 1 : a.goal || maxVal;
    const r = target > 0 ? v / target : 1;
    if (done || r >= 1) return 4;
    if (r >= 0.66) return 3;
    if (r >= 0.33) return 2;
    return 1;
  };

  // Multi-type Trend Data starting from creation date or bounded by timeframe
  const [chartMode, setChartMode] = useState('all'); // 'all' | 'consistency' | 'moving_average' | 'cumulative' | 'limit_control'

  const trendData = useMemo(() => {
    let runningSum = 0;
    let runningCompletions = 0;
    const actualHorizon = Math.min(timeframe, daysSinceCreation);

    const rawList = Array.from({ length: actualHorizon }, (_, i) => {
      const d = ymd(addDays(i - actualHorizon + 1));
      const ent = map[d] || {};
      const val = ent.value || 0;
      const done = isDone(a, val, ent.timeStr, ent.sleepTime, ent.wakeTime);
      return { d, val, ent, done };
    });

    return rawList.map((item, i) => {
      const { d, val, ent, done } = item;
      runningSum += val;
      if (done) runningCompletions++;

      // 7-day moving average calculation
      const windowStart = Math.max(0, i - 6);
      const windowSlice = rawList.slice(windowStart, i + 1);
      const movingAvg =
        Math.round((windowSlice.reduce((s, x) => s + x.val, 0) / windowSlice.length) * 10) / 10;

      // Budget saved under limit for negative habits
      const target = a.goal || 0;
      const isNeg = a.habitType === 'negative' || a.goalOperator === 'lte';
      const saved = isNeg && val > 0 && target > 0 ? Math.max(0, target - val) : 0;

      return {
        date: d.slice(5),
        fullDate: d,
        value: val,
        movingAverage: movingAvg,
        cumulativeValue: runningSum,
        cumulativeCompletions: runningCompletions,
        savedUnderBudget: saved,
        timeStr: ent.timeStr,
        sleepTime: ent.sleepTime,
        wakeTime: ent.wakeTime,
        done,
      };
    });
  }, [timeframe, map, a, daysSinceCreation]);

  // Measurable Bar Graph Dataset: Daily Logged Data vs Target Goal
  const measurableBarData = useMemo(() => {
    if (!isMeasurable) return [];

    const horizon = barTimeframe; // display every day in the timeframe (7, 14, or 30 days)
    const goalVal = a.goal || (a.measure === 'sleep_wake' ? 8 : a.measure === 'time' ? 30 : 1);
    const isLimit = a.goalOperator === 'lte' || a.habitType === 'negative';
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const list = Array.from({ length: horizon }, (_, i) => {
      const d = ymd(addDays(i - horizon + 1));
      const ent = map[d] || {};
      const dayDateObj = new Date(d + 'T00:00');
      const dayName = dayNames[dayDateObj.getDay()];

      let val = 0;
      let timeStr = ent.timeStr || '';
      let sleepTime = ent.sleepTime || '';
      let wakeTime = ent.wakeTime || '';
      let formattedVal = '';
      let formattedGoal = '';
      let valueLabel = '';
      let goalLabel = '';

      if (a.measure === 'sleep_wake' || (sleepAnalysisData && (a.name.toLowerCase().includes('sleep') || a.name.toLowerCase().includes('bedtime') || a.name.toLowerCase().includes('wake')))) {
        if (ent.value) {
          val = ent.value;
        } else if (ent.sleepTime && ent.wakeTime) {
          const calc = calculateSleepDuration(ent.sleepTime, ent.wakeTime);
          val = calc ? calc.hours : 0;
        } else if (sleepAnalysisData) {
          const found = sleepAnalysisData.daysList.find((x) => x.fullDate === d);
          if (found) val = found.hours || 0;
        }
        formattedVal = val > 0 ? `${val} hrs` : '0 hrs';
        formattedGoal = `${goalVal} hrs`;
        valueLabel = val > 0 ? `${val}h` : '';
        goalLabel = `${goalVal}h`;
      } else if (a.measure === 'time') {
        val = ent.value || 0;
        formattedVal = val > 0 ? formatDuration(val) : '0m';
        formattedGoal = formatDuration(goalVal);
        valueLabel = val > 0 ? formatDuration(val) : '';
        goalLabel = formatDuration(goalVal);
      } else if (a.measure === 'time_of_day') {
        val = ent.value || 0;
        if (!timeStr && val > 0) timeStr = minutesToTime(val);
        formattedVal = timeStr ? formatTime12h(timeStr) : val > 0 ? `${val} min` : 'No log';
        formattedGoal = a.goal ? minutesToTime(a.goal) : '–';
        valueLabel = timeStr ? formatTime12h(timeStr) : '';
        goalLabel = a.goal ? minutesToTime(a.goal) : '';
      } else {
        // count or numeric
        val = ent.value || 0;
        formattedVal = `${val} ${unitStr}`;
        formattedGoal = `${goalVal} ${unitStr}`;
        valueLabel = val > 0 ? `${val}` : '';
        goalLabel = `${goalVal}`;
      }

      const done = isDone(a, val, timeStr, sleepTime, wakeTime);
      const isBelowGoal = !done && val > 0;
      const pctAchieved = goalVal > 0 ? Math.min(999, Math.round((val / goalVal) * 100)) : 100;
      const shortfall = !isLimit && goalVal > val ? goalVal - val : 0;
      const overLimit = isLimit && val > goalVal ? val - goalVal : 0;

      // Variance vs goal
      let diff = 0;
      if (isLimit) {
        diff = goalVal - val; // positive if safely under limit
      } else {
        diff = val - goalVal; // positive if target reached/exceeded
      }

      const isToday = d === todayStr;
      const isBeforeCreation = d < createdDateStr;

      return {
        date: d.slice(5),
        fullDate: d,
        dayName,
        value: val,
        goal: goalVal,
        formattedVal,
        formattedGoal,
        valueLabel,
        goalLabel,
        done,
        isBelowGoal,
        pctAchieved,
        shortfall,
        overLimit,
        isLimit,
        diff,
        isToday,
        isBeforeCreation,
        hasEntry: Boolean(ent.value || ent.timeStr || (ent.sleepTime && ent.wakeTime)),
      };
    });

    return list;
  }, [isMeasurable, barTimeframe, a, map, sleepAnalysisData, unitStr, todayStr, createdDateStr]);

  const barStats = useMemo(() => {
    if (!measurableBarData || measurableBarData.length === 0) return null;

    // Active days = days from creation date to today (or days with logged entries)
    const activeDaysList = measurableBarData.filter((x) => !x.isBeforeCreation);
    const activeDaysCount = Math.max(1, activeDaysList.length);
    const metCount = activeDaysList.filter((x) => x.done).length;
    const belowCount = activeDaysList.filter((x) => x.isBelowGoal).length;
    const loggedCount = activeDaysList.filter((x) => x.hasEntry).length;
    const successPct = Math.round((metCount / activeDaysCount) * 100);

    const loggedEntries = activeDaysList.filter((x) => x.hasEntry);
    const avgPctAchieved = loggedEntries.length
      ? Math.round(loggedEntries.reduce((s, x) => s + x.pctAchieved, 0) / loggedEntries.length)
      : 0;

    const sumVals = activeDaysList.reduce((s, x) => s + (x.value || 0), 0);
    const avgVal = Math.round((sumVals / activeDaysCount) * 10) / 10;
    const peakVal = measurableBarData.reduce((m, x) => Math.max(m, x.value || 0), 0);

    const todayItem = measurableBarData.find((x) => x.isToday);
    const todayVal = todayItem ? todayItem.value : 0;
    const todayFormatted = todayItem ? todayItem.formattedVal : `0 ${unitStr}`;
    const todayPct = todayItem ? todayItem.pctAchieved : 0;
    const todayDone = todayItem ? todayItem.done : false;
    const todayBelow = todayItem ? todayItem.isBelowGoal : false;
    const todayShortfall = todayItem ? todayItem.shortfall : 0;

    let formattedAvg = `${avgVal} ${unitStr}`;
    let formattedPeak = `${peakVal} ${unitStr}`;
    if (a.measure === 'time') {
      formattedAvg = formatDuration(Math.round(avgVal));
      formattedPeak = formatDuration(peakVal);
    } else if (a.measure === 'sleep_wake') {
      formattedAvg = `${avgVal} hrs`;
      formattedPeak = `${peakVal} hrs`;
    }

    return {
      todayVal,
      todayFormatted,
      todayPct,
      todayDone,
      todayBelow,
      todayShortfall,
      metCount,
      belowCount,
      loggedCount,
      activeDaysCount,
      successPct,
      avgPctAchieved,
      sumVals,
      avgVal,
      peakVal,
      formattedAvg,
      formattedPeak,
    };
  }, [measurableBarData, a.measure, unitStr]);

  // Analytics metrics across ALL types:
  const recentSlice = trendData.slice(-7);
  const current7dAvg = recentSlice.length
    ? Math.round((recentSlice.reduce((s, x) => s + x.value, 0) / recentSlice.length) * 10) / 10
    : 0;
  const prevSlice = trendData.slice(-14, -7);
  const prev7dAvg = prevSlice.length
    ? Math.round((prevSlice.reduce((s, x) => s + x.value, 0) / prevSlice.length) * 10) / 10
    : 0;
  const momentumText =
    current7dAvg > prev7dAvg ? 'Accelerating ↗' : current7dAvg < prev7dAvg ? 'Easing ↘' : 'Stable →';
  const momentumColor =
    current7dAvg > prev7dAvg
      ? (a.habitType === 'negative' ? 'text-amber-500' : 'text-emerald-500')
      : current7dAvg < prev7dAvg
      ? (a.habitType === 'negative' ? 'text-emerald-500' : 'text-amber-500')
      : 'text-slate-400';

  const totalSaved = trendData.reduce((s, x) => s + (x.savedUnderBudget || 0), 0);
  const exceedancesCount = entries.filter((e) => (e.value || 0) > (a.goal || 0)).length;
  const peakMovingAvg = trendData.reduce((m, x) => Math.max(m, x.movingAverage || 0), 0);
  const nextMilestone =
    total >= 500 ? 1000 : total >= 250 ? 500 : total >= 100 ? 250 : total >= 50 ? 100 : 50;

  // Weekday distribution
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const byDay = names.map((n) => ({ n, v: 0 }));
  entries.forEach((e) => {
    if (isDone(a, e.value, e.timeStr, e.sleepTime, e.wakeTime)) {
      byDay[new Date(e.date + 'T00:00').getDay()].v++;
    }
  });
  const bestDay = [...byDay].sort((x, y) => y.v - x.v)[0];

  const badges = [
    { title: 'First Step', desc: '1 completion', icon: '🎯', unlocked: doneDays >= 1 },
    { title: '3-Day Spark', desc: '3-day streak', icon: '🔥', unlocked: best >= 3 },
    { title: 'Week Warrior', desc: '7-day streak', icon: '⚡', unlocked: best >= 7 },
    { title: 'Fortnight Hero', desc: '14-day streak', icon: '🏆', unlocked: best >= 14 },
    { title: 'Master of Habit', desc: '30+ total logs', icon: '💎', unlocked: doneDays >= 30 },
  ];

  const handleUpdate = async (updatedFields) => {
    const updated = await api(`/activities/${a._id}`, 'PUT', updatedFields);
    setA(updated);
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onDelete(a);
    } catch (err) {
      console.error(err);
      setIsDeleting(false);
    }
  };

  const handleExport = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify({ habit: a, entries }, null, 2));
    const dl = document.createElement('a');
    dl.setAttribute('href', dataStr);
    dl.setAttribute('download', `${a.name.replace(/\s+/g, '_')}_history.json`);
    dl.click();
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition"
        >
          <span>←</span> Back to Habit Matrix
        </button>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setShowEditModal(true)}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            ✏️ Edit
          </button>
          <button
            onClick={handleExport}
            title="Export habit logs as JSON"
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition hidden sm:inline-block"
          >
            📥 Export
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-950/30 px-3.5 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition"
          >
            🗑️ Delete
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="w-full max-w-7xl mx-auto p-4 sm:p-8 pb-28 sm:pb-8 space-y-6">
        {/* Habit Header Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-5 sm:p-8 shadow-sm">
          <div
            className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full blur-3xl opacity-20 pointer-events-none"
            style={{ backgroundColor: habitColor }}
          />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center flex-wrap gap-2">
                <span className="h-3.5 w-3.5 rounded-full shadow-sm" style={{ backgroundColor: habitColor }} />
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    a.habitType === 'negative'
                      ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300'
                      : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300'
                  }`}
                >
                  {a.habitType === 'negative' ? '🔴 Negative Limit (−)' : '🟢 Positive Routine (+)'}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {a.category || 'Habit'} ·{' '}
                  {a.frequency === 'daily'
                    ? 'Daily Routine'
                    : a.frequency === 'challenge'
                    ? `⏱️ ${a.challengeDays || 10}-Day Challenge (Finish: ${a.date})`
                    : `📅 Due: ${a.date}`}
                </span>
                {a.frequency !== 'daily' && a.date && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    a.completed
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                      : getDaysLeft(a.date) <= 3
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 animate-pulse'
                      : 'bg-sky-100 text-sky-700 dark:bg-sky-950/80 dark:text-sky-300'
                  }`}>
                    {a.completed ? '✓ Completed' : `⏳ ${getDaysLeft(a.date)}d remaining`}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  Created {createdDateStr} (Day {daysSinceCreation})
                </span>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ backgroundColor: `${habitColor}22`, color: habitColor }}
                >
                  {consistencyScore >= 70 ? '⚡ Highly Consistent' : '🌱 Building Rhythm'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 dark:text-white">
                {a.name}
              </h1>
              {a.description && (
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
                  {a.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
              {a.frequency !== 'daily' && (
                <button
                  type="button"
                  onClick={async () => {
                    const nextVal = !a.completed;
                    await handleUpdate({ completed: nextVal, completedAt: nextVal ? new Date() : null });
                  }}
                  className={`px-3 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm ${
                    a.completed
                      ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  <span>{a.completed ? '✓' : '○'}</span>
                  <span>{a.completed ? 'Completed' : 'Mark Completed'}</span>
                </button>
              )}

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-3.5 py-1.5 sm:px-4 sm:py-2 text-right">
                <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">Measurement & Goal</div>
                <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  {a.measure === 'checkbox'
                    ? '1 check/day'
                    : a.measure === 'time_of_day'
                    ? 'Clock Time (HH:mm)'
                    : a.measure === 'sleep_wake'
                    ? `Bedtime & Wake Up (Goal: ${a.goal || 8} hrs)`
                    : formatGoalText(a)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Key Statistics Cards (Calculated strictly since creation!) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Current Streak
              </span>
              <span className="text-base sm:text-lg">🔥</span>
            </div>
            <div className="text-xl sm:text-3xl font-black mt-2 text-slate-900 dark:text-white font-display">
              {daily ? `${current}d` : '–'}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              Active consecutive days
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Best Streak
              </span>
              <span className="text-base sm:text-lg">🏆</span>
            </div>
            <div className="text-xl sm:text-3xl font-black mt-2 text-slate-900 dark:text-white font-display">
              {daily ? `${best}d` : '–'}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Personal record</div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Completion Rate
              </span>
              <span className="text-base sm:text-lg">⚡</span>
            </div>
            <div className="text-xl sm:text-3xl font-black mt-2 font-display" style={{ color: habitColor }}>
              {rate}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              {doneDays} met {belowGoalDays > 0 ? `• ${belowGoalDays} below goal ` : ''}({daysSinceCreation}d recorded)
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Consistency Score
              </span>
              <span className="text-base sm:text-lg">📊</span>
            </div>
            <div className="text-xl sm:text-3xl font-black mt-2 text-emerald-600 dark:text-emerald-400 font-display">
              {consistencyScore}%
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              Last {windowDays} days index
            </div>
          </div>
        </div>

        {/* 🌙 Correlated Sleep Analysis Card (When Paired or Unified sleep_wake) */}
        {sleepAnalysisData && (
          <section className="rounded-3xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-indigo-950/40 p-5 sm:p-7 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🌙</span>
                  <h2 className="text-lg font-bold font-display text-slate-900 dark:text-white">
                    Sleep Duration & Schedule Analysis
                  </h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {sleepAnalysisData.isUnified ? (
                    <>
                      Tracked directly via Bedtime &amp; Wake Up logs for <strong>{a.name}</strong> (Target: {a.goal || 8} hrs/night)
                    </>
                  ) : (
                    <>
                      Calculated automatically by pairing <strong>{a.name}</strong> with <strong>{sleepAnalysisData.partnerName}</strong>
                    </>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="px-3.5 py-1.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Average Sleep</span>
                  <span className="text-base font-extrabold text-indigo-600 dark:text-indigo-400 font-display">
                    {sleepAnalysisData.avgSleepHours} hrs/night
                  </span>
                </div>
                <div className="px-3.5 py-1.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Sleep Target</span>
                  <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-display">
                    {a.measure === 'sleep_wake' ? `${a.goal || 8} hrs` : '7 – 9 hrs'}
                  </span>
                </div>
              </div>
            </div>

            {/* Sleep Hours Chart */}
            <div className="h-60 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sleepAnalysisData.daysList}>
                  <defs>
                    <linearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.12} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#888' }} />
                  <YAxis
                    domain={[0, 12]}
                    allowDecimals={true}
                    width={28}
                    tick={{ fontSize: 10, fill: '#888' }}
                    label={{ value: 'Hours', angle: -90, position: 'insideLeft', fill: '#888', fontSize: 10 }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="rounded-xl bg-slate-900 text-white p-3 shadow-xl text-xs space-y-1">
                            <div className="font-bold text-slate-300">{d.fullDate}</div>
                            <div className="text-indigo-300 font-extrabold text-sm">
                              🛌 Total Sleep: {d.hours} hrs ({d.formatted})
                            </div>
                            <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800 flex justify-between gap-4">
                              <span>Bedtime: {d.sleepFormatted}</span>
                              <span>Wake: {d.wakeFormatted}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {/* Optimal 7-9 hr sleep zone lines */}
                  <ReferenceLine y={8} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Optimal (8h)', fill: '#10b981', fontSize: 10, position: 'insideTopRight' }} />
                  <ReferenceLine y={7} stroke="#f59e0b" strokeDasharray="3 3" />
                  <Area
                    type="monotone"
                    dataKey="hours"
                    name="Sleep Hours"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    fill="url(#sleepGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* Consistency Matrix (Starts from Creation Date) */}
        <section className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-4 sm:p-7 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold font-display text-slate-900 dark:text-white">
                Activity Consistency Matrix
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {heatmapMode === 'since_created'
                  ? `Showing activity history starting from creation date (${createdDateStr})`
                  : 'Full 52-week annual history'}
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {/* Toggle: Since Created vs Full Year */}
              <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 p-0.5 text-[11px] font-semibold">
                <button
                  onClick={() => setHeatmapMode('since_created')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    heatmapMode === 'since_created'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Since Created
                </button>
                <button
                  onClick={() => setHeatmapMode('full_year')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    heatmapMode === 'full_year'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Full Year
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                <div className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded bg-slate-200 dark:bg-slate-800" />
                  <span className="text-[10px]">No log</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded bg-amber-500" />
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Below Goal</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded" style={{ backgroundColor: habitColor }} />
                  <span className="text-[10px] font-semibold">Goal Met</span>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="flex gap-1.5" style={{ width: 'max-content' }}>
              <div className="grid grid-rows-7 gap-1.5 text-[9px] text-slate-400 font-semibold pr-2 self-center">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              {weeks.map((week, wIndex) => (
                <div key={wIndex} className="grid grid-rows-7 gap-1.5">
                  {week.map((d) => {
                    const ent = map[d] || {};
                    const val = ent.value || 0;
                    const tStr = ent.timeStr;
                    const lvl = level(val, tStr, ent.sleepTime, ent.wakeTime);
                    const isBeforeCreation = d < createdDateStr;
                    const done = isDone(a, val, tStr, ent.sleepTime, ent.wakeTime);
                    const hasLog = (val > 0) || (typeof tStr === 'string' && tStr.length > 0) || Boolean(ent.sleepTime && ent.wakeTime);
                    const isBelowGoal = !done && hasLog;
                    const targetVal = a.goal || (a.measure === 'sleep_wake' ? 8 : 1);
                    const pctAchieved = targetVal > 0 ? Math.min(999, Math.round((val / targetVal) * 100)) : 100;
                    const shortfall = Math.max(0, targetVal - val);

                    let titleText = `${d}: `;
                    if (isBeforeCreation) {
                      titleText += `(Before start)`;
                    } else if (done) {
                      titleText += `${ent.sleepTime && ent.wakeTime ? `${ent.sleepTime} - ${ent.wakeTime} (${val} hrs)` : tStr || `${val} ${unitStr}`} ✓ Goal Met (${pctAchieved}%)`;
                    } else if (isBelowGoal) {
                      titleText += `${ent.sleepTime && ent.wakeTime ? `${ent.sleepTime} - ${ent.wakeTime} (${val} hrs)` : tStr || `${val} ${unitStr}`} 🟡 Below Goal: ${val}/${targetVal} ${unitStr} (${pctAchieved}% achieved • ${shortfall} ${unitStr} short)`;
                    } else {
                      titleText += `○ Incomplete (No entry)`;
                    }

                    return (
                      <div
                        key={d}
                        title={titleText}
                        className={`h-3.5 w-3.5 rounded-sm transition-transform hover:scale-125 cursor-pointer ${
                          isBeforeCreation
                            ? 'bg-slate-100 dark:bg-slate-800/40 opacity-40'
                            : lvl === 0
                            ? 'bg-slate-200/70 dark:bg-slate-800/80'
                            : ''
                        }`}
                        style={
                          lvl > 0
                            ? {
                                backgroundColor: isBelowGoal ? '#f59e0b' : habitColor,
                                opacity: isBelowGoal
                                  ? lvl === 1 ? 0.45 : lvl === 2 ? 0.7 : 0.95
                                  : lvl === 1 ? 0.35 : lvl === 2 ? 0.6 : lvl === 3 ? 0.85 : 1,
                              }
                            : {}
                        }
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Measurable Bar Graph: Daily Logged Count vs Target Goal (Appears if measurable) */}
        {isMeasurable && (
          <section className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-4 sm:p-7 shadow-sm space-y-5">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">📊</span>
                  <h2 className="text-base sm:text-lg font-bold font-display text-slate-900 dark:text-white">
                    Daily Logged Count vs Target Goal
                  </h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Daily recorded measurements with target threshold line ({formatGoalText(a)})
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                {/* Timeframe Selector: 7D, 14D, 30D */}
                <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 p-0.5 text-[11px] font-semibold">
                  {[
                    { label: '7D', val: 7 },
                    { label: '14D', val: 14 },
                    { label: '30D', val: 30 },
                  ].map((tf) => (
                    <button
                      key={tf.val}
                      type="button"
                      onClick={() => setBarTimeframe(tf.val)}
                      className={`px-2.5 py-1 rounded-lg transition ${
                        barTimeframe === tf.val
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm font-bold'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Metric Overview Row */}
            {barStats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Target Goal</span>
                  <span className="text-base font-extrabold text-amber-500 font-display">
                    {formatGoalText(a)}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Threshold per day</span>
                </div>
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Today's Result</span>
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className={`text-base font-extrabold font-display ${
                      barStats.todayDone
                        ? 'text-emerald-500'
                        : barStats.todayBelow
                        ? 'text-amber-500'
                        : 'text-slate-400'
                    }`}>
                      {barStats.todayFormatted}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold block mt-0.5 ${
                    barStats.todayDone
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : barStats.todayBelow
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-slate-400'
                  }`}>
                    {barStats.todayDone
                      ? `✓ Goal Met (${barStats.todayPct}%)`
                      : barStats.todayBelow
                      ? `🟡 Below Goal: ${barStats.todayPct}% (${barStats.todayShortfall} ${unitStr} short)`
                      : '○ No entry yet'}
                  </span>
                </div>
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Goals Met &amp; Below Goal</span>
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-display">
                      {barStats.metCount} Met
                    </span>
                    <span className="text-xs font-bold text-amber-500 font-display">
                      • {barStats.belowCount} Below
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {barStats.successPct}% success ({barStats.avgPctAchieved}% avg goal progress)
                  </span>
                </div>
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Average / Peak</span>
                  <span className="text-base font-extrabold text-slate-900 dark:text-white font-display">
                    {barStats.formattedAvg} <span className="text-xs text-slate-400 font-normal">/ {barStats.formattedPeak}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Total: {a.measure === 'time' ? formatDuration(barStats.sumVals) : `${barStats.sumVals} ${unitStr}`}
                  </span>
                </div>
              </div>
            )}

            {/* Bar Chart Container */}
            <div className="h-64 sm:h-76 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={measurableBarData} barGap={0}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.12} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#888' }}
                    interval={barTimeframe === 30 ? 1 : 0}
                  />
                  <YAxis
                    allowDecimals={a.measure === 'sleep_wake'}
                    width={36}
                    tick={{ fontSize: 10, fill: '#888' }}
                    tickFormatter={(v) => {
                      if (v === 0) return '0';
                      if (a.measure === 'time') {
                        return v >= 60 ? `${(v / 60).toFixed(1)}h` : `${v}m`;
                      }
                      if (a.measure === 'sleep_wake') return `${v}h`;
                      if (a.measure === 'time_of_day') return minutesToTime(v);
                      return `${v}`;
                    }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="rounded-2xl bg-slate-900/95 backdrop-blur text-white p-3.5 shadow-2xl text-xs space-y-2 border border-slate-700/80 min-w-[220px]">
                            <div className="font-extrabold text-slate-300 border-b border-slate-800 pb-1 flex items-center justify-between">
                              <span>{item.dayName}, {item.fullDate}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                item.done
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : item.isBelowGoal
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : item.value > 0
                                  ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                  : 'bg-slate-800 text-slate-400'
                              }`}>
                                {item.done
                                  ? `✓ Goal Met (${item.pctAchieved}%)`
                                  : item.isBelowGoal
                                  ? `🟡 Below Goal (${item.pctAchieved}%)`
                                  : item.value > 0
                                  ? '✕ Over Limit'
                                  : '○ No Entry'}
                              </span>
                            </div>

                            <div className="space-y-1.5 pt-0.5">
                              <div className="flex items-center justify-between gap-3">
                                <span className="flex items-center gap-1.5 text-slate-400">
                                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.done ? habitColor : item.isBelowGoal ? '#f59e0b' : '#f43f5e' }} />
                                  Logged Result:
                                </span>
                                <strong className="text-white text-sm font-extrabold">
                                  {item.formattedVal}
                                </strong>
                              </div>

                              <div className="flex items-center justify-between gap-3">
                                <span className="flex items-center gap-1.5 text-slate-400">
                                  <span className="h-2.5 w-2.5 rounded-sm bg-amber-400/80" />
                                  Target Goal:
                                </span>
                                <strong className="text-amber-300 font-bold">
                                  {formatGoalText(a)}
                                </strong>
                              </div>

                              {item.value > 0 && (
                                <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-800 text-[11px]">
                                  <span className="text-slate-400">Goal Status:</span>
                                  <span className={`font-extrabold ${item.done ? 'text-emerald-400' : item.isBelowGoal ? 'text-amber-400' : 'text-rose-400'}`}>
                                    {item.done
                                      ? (item.diff > 0 ? `+${item.diff} ${unitStr} over goal (${item.pctAchieved}%)` : `Target met exactly (100%)`)
                                      : item.isBelowGoal
                                      ? `🟡 ${item.shortfall} ${unitStr} short (${item.pctAchieved}% achieved)`
                                      : `⚠️ ${Math.abs(item.diff)} ${unitStr} over limit`}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />

                  {/* Reference Line for Target Goal */}
                  <ReferenceLine
                    y={a.goal || (a.measure === 'sleep_wake' ? 8 : 1)}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    strokeWidth={2}
                    label={{
                      value: `Target: ${formatGoalText(a)}`,
                      position: 'insideTopRight',
                      fill: '#f59e0b',
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  />

                  {/* Logged Count Bar with value label on top (Brown bar removed) */}
                  <Bar
                    dataKey="value"
                    name="Logged Count"
                    fill={habitColor}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={38}
                  >
                    <LabelList
                      dataKey="valueLabel"
                      position="top"
                      content={(props) => {
                        const { x, y, width, value } = props;
                        if (!value) return null;
                        return (
                          <text
                            x={x + width / 2}
                            y={y - 6}
                            textAnchor="middle"
                            fontSize={11}
                            fontWeight={800}
                            fill="#38bdf8"
                            className="fill-indigo-600 dark:fill-indigo-300 font-display font-black"
                          >
                            {value}
                          </text>
                        );
                      }}
                    />
                    {measurableBarData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.value === 0
                            ? 'transparent'
                            : entry.done
                            ? habitColor
                            : entry.isBelowGoal
                            ? '#f59e0b'
                            : '#f43f5e'
                        }
                        opacity={entry.value === 0 ? 0 : 0.95}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Clean Bottom Legend Indicator */}
              <div className="flex items-center justify-center flex-wrap gap-5 pt-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded" style={{ backgroundColor: habitColor }} />
                  <span className="text-slate-600 dark:text-slate-300 font-semibold">Goal Met ({unitStr})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded bg-amber-500" />
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">Below Goal Result</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 border-t-2 border-dashed border-amber-500" />
                  <span className="text-slate-500 dark:text-slate-400 font-semibold">Target Goal Line ({formatGoalText(a)})</span>
                </div>
              </div>
            </div>

            {/* Daily Measurement Breakdown Cards Grid */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    📅 Daily Measured Log ({measurableBarData.length} Days)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    • Exact count &amp; measurement for each day
                  </span>
                </div>
                <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                  Today first ➔
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
                {[...measurableBarData].reverse().map((day) => {
                  const isToday = day.isToday;

                  return (
                    <div
                      key={day.fullDate}
                      className={`p-2.5 rounded-2xl border transition-all flex flex-col justify-between gap-1.5 ${
                        isToday
                          ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-500/25 shadow-sm'
                          : day.done
                          ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/20'
                          : day.isBelowGoal
                          ? 'border-amber-200 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/20'
                          : day.value > 0
                          ? 'border-rose-200 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/20'
                          : 'border-slate-200/60 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-800/30 opacity-75'
                      }`}
                    >
                      {/* Day & Date Header */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {day.dayName} {day.date}
                        </span>
                        {isToday ? (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-indigo-600 text-white uppercase tracking-wider">
                            Today
                          </span>
                        ) : (
                          <span className={`text-[9px] font-bold ${
                            day.done
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : day.isBelowGoal
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-400'
                          }`}>
                            {day.done ? '✓ Met' : day.isBelowGoal ? `${day.pctAchieved}%` : ''}
                          </span>
                        )}
                      </div>

                      {/* Measured Count & Progress Bar Display */}
                      <div className="my-0.5 space-y-1">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold block">
                          Day Result
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className={`text-base font-black font-display ${
                            day.value === 0
                              ? 'text-slate-400 dark:text-slate-500'
                              : day.done
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : day.isBelowGoal
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            {day.value > 0 ? day.formattedVal : `0 ${unitStr}`}
                          </span>
                        </div>

                        {/* Progress Bar towards goal */}
                        {day.value > 0 && (
                          <div className="w-full bg-slate-200 dark:bg-slate-700/60 h-1.5 rounded-full overflow-hidden mt-1">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                day.done ? 'bg-emerald-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${Math.min(100, day.pctAchieved)}%` }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Target Goal & Status Footer */}
                      <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] font-semibold">
                        <span className="text-slate-400 dark:text-slate-500">
                          Goal: {day.formattedGoal}
                        </span>
                        <span className={
                          day.done
                            ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                            : day.isBelowGoal
                            ? 'text-amber-600 dark:text-amber-400 font-bold'
                            : day.value > 0
                            ? 'text-rose-600 dark:text-rose-400 font-bold'
                            : 'text-slate-400'
                        }>
                          {day.done
                            ? '✓ Achieved'
                            : day.isBelowGoal
                            ? `🟡 ${day.shortfall} ${unitStr} short`
                            : day.value > 0
                            ? '⚠️ Over'
                            : '○ None'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Milestone Badges */}
        <section className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-4 sm:p-6 shadow-sm">
          <h2 className="text-sm sm:text-base font-bold font-display text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <span>🎖️</span> Milestones & Achievements
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 sm:gap-3">
            {badges.map((b) => (
              <div
                key={b.title}
                className={`p-3 rounded-2xl border text-center transition-all ${
                  b.unlocked
                    ? 'border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm'
                    : 'border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/30 opacity-45'
                }`}
              >
                <div className="text-xl sm:text-2xl mb-1">{b.icon}</div>
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{b.title}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{b.desc}</div>
                <div className="mt-2 text-[9px] font-bold uppercase tracking-wider">
                  {b.unlocked ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">✓ Unlocked</span>
                  ) : (
                    <span className="text-slate-400">Locked</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ALL TYPES OF ANALYTICS: 360° Comprehensive Matrix */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
              <span>📊</span> All Analytics Dimensions
            </h2>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
              Target: {formatGoalText(a)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Volume & Cumulative Total Analytics */}
            <div className="p-4 sm:p-5 rounded-3xl border border-indigo-200/80 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/50 via-white to-violet-50/30 dark:from-indigo-950/30 dark:via-slate-900/80 dark:to-violet-950/20 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>🏆</span> Volume & Cumulative
                </span>
                <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">Total Velocity</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Total Volume</div>
                  <div className="text-base font-black text-indigo-600 dark:text-indigo-400 mt-0.5 truncate">
                    {a.measure === 'time' ? formatDuration(total) : `${total} ${unitStr}`}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">{doneDays} active days</div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Session Avg</div>
                  <div className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">
                    {doneDays > 0 ? (total / doneDays).toFixed(1) : '0'} {unitStr}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">Per check-in</div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Peak Day</div>
                  <div className="text-base font-black text-amber-500 mt-0.5 truncate">
                    {maxVal} {unitStr}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">All-time record</div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Milestone</div>
                  <div className="text-base font-black text-violet-600 dark:text-violet-400 mt-0.5 truncate">
                    {nextMilestone} {unitStr}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">Next milestone</div>
                </div>
              </div>
            </div>

            {/* 2. 7-Day Moving Average & Momentum Analytics */}
            <div className="p-4 sm:p-5 rounded-3xl border border-sky-200/80 dark:border-sky-900/50 bg-gradient-to-br from-sky-50/50 via-white to-cyan-50/30 dark:from-sky-950/30 dark:via-slate-900/80 dark:to-cyan-950/20 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>📈</span> 7-Day Moving Avg
                </span>
                <span className="text-[10px] font-semibold text-sky-600 dark:text-sky-400">Smoothed Trend</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Current 7D Avg</div>
                  <div className="text-base font-black text-sky-600 dark:text-sky-400 mt-0.5 truncate">
                    {current7dAvg} {unitStr}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">Smoothed/day</div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Pace Momentum</div>
                  <div className={`text-base font-black mt-0.5 truncate ${momentumColor}`}>
                    {momentumText}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">vs. prior 7d</div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Recent 7D Sum</div>
                  <div className="text-base font-black text-teal-600 dark:text-teal-400 mt-0.5 truncate">
                    {a.measure === 'time'
                      ? formatDuration(recentSlice.reduce((s, x) => s + x.value, 0))
                      : `${recentSlice.reduce((s, x) => s + x.value, 0)} ${unitStr}`}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">Last 7 days</div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Peak 7D Avg</div>
                  <div className="text-base font-black text-indigo-600 dark:text-indigo-400 mt-0.5 truncate">
                    {peakMovingAvg} {unitStr}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">All-time best avg</div>
                </div>
              </div>
            </div>

            {/* 3. Restraint & Limit Control / Adherence Analytics */}
            <div className="p-4 sm:p-5 rounded-3xl border border-rose-200/80 dark:border-rose-900/50 bg-gradient-to-br from-rose-50/50 via-white to-pink-50/30 dark:from-rose-950/30 dark:via-slate-900/80 dark:to-pink-950/20 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>🛡️</span> Limit & Adherence
                </span>
                <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400">Budget Control</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Clean Days Rate</div>
                  <div className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">
                    {rateVal}%
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">{doneDays}/{daysSinceCreation} on target</div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Budget Saved</div>
                  <div className="text-base font-black text-indigo-600 dark:text-indigo-400 mt-0.5 truncate">
                    {a.measure === 'time' ? formatDuration(totalSaved) : `${totalSaved} ${unitStr}`}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">Under threshold</div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Slips / Over</div>
                  <div className="text-base font-black text-rose-600 dark:text-rose-400 mt-0.5 truncate">
                    {exceedancesCount}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">Days over limit</div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Clean Streak</div>
                  <div className="text-base font-black text-amber-500 mt-0.5 truncate">
                    {current}d
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">Best: {best}d</div>
                </div>
              </div>
            </div>

            {/* 4. Daily Consistency & Streak Stability Analytics */}
            <div className="p-4 sm:p-5 rounded-3xl border border-emerald-200/80 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/30 dark:from-emerald-950/30 dark:via-slate-900/80 dark:to-teal-950/20 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>📅</span> Daily Consistency
                </span>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Stability Rate</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Stability Index</div>
                  <div className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">
                    {consistencyScore}%
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">Last {windowDays}d index</div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Active Streak</div>
                  <div className="text-base font-black text-amber-500 mt-0.5 truncate">
                    {current}d
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">Personal best: {best}d</div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Best Weekday</div>
                  <div className="text-base font-black text-violet-600 dark:text-violet-400 mt-0.5 truncate">
                    {bestDay?.n || '–'}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">{bestDay?.v || 0} completions</div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">History Depth</div>
                  <div className="text-base font-black text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                    {daysSinceCreation}d
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">Since {createdDateStr}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trend Area Chart (Bounded by creation date) */}
        <section className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-4 sm:p-7 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-base font-bold font-display text-slate-900 dark:text-white">
                Performance Analytics & Trendline
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tracked since {createdDateStr} (Day {daysSinceCreation})
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Chart Mode Toggle */}
              <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setChartMode('all')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    chartMode === 'all'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  ✨ All Metrics
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode('consistency')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    chartMode === 'consistency'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  📅 Daily
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode('moving_average')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    chartMode === 'moving_average'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  📈 7D Avg
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode('cumulative')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    chartMode === 'cumulative'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  🏆 Cumulative
                </button>
                {(a.habitType === 'negative' || a.goalOperator === 'lte') && (
                  <button
                    type="button"
                    onClick={() => setChartMode('limit_control')}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      chartMode === 'limit_control'
                        ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-300 shadow-sm font-bold'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    🛡️ Saved
                  </button>
                )}
              </div>

              {/* Timeframe selector */}
              <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 p-1 text-xs font-semibold">
                {[
                  { label: '14D', val: 14 },
                  { label: '30D', val: 30 },
                  { label: '90D', val: 90 },
                ].map((tf) => (
                  <button
                    key={tf.val}
                    type="button"
                    onClick={() => setTimeframe(tf.val)}
                    className={`px-3 py-1 rounded-lg transition ${
                      timeframe === tf.val
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="h-64 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={habitColor} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={habitColor} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.12} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#888' }} />
                <YAxis allowDecimals={false} width={28} tick={{ fontSize: 10, fill: '#888' }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const isLimit = a.goalOperator === 'lte' || a.habitType === 'negative';

                      const dailyStr = a.measure === 'time'
                        ? formatDuration(data.value)
                        : a.measure === 'time_of_day'
                        ? (formatTime12h(data.timeStr) || '–')
                        : `${data.value} ${unitStr}`;

                      const cumStr = a.measure === 'time'
                        ? formatDuration(data.cumulativeValue)
                        : `${data.cumulativeValue} ${unitStr}`;

                      return (
                        <div className="rounded-2xl bg-slate-900/95 backdrop-blur text-white p-3.5 shadow-2xl text-xs space-y-1.5 border border-slate-700/80 min-w-[190px]">
                          <div className="font-extrabold text-slate-300 border-b border-slate-800 pb-1 flex items-center justify-between">
                            <span>{data.fullDate}</span>
                            <span className="text-[10px] text-slate-400">Day {trendData.indexOf(data) + 1}</span>
                          </div>

                          {/* Multi-type metrics list */}
                          <div className="space-y-1 pt-0.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="flex items-center gap-1.5 text-slate-400">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: habitColor }} />
                                Daily Log:
                              </span>
                              <strong className="text-white">{dailyStr}</strong>
                            </div>

                            <div className="flex items-center justify-between gap-2">
                              <span className="flex items-center gap-1.5 text-slate-400">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                7-Day Avg:
                              </span>
                              <strong className="text-emerald-400">{data.movingAverage} {unitStr}</strong>
                            </div>

                            <div className="flex items-center justify-between gap-2">
                              <span className="flex items-center gap-1.5 text-slate-400">
                                <span className="h-2 w-2 rounded-full bg-indigo-400" />
                                Running Total:
                              </span>
                              <strong className="text-indigo-300">{cumStr}</strong>
                            </div>

                            {data.savedUnderBudget > 0 && (
                              <div className="flex items-center justify-between gap-2">
                                <span className="flex items-center gap-1.5 text-slate-400">
                                  <span className="h-2 w-2 rounded-full bg-teal-400" />
                                  Budget Saved:
                                </span>
                                <strong className="text-teal-300">
                                  {a.measure === 'time' ? formatDuration(data.savedUnderBudget) : `${data.savedUnderBudget} ${unitStr}`}
                                </strong>
                              </div>
                            )}
                          </div>

                          <div className="text-[11px] font-bold pt-1 border-t border-slate-800">
                            {data.done ? (
                              <span className="text-emerald-400">
                                {isLimit ? '✓ Under Limit (Success)' : '✓ Goal Completed (Success)'}
                              </span>
                            ) : data.value > 0 && isLimit ? (
                              <span className="text-rose-400">
                                ✕ Exceeded Limit (Goal: {formatGoalText(a)})
                              </span>
                            ) : (
                              <span className="text-slate-400">○ Pending Entry</span>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                {/* Target Goal Reference Line */}
                {a.goal && a.measure !== 'checkbox' && a.measure !== 'time_of_day' && (chartMode === 'all' || chartMode === 'consistency') && (
                  <ReferenceLine
                    y={a.goal}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    label={{
                      value: `Target: ${formatGoalText(a)}`,
                      position: 'insideTopRight',
                      fill: '#f59e0b',
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  />
                )}

                {/* Daily Logged Values Area */}
                {(chartMode === 'all' || chartMode === 'consistency') && (
                  <Area
                    type="monotone"
                    dataKey={a.measure === 'time_of_day' ? 'cumulativeCompletions' : 'value'}
                    name="Daily Logged Value"
                    stroke={habitColor}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorValue)"
                  />
                )}

                {/* 7-Day Moving Average Line (Rendered in 'all' or 'moving_average' mode) */}
                {(chartMode === 'all' || chartMode === 'moving_average') && (
                  <Line
                    type="monotone"
                    dataKey="movingAverage"
                    name="7-Day Moving Avg"
                    stroke="#10b981"
                    strokeWidth={2.8}
                    dot={false}
                    activeDot={{ r: 5, stroke: '#10b981', strokeWidth: 2, fill: '#fff' }}
                  />
                )}

                {/* Cumulative Running Sum Area */}
                {chartMode === 'cumulative' && (
                  <Area
                    type="monotone"
                    dataKey={a.measure === 'time_of_day' ? 'cumulativeCompletions' : 'cumulativeValue'}
                    name="Total Running Sum"
                    stroke="#8b5cf6"
                    strokeWidth={2.5}
                    fillOpacity={0.6}
                    fill="url(#colorValue)"
                  />
                )}

                {/* Budget Saved Area */}
                {chartMode === 'limit_control' && (
                  <Area
                    type="monotone"
                    dataKey="savedUnderBudget"
                    name="Saved Under Budget"
                    stroke="#06b6d4"
                    strokeWidth={2.5}
                    fillOpacity={0.6}
                    fill="url(#colorValue)"
                  />
                )}

                {chartMode === 'all' && (
                  <Legend
                    wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }}
                    iconType="circle"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Danger Zone: Clean Delete Option at the Back */}
        <section className="rounded-3xl border border-rose-200/80 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-rose-900 dark:text-rose-200">
              Delete This Habit
            </h3>
            <p className="text-xs text-rose-700/80 dark:text-rose-400 mt-1 max-w-xl">
              Permanently remove “{a.name}” and all associated history logs from your database.
            </p>
          </div>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="self-start sm:self-auto rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs font-bold shadow-md shadow-rose-600/20 transition active:scale-95"
          >
            Delete Habit
          </button>
        </section>
      </main>

      {/* Edit Modal */}
      {showEditModal && (
        <EditActivityModal
          activity={a}
          activities={allActivities}
          onClose={() => setShowEditModal(false)}
          onSave={handleUpdate}
        />
      )}

      {/* Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => !isDeleting && setShowDeleteModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white">
                Delete "{a.name}"?
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Are you sure you want to delete this habit? All history entries and streaks for this habit will be permanently deleted from MongoDB.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition active:scale-95"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
