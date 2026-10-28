const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema(
  {
    date: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    type: {
      type: String,
      enum: ['spend', 'income'],
      default: 'spend',
      index: true,
    },
    why: {
      type: String,
      required: true,
      trim: true, // e.g. 'nana', 'print', 'food', 'rent'
    },
    category: {
      type: String,
      default: 'General',
      trim: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Expense', ExpenseSchema);
