const mongoose = require('mongoose');

const MilestoneSchema = new mongoose.Schema({
  title: { type: String, required: true },
  done: { type: Boolean, default: false },
});

const GoalSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  category: { type: String, default: 'General' },
  color: { type: String, default: '#6366f1' },
  targetDate: { type: String, required: true }, // YYYY-MM-DD deadline or reminder date
  time: { type: String, default: '' },          // e.g. '18:00' or '10:30 AM' for OAs, tests, interviews
  link: { type: String, default: '' },          // optional URL or platform (e.g. HackerRank / Google Meet)
  kind: { type: String, enum: ['goal', 'reminder'], default: 'goal' }, // 'goal' or 'reminder'
  currentValue: { type: Number, default: 0 },
  targetValue: { type: Number, default: 100 },
  unit: { type: String, default: 'tasks' },      // e.g. 'problems', 'pages', 'kg', 'hours', 'reps', '%'
  completed: { type: Boolean, default: false },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  milestones: [MilestoneSchema],
}, { timestamps: true });

module.exports = mongoose.model('Goal', GoalSchema);
