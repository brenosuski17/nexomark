const { pool } = require('../db/init');
const Joi = require('joi');

// ── Validação do formulário público ────────────────────────────────────────
const budgetSchema = Joi.object({
  nome:     Joi.string().max(120).required(),
  empresa:  Joi.string().max(120).allow('', null),
  email:    Joi.string().email().max(180).required(),
  telefone: Joi.string().max(30).allow('', null),
  servico:  Joi.string().max(100).required(),
  plano:    Joi.string().max(80).allow('', null),
  mensagem: Joi.string().max(2000).allow('', null),
});

// Status válidos para o funil de vendas
const STATUS_VALIDOS = ['novo', 'em_contato', 'proposta_enviada', 'fechado', 'perdido'];

// ────────────────────────────────────────────────────────────────────────────
// PÚBLICO — POST /api/budgets
// ────────────────────────────────────────────────────────────────────────────
async function createBudget(req, res, next) {
  try {
    // Valida os dados recebidos
    const { error, value } = budgetSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        error: 'Dados inválidos.',
        detalhes: error.details.map(d => d.message),
      });
    }

    const { nome, empresa, email, telefone, servico, plano, mensagem } = value;

    const result = await pool.query(
      `INSERT INTO budgets (nome, empresa, email, telefone, servico, plano, mensagem)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id`,
      [nome, empresa || null, email, telefone || null, servico, plano || null, mensagem || null]
    );

    return res.status(201).json({
      message: 'Orçamento recebido! Retornaremos em até 24h.',
      id: result.rows[0].id,
    });
  } catch (err) {
    next(err);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// ADMIN — GET /api/admin/budgets
// Lista com filtro por status e paginação
// ────────────────────────────────────────────────────────────────────────────
async function listBudgets(req, res, next) {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const { status } = req.query;

    // Monta filtro dinâmico
    const conditions = [];
    const params = [];

    if (status && STATUS_VALIDOS.includes(status)) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Busca total para calcular páginas
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM budgets ${where}`, params
    );
    const total = parseInt(countResult.rows[0].count);

    // Busca os registros da página
    params.push(limit, offset);
    const result = await pool.query(
      `SELECT id, nome, empresa, email, telefone, servico, plano, status, created_at
       FROM budgets
       ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return res.json({
      data: result.rows,
      paginacao: {
        total,
        pagina: page,
        por_pagina: limit,
        total_paginas: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// ADMIN — GET /api/admin/budgets/:id
// ────────────────────────────────────────────────────────────────────────────
async function getBudget(req, res, next) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM budgets WHERE id = $1', [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Orçamento não encontrado.' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// ADMIN — PATCH /api/admin/budgets/:id
// Atualiza status e/ou nota interna
// ────────────────────────────────────────────────────────────────────────────
async function updateBudget(req, res, next) {
  try {
    const { id } = req.params;
    const { status, nota_interna } = req.body;

    // Pelo menos um campo precisa ser enviado
    if (status === undefined && nota_interna === undefined) {
      return res.status(400).json({ error: 'Envie status e/ou nota_interna.' });
    }

    // Valida o status
    if (status && !STATUS_VALIDOS.includes(status)) {
      return res.status(400).json({
        error: `Status inválido. Use: ${STATUS_VALIDOS.join(', ')}.`,
      });
    }

    // Monta UPDATE dinâmico (só atualiza o que foi enviado)
    const fields = [];
    const params = [];

    if (status !== undefined) {
      params.push(status);
      fields.push(`status = $${params.length}`);
    }
    if (nota_interna !== undefined) {
      params.push(nota_interna);
      fields.push(`nota_interna = $${params.length}`);
    }

    params.push(id);
    const result = await pool.query(
      `UPDATE budgets SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Orçamento não encontrado.' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// ADMIN — DELETE /api/admin/budgets/:id
// ────────────────────────────────────────────────────────────────────────────
async function deleteBudget(req, res, next) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM budgets WHERE id = $1 RETURNING id', [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Orçamento não encontrado.' });
    }

    return res.json({ message: 'Orçamento removido com sucesso.', id: result.rows[0].id });
  } catch (err) {
    next(err);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// ADMIN — GET /api/admin/stats
// Resumo de orçamentos por status
// ────────────────────────────────────────────────────────────────────────────
async function getStats(req, res, next) {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*)                                        AS total,
        COUNT(*) FILTER (WHERE status = 'novo')         AS novos,
        COUNT(*) FILTER (WHERE status = 'em_contato')   AS em_contato,
        COUNT(*) FILTER (WHERE status = 'proposta_enviada') AS proposta_enviada,
        COUNT(*) FILTER (WHERE status = 'fechado')      AS fechados,
        COUNT(*) FILTER (WHERE status = 'perdido')      AS perdidos,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS ultimos_7_dias
      FROM budgets
    `);

    return res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

module.exports = { createBudget, listBudgets, getBudget, updateBudget, deleteBudget, getStats };
