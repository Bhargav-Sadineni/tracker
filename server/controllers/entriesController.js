const Entry = require('../models/Entry');

function parseTimeToMinutes(t) {
  if (!t || typeof t !== 'string' || !t.includes(':')) return 0;
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function calculateSleepHours(sleepTime, wakeTime) {
  if (!sleepTime || !wakeTime) return 0;
  const sM = parseTimeToMinutes(sleepTime);
  const wM = parseTimeToMinutes(wakeTime);
  let diff = wM - sM;
  if (diff < 0) diff += 1440;
  return Math.round((diff / 60) * 10) / 10;
}

exports.getEntries = async (req, res, next) => {
  try {
    const q = {};
    if (req.query.activity) q.activity = req.query.activity;
    if (req.query.from || req.query.to) {
      q.date = {
        ...(req.query.from && { $gte: req.query.from }),
        ...(req.query.to && { $lte: req.query.to }),
      };
    }
    const entries = await Entry.find(q);
    res.json(entries);
  } catch (err) {
    next(err);
  }
};

exports.upsertEntry = async (req, res, next) => {
  try {
    const { activity, date, value, timeStr, sleepTime, wakeTime } = req.body;

    const hasSleepWake = (sleepTime && sleepTime.trim() !== '') || (wakeTime && wakeTime.trim() !== '');
    const hasValue = value !== undefined && value !== null && value !== 0 && value !== '';
    const hasTimeStr = timeStr && timeStr.trim() !== '';

    // If completely empty, remove entry
    if (!hasValue && !hasTimeStr && !hasSleepWake) {
      await Entry.deleteOne({ activity, date });
      return res.json({ activity, date, value: 0, timeStr: '', sleepTime: '', wakeTime: '' });
    }

    let calculatedValue = value;
    if (calculatedValue === undefined || calculatedValue === null) {
      if (sleepTime && wakeTime) {
        calculatedValue = calculateSleepHours(sleepTime, wakeTime);
      } else if (timeStr) {
        calculatedValue = parseTimeToMinutes(timeStr);
      } else {
        calculatedValue = 0;
      }
    }

    const entry = await Entry.findOneAndUpdate(
      { activity, date },
      {
        value: calculatedValue,
        timeStr: timeStr || '',
        sleepTime: sleepTime || '',
        wakeTime: wakeTime || '',
      },
      { upsert: true, new: true }
    );
    res.json(entry);
  } catch (err) {
    next(err);
  }
};
