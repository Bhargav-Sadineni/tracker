const router = require('express').Router();
const controller = require('../controllers/expensesController');

router.get('/', controller.getAllExpenses);
router.post('/', controller.createExpense);
router.put('/:id', controller.updateExpense);
router.delete('/:id', controller.deleteExpense);

module.exports = router;
