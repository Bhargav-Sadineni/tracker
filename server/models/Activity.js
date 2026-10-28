const mongoose = require('mongoose');

module.exports = mongoose.model('Activity', new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  habitType: { type: String, enum: ['positive', 'negative'], default: 'positive' },
  hasGoal: { type: Boolean, default: true },
  frequency: { type: String, enum: ['daily', 'specific', 'challenge'], default: 'daily' },
  analyticsOption: { type: String, default: null },
  challengeDays: { type: Number, default: null },             // e.g. 10 for a 10-day habit
  startDate: { type: String, default: null },                 // YYYY-MM-DD when challenge started
  date: { type: String, default: null },                       // YYYY-MM-DD target date / deadline (e.g. EMI or challenge end)
  measure: { type: String, enum: ['checkbox', 'time', 'count', 'time_of_day', 'sleep_wake'], default: 'checkbox' },
  goal: { type: Number, default: 1 },                          // target (e.g. 8 for sleep hours, 150 for 2h30m time, 10 for count)
  goalOperator: { type: String, enum: ['gte', 'lte'], default: 'gte' }, // 'gte' = at least (>=), 'lte' = at most (<=)
  color: { type: String, default: '#6366f1' },                 // vibrant accent color
  category: { type: String, default: 'General' },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date, default: null },
  linkedActivity: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', default: null },
}, { timestamps: true }));
