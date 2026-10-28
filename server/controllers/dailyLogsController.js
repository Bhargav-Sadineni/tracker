const DailyLog = require('../models/DailyLog');

exports.getAllLogs = async (req, res, next) => {
  try {
    const { month, startDate, endDate, search, tag, mood } = req.query;
    const filter = {};

    if (month) {
      filter.date = { $regex: `^${month}` };
    } else if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    }

    if (tag) {
      filter.tags = tag;
    }

    if (mood) {
      filter.mood = mood;
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { content: { $regex: q, $options: 'i' } },
        { highlights: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } },
      ];
    }

    const logs = await DailyLog.find(filter).sort({ date: -1 });
    res.json(logs);
  } catch (err) {
    next(err);
  }
};

exports.getLogByDate = async (req, res, next) => {
  try {
    const { date } = req.params;
    const log = await DailyLog.findOne({ date });
    res.json(log || null);
  } catch (err) {
    next(err);
  }
};

exports.upsertLog = async (req, res, next) => {
  try {
    const date = req.params.date || req.body.date;
    if (!date) {
      return res.status(400).json({ error: 'Date is required (YYYY-MM-DD)' });
    }

    const {
      title = '',
      content = '',
      highlights = [],
      mood = '😊',
      rating = 3,
      tags = [],
    } = req.body;

    const cleanRating = Math.max(1, Math.min(5, Number(rating) || 3));
    const cleanHighlights = Array.isArray(highlights)
      ? highlights.map((h) => String(h).trim()).filter(Boolean)
      : [];
    const cleanTags = Array.isArray(tags)
      ? tags.map((t) => String(t).trim()).filter(Boolean)
      : [];

    const updated = await DailyLog.findOneAndUpdate(
      { date },
      {
        $set: {
          date,
          title: String(title).trim(),
          content: String(content),
          highlights: cleanHighlights,
          mood: String(mood || '😊'),
          rating: cleanRating,
          tags: cleanTags,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
};

exports.deleteLog = async (req, res, next) => {
  try {
    const { date } = req.params;
    // can delete by date or ID
    const deleted = await DailyLog.findOneAndDelete({
      $or: [{ date }, { _id: date.match(/^[0-9a-fA-F]{24}$/) ? date : null }],
    });
    res.json({ ok: true, deleted: !!deleted });
  } catch (err) {
    next(err);
  }
};
