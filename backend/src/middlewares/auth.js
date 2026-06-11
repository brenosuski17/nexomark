const { pool } = require('../db/init');

/**
 * Autenticação Basic simples para o painel admin.
 * Em produção substitua por JWT.
 */
async function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({ error: 'Autenticação necessária.' });
  }

  try {
    const base64 = authHeader.slice(6);
    const decoded = Buffer.from(base64, 'base64').toString('utf-8');
    const [username, password] = decoded.split(':');

    const result = await pool.query(
      'SELECT id FROM admin_users WHERE username=$1 AND password=$2',
      [username, password]
    );

    if (!result.rows.length) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    req.adminId = result.rows[0].id;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { authMiddleware };
