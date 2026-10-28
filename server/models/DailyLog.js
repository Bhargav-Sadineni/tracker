const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    date: { type: String, required: true, unique: true }, // YYYY-MM-DD
    title: { type: String, default: '' },
    content: { type: String, default: '' },
    highlights: [{ type: String }],
    mood: { type: String, default: '😊' },
    rating: { type: Number, min: 1, max: 5, default: 3 },
    tags: [{ type: String }],
  },
  {
    timestamps: true,
  }
);

schema.index({ date: -1 });

module.exports = mongoose.model('DailyLog', schema);
