const Expense = require('../models/Expense');

exports.getAllExpenses = async (req, res, next) => {
  try {
    const { month, date, startDate, endDate, type } = req.query;
    const filter = {};

    if (date) {
      filter.date = date;
    } else if (month) {
      // Matches 'YYYY-MM' prefix e.g. '2026-10'
      filter.date = { $regex: `^${month}` };
    } else if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    }

    if (type) {
      filter.type = type;
    }

    const expenses = await Expense.find(filter).sort({ date: -1, createdAt: -1 });
    res.json(expenses);
  } catch (err) {
    next(err);
  }
};

exports.createExpense = async (req, res, next) => {
  try {
    const { date, amount, type, why, category, notes } = req.body;
    if (!date || amount === undefined || !why) {
      return res.status(400).json({ error: 'date, amount, and why are required' });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      return res.status(400).json({ error: 'amount must be a non-negative number' });
    }

    const expense = await Expense.create({
      date,
      amount: numAmount,
      type: type === 'income' ? 'income' : 'spend',
      why: String(why).trim(),
      category: category ? String(category).trim() : 'General',
      notes: notes ? String(notes).trim() : '',
    });

    res.status(201).json(expense);
  } catch (err) {
    next(err);
  }
};

exports.updateExpense = async (req, res, next) => {
  try {
    const updateData = { ...req.body };
    if (updateData.amount !== undefined) {
      updateData.amount = Number(updateData.amount) || 0;
    }

    const expense = await Expense.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json(expense);
  } catch (err) {
    next(err);
  }
};

exports.deleteExpense = async (req, res, next) => {
  try {
    await Expense.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};
