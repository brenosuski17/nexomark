const express = require('express');
const router  = express.Router();
const { authMiddleware } = require('../middlewares/auth');
const {
  listBudgets,
  getBudget,
  updateBudget,
  deleteBudget,
  getStats,
} = require('../controllers/budgets');

// Todas as rotas admin requerem autenticação
router.use(authMiddleware);

// GET  /api/admin/budgets          → lista (com filtro ?status=novo&page=1)
// GET  /api/admin/budgets/:id      → detalhe
// PATCH /api/admin/budgets/:id     → atualizar status / nota
// DELETE /api/admin/budgets/:id    → remover

router.get('/budgets',      listBudgets);
router.get('/budgets/:id',  getBudget);
router.patch('/budgets/:id', updateBudget);
router.delete('/budgets/:id', deleteBudget);

// GET /api/admin/stats             → resumo em números
router.get('/stats', getStats);

module.exports = router;
