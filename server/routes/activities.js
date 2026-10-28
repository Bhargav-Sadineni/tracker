const router = require('express').Router();
const controller = require('../controllers/activitiesController');

router.get('/', controller.getAllActivities);
router.post('/', controller.createActivity);
router.put('/:id', controller.updateActivity);
router.delete('/:id', controller.deleteActivity);

module.exports = router;
