const BASE_URL = (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : '') + '/api';

export const api = async (path, method = 'GET', body) => {
  const res = await fetch(BASE_URL + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Request failed');
  return res.json();
};

const pad = (n) => String(n).padStart(2, '0');
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const addDays = (n, from = new Date()) => {
  const d = new Date(from);
  d.setDate(d.getDate() + n);
  return d;
};

export const timeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

export const minutesToTime = (totalMinutes) => {
  if (totalMinutes === undefined || totalMinutes === null || isNaN(totalMinutes)) return '';
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${pad(h)}:${pad(m)}`;
};

export const formatTime12h = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) return timeStr || '';
  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  return `${h}:${m} ${ampm}`;
};

export const calculateSleepDuration = (sleepTimeStr, wakeTimeStr) => {
  if (!sleepTimeStr || !wakeTimeStr) return null;
  const sMin = timeToMinutes(sleepTimeStr);
  const wMin = timeToMinutes(wakeTimeStr);

  let diffMinutes = 0;
  if (wMin >= sMin) {
    diffMinutes = wMin - sMin;
  } else {
    // Crosses midnight (e.g., 23:00 to 07:00)
    diffMinutes = (1440 - sMin) + wMin;
  }

  const hours = parseFloat((diffMinutes / 60).toFixed(1));
  const h = Math.floor(diffMinutes / 60);
  const m = diffMinutes % 60;
  const formatted = `${h}h ${m}m`;

  return {
    hours,
    diffMinutes,
    formatted,
    sleepFormatted: formatTime12h(sleepTimeStr),
    wakeFormatted: formatTime12h(wakeTimeStr),
  };
};

export const formatDuration = (totalMinutes) => {
  if (totalMinutes === undefined || totalMinutes === null || isNaN(totalMinutes) || totalMinutes === 0) return '0m';
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

export const parseDurationInput = (str) => {
  if (!str && str !== 0) return 0;
  if (typeof str === 'number') return str;
  const s = String(str).trim().toLowerCase();
  if (!s) return 0;

  // Pure integer e.g. "165" -> 165 mins
  if (/^\d+$/.test(s)) return parseInt(s, 10);

  // Clock format e.g. "2:45"
  if (/^\d{1,2}:\d{1,2}$/.test(s)) {
    const [h, m] = s.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  // Text like "2hr 45min", "2h 45m", "2 hours 45 mins", "2hr and 45 min"
  const hMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)/);
  const mMatch = s.match(/(\d+)\s*(?:m|min|mins|minute|minutes)/);

  let mins = 0;
  if (hMatch) mins += parseFloat(hMatch[1]) * 60;
  if (mMatch) mins += parseInt(mMatch[1], 10);

  if (!hMatch && !mMatch) {
    const num = parseFloat(s);
    return isNaN(num) ? 0 : Math.round(num);
  }

  return Math.round(mins);
};

export const isDone = (a, v, timeStr, sleepTime, wakeTime) => {
  if (!a) return false;

  // Free tracking mode (No strict goal set)
  if (a.hasGoal === false) {
    if (a.measure === 'checkbox') return !!v && v >= 1;
    if (a.measure === 'time_of_day') {
      return (typeof timeStr === 'string' && timeStr.trim().length > 0) || (typeof v === 'number' && v > 0);
    }
    if (a.measure === 'sleep_wake') {
      return (typeof v === 'number' && v > 0) || (!!sleepTime && !!wakeTime);
    }
    const num = typeof v === 'number' ? v : Number(v) || 0;
    return num > 0;
  }

  const isLimit = a.goalOperator === 'lte' || a.habitType === 'negative';

  if (a.measure === 'sleep_wake') {
    if (typeof v === 'number' && v > 0) {
      const target = a.goal !== undefined ? a.goal : 8;
      return isLimit ? v <= target : v >= target;
    }
    return !!(sleepTime && wakeTime);
  }

  if (a.measure === 'time_of_day') {
    if (typeof timeStr === 'string' && timeStr.trim().length > 0) return true;
    if (typeof v === 'string' && v.trim().length > 0) return true;
    return typeof v === 'number' && v > 0;
  }

  if (a.measure === 'checkbox') {
    return !!v && v >= 1;
  }

  const num = typeof v === 'number' ? v : Number(v) || 0;
  const target = a.goal !== undefined ? a.goal : 1;

  if (isLimit) {
    // Negative / Limit habit (e.g. Screen Time <= 2h 30m, coffee <= 2 cups)
    // Success when logged (num > 0) and kept under or at the limit
    return num > 0 ? num <= target : false;
  }

  // Positive target habit (e.g. Solve DSA >= 10, drink >= 8 glasses)
  return num >= target;
};

export const formatGoalText = (a) => {
  if (!a) return '';
  if (a.hasGoal === false) return 'Free Tracking (No Goal)';
  const isLimit = a.goalOperator === 'lte' || a.habitType === 'negative';
  const opSymbol = isLimit ? '≤' : '≥';

  if (a.measure === 'checkbox') {
    return a.habitType === 'negative' ? 'Avoided (Clean Day)' : '1 check/day';
  }
  if (a.measure === 'time') return `${opSymbol} ${formatDuration(a.goal || 30)}`;
  if (a.measure === 'count') return `${opSymbol} ${a.goal || 1} reps`;
  if (a.measure === 'sleep_wake') return `${opSymbol} ${a.goal || 8} hrs`;
  if (a.measure === 'time_of_day') return 'Clock Time';
  return `${opSymbol} ${a.goal}`;
};

export const unit = (a) => {
  if (a.measure === 'time') return 'min';
  if (a.measure === 'count') return 'reps';
  if (a.measure === 'sleep_wake') return 'hrs';
  if (a.measure === 'time_of_day') return '';
  return '';
};

export const getDaysLeft = (targetDateStr) => {
  if (!targetDateStr) return 999999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateOnly = String(targetDateStr).split('T')[0];
  const target = new Date(dateOnly + 'T00:00:00');
  if (isNaN(target.getTime())) return 999999;
  const diffTime = target - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const formatDaysLeft = (targetDateStr, completed = false) => {
  if (completed) return { text: '✓ Completed', status: 'completed', days: 0 };
  if (!targetDateStr) return { text: 'No Deadline', status: 'none', days: 999999 };
  const days = getDaysLeft(targetDateStr);
  if (days < 0) return { text: `⚠️ Overdue (${Math.abs(days)}d ago)`, status: 'overdue', days };
  if (days === 0) return { text: '🚨 Due Today', status: 'today', days: 0 };
  if (days === 1) return { text: '⏳ 1 day left', status: 'urgent', days: 1 };
  if (days <= 3) return { text: `⏳ ${days} days left`, status: 'urgent', days };
  if (days <= 7) return { text: `⏳ ${days} days left`, status: 'approaching', days };
  return { text: `⏳ ${days} days left`, status: 'normal', days };
};

export const getChallengeInfo = (activity) => {
  if (!activity || activity.frequency !== 'challenge') return null;
  const totalDays = activity.challengeDays || 10;
  const startDate = activity.startDate || ymd(new Date());
  const targetDate = activity.date || ymd(addDays(totalDays, new Date(startDate + 'T00:00:00')));
  const daysLeft = getDaysLeft(targetDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate + 'T00:00:00');
  const elapsed = Math.max(0, Math.floor((today - start) / (1000 * 60 * 60 * 24))) + 1;
  const currentDay = Math.min(totalDays, Math.max(1, elapsed));
  const isFinished = daysLeft < 0 || activity.completed;

  return {
    totalDays,
    startDate,
    targetDate,
    daysLeft,
    currentDay,
    isFinished,
    progressPct: Math.min(100, Math.round((currentDay / totalDays) * 100)),
    label: isFinished
      ? (activity.completed ? '✓ Challenge Completed' : '🏁 Challenge Finished')
      : `Day ${currentDay} of ${totalDays} · ${daysLeft === 0 ? 'Due Today' : `${daysLeft}d left`}`,
  };
};

