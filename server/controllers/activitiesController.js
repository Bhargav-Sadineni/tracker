const Activity = require('../models/Activity');
const Entry = require('../models/Entry');

exports.getAllActivities = async (req, res, next) => {
  try {
    const activities = await Activity.find().sort({ createdAt: 1 });
    res.json(activities);
  } catch (err) {
    next(err);
  }
};

exports.createActivity = async (req, res, next) => {
  try {
    const activity = await Activity.create(req.body);
    res.status(201).json(activity);
  } catch (err) {
    next(err);
  }
};

exports.updateActivity = async (req, res, next) => {
  try {
    const activity = await Activity.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(activity);
  } catch (err) {
    next(err);
  }
};

exports.deleteActivity = async (req, res, next) => {
  try {
    await Entry.deleteMany({ activity: req.params.id });
    await Activity.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};
