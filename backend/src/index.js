require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const budgetRoutes = require('./routes/budgets');
const adminRoutes  = require('./routes/admin');
const { initDB }   = require('./db/init');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Segurança ──────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
}));

// Rate limit global
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  message: { error: 'Muitas requisições. Tente novamente em 15 minutos.' },
}));

// Rate limit específico para envio de orçamentos
const budgetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1h
  max: 5,
  message: { error: 'Limite de envios atingido. Tente em 1 hora.' },
});

app.use(express.json());

// ── Healthcheck ────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Rotas ──────────────────────────────────────────────
app.use('/api/budgets', budgetLimiter, budgetRoutes);
app.use('/api/admin',  adminRoutes);

// ── 404 ────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});

// ── Error handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(err.status || 500).json({ error: err.message || 'Erro interno.' });
});

// ── Inicialização ──────────────────────────────────────
(async () => {
  try {
    await initDB();
    app.listen(PORT, () => {
      console.log(`✅ NexoMark API rodando na porta ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Falha ao iniciar:', err);
    process.exit(1);
  }
})();
module.exports = app;
