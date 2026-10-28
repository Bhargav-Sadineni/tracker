const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  activity: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', required: true },
  date: { type: String, required: true },                      // YYYY-MM-DD
  value: { type: Number, default: 0 },                         // 1 for tick, minutes for time, reps for count, hours for sleep
  timeStr: { type: String, default: '' },
  sleepTime: { type: String, default: '' },                    // e.g. "23:00"
  wakeTime: { type: String, default: '' },                     // e.g. "07:00"
});

schema.index({ activity: 1, date: 1 }, { unique: true });
module.exports = mongoose.model('Entry', schema);
