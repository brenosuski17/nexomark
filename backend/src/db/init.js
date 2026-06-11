const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'db',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'nexomark',
  user:     process.env.DB_USER     || 'nexo',
  password: process.env.DB_PASS     || 'nexopass',
});

/**
 * Cria as tabelas se não existirem
 */
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS budgets (
        id           SERIAL PRIMARY KEY,
        nome         VARCHAR(120)  NOT NULL,
        empresa      VARCHAR(120),
        email        VARCHAR(180)  NOT NULL,
        telefone     VARCHAR(30),
        servico      VARCHAR(100)  NOT NULL,
        plano        VARCHAR(80),
        mensagem     TEXT,
        status       VARCHAR(30)   NOT NULL DEFAULT 'novo',
        -- 'novo' | 'em_contato' | 'proposta_enviada' | 'fechado' | 'perdido'
        nota_interna TEXT,
        created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS admin_users (
        id         SERIAL PRIMARY KEY,
        username   VARCHAR(60)  UNIQUE NOT NULL,
        password   VARCHAR(255) NOT NULL,  -- bcrypt hash em prod
        created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );

      -- Trigger para updated_at automático
      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_budgets_updated ON budgets;
      CREATE TRIGGER trg_budgets_updated
        BEFORE UPDATE ON budgets
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    `);

    // Seed: admin padrão (senha: admin123 — troque em produção!)
    await client.query(`
      INSERT INTO admin_users (username, password)
      VALUES ('admin', 'admin123')
      ON CONFLICT (username) DO NOTHING;
    `);

    console.log('🗄️  Banco de dados inicializado com sucesso.');
  } finally {
    client.release();
  }
}

module.exports = { pool, initDB };
