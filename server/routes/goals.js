const router = require('express').Router();
const controller = require('../controllers/goalsController');

router.get('/', controller.getAllGoals);
router.post('/', controller.createGoal);
router.put('/:id', controller.updateGoal);
router.delete('/:id', controller.deleteGoal);

module.exports = router;
