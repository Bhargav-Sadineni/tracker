const router = require('express').Router();
const controller = require('../controllers/entriesController');

router.get('/', controller.getEntries);
router.put('/', controller.upsertEntry);

module.exports = router;
