process.env.ADMIN_USER = 'admin';
process.env.ADMIN_PASS = 'admin123';

jest.mock('express-rate-limit', () => {
  const fn = () => (req, res, next) => next();
  fn.default = fn;
  return fn;
});

jest.mock('../src/db/init', () => ({
  pool: { query: jest.fn() },
  initDB: jest.fn().mockResolvedValue(true),
}));

jest.mock('../src/middlewares/auth', () => ({
  authMiddleware: (req, res, next) => {
    const auth = req.headers['authorization'];
    if (!auth) return res.status(401).json({ error: 'Autenticação necessária.' });
    const decoded = Buffer.from(auth.replace('Basic ', ''), 'base64').toString();
    const [user, pass] = decoded.split(':');
    if (user === 'admin' && pass === 'admin123') return next();
    return res.status(401).json({ error: 'Credenciais inválidas.' });
  }
}));

const request = require('supertest');
const { pool } = require('../src/db/init');
const app = require('../src/index');

beforeEach(() => jest.clearAllMocks());

describe('GET /health', () => {
  test('deve retornar status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });
});

describe('POST /api/budgets', () => {
  test('deve criar orçamento com dados válidos e retornar 201', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const res = await request(app).post('/api/budgets').send({ nome: 'João Silva', email: 'joao@empresa.com', servico: 'Tráfego Pago' });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id', 1);
  });

  test('deve retornar 400 quando email é inválido', async () => {
    const res = await request(app).post('/api/budgets').send({ nome: 'João', email: 'email-invalido', servico: 'SEO' });
    expect(res.statusCode).toBe(400);
  });

  test('deve retornar 400 quando nome está vazio', async () => {
    const res = await request(app).post('/api/budgets').send({ nome: '', email: 'joao@teste.com', servico: 'SEO' });
    expect(res.statusCode).toBe(400);
  });

  test('deve retornar 400 quando serviço está ausente', async () => {
    const res = await request(app).post('/api/budgets').send({ nome: 'João', email: 'joao@teste.com' });
    expect(res.statusCode).toBe(400);
  });
});

describe('GET /api/admin/budgets', () => {
  test('deve retornar 401 sem autenticação', async () => {
    const res = await request(app).get('/api/admin/budgets');
    expect(res.statusCode).toBe(401);
  });

  test('deve retornar 401 com senha errada', async () => {
    const res = await request(app).get('/api/admin/budgets').auth('admin', 'errada');
    expect(res.statusCode).toBe(401);
  });

  test('deve listar orçamentos com autenticação correta', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, nome: 'João', email: 'joao@teste.com', servico: 'SEO', status: 'novo', created_at: new Date() }] });
    const res = await request(app).get('/api/admin/budgets').auth('admin', 'admin123');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('data');
  });
});

describe('GET /api/admin/budgets/:id', () => {
  test('deve retornar orçamento existente', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, nome: 'João', email: 'joao@teste.com', servico: 'SEO', status: 'novo', created_at: new Date() }] });
    const res = await request(app).get('/api/admin/budgets/1').auth('admin', 'admin123');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('id', 1);
  });

  test('deve retornar 404 para orçamento inexistente', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/admin/budgets/999').auth('admin', 'admin123');
    expect(res.statusCode).toBe(404);
  });
});

describe('PATCH /api/admin/budgets/:id', () => {
  test('deve atualizar status com sucesso', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, status: 'em_contato', created_at: new Date() }] });
    const res = await request(app).patch('/api/admin/budgets/1').auth('admin', 'admin123').send({ status: 'em_contato' });
    expect(res.statusCode).toBe(200);
  });

  test('deve retornar 400 para status inválido', async () => {
    const res = await request(app).patch('/api/admin/budgets/1').auth('admin', 'admin123').send({ status: 'invalido' });
    expect(res.statusCode).toBe(400);
  });

  test('deve retornar 400 sem body', async () => {
    const res = await request(app).patch('/api/admin/budgets/1').auth('admin', 'admin123').send({});
    expect(res.statusCode).toBe(400);
  });
});

describe('DELETE /api/admin/budgets/:id', () => {
  test('deve deletar orçamento existente', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const res = await request(app).delete('/api/admin/budgets/1').auth('admin', 'admin123');
    expect(res.statusCode).toBe(200);
  });

  test('deve retornar 404 para orçamento inexistente', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).delete('/api/admin/budgets/999').auth('admin', 'admin123');
    expect(res.statusCode).toBe(404);
  });
});

describe('GET /api/admin/stats', () => {
  test('deve retornar estatísticas', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ total: '5', novos: '3', em_contato: '1', proposta_enviada: '0', fechados: '1', perdidos: '0', ultimos_7_dias: '2' }] });
    const res = await request(app).get('/api/admin/stats').auth('admin', 'admin123');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('total');
  });

  test('deve retornar 401 sem autenticação', async () => {
    const res = await request(app).get('/api/admin/stats');
    expect(res.statusCode).toBe(401);
  });
});
