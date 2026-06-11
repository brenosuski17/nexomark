const express = require('express');
const router  = express.Router();
const { createBudget } = require('../controllers/budgets');

// POST /api/budgets — formulário público da landing page
router.post('/', createBudget);

module.exports = router;
