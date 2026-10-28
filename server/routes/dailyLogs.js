const express = require('express');
const router = express.Router();
const controller = require('../controllers/dailyLogsController');

router.get('/', controller.getAllLogs);
router.get('/:date', controller.getLogByDate);
router.put('/:date', controller.upsertLog);
router.post('/', controller.upsertLog);
router.delete('/:date', controller.deleteLog);

module.exports = router;
