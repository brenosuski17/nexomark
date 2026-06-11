# NexoMark — Stack Completa

Agência de Marketing Digital · Landing Page + API + Banco de Dados

---

## 🏗️ Arquitetura

```
nexomark/
├── frontend/          ← Landing page (HTML/CSS/JS)
├── backend/           ← API REST (Node.js + Express)
│   └── src/
│       ├── index.js
│       ├── db/init.js
│       ├── controllers/
│       ├── routes/
│       └── middlewares/
├── nginx/             ← Proxy reverso
│   └── nginx.conf
├── db/                ← Scripts SQL
│   └── seed.sql
└── docker-compose.yml
```

### Serviços Docker

| Serviço   | Imagem              | Porta | Função                     |
|-----------|---------------------|-------|----------------------------|
| `db`      | postgres:16-alpine  | 5432  | Banco de dados PostgreSQL  |
| `backend` | node:20-alpine      | 3000* | API REST                   |
| `nginx`   | nginx:1.27-alpine   | 80    | Frontend + proxy /api/     |
| `adminer` | adminer:4           | 8080  | GUI do banco de dados      |

*Porta 3000 só acessível internamente via rede Docker.

---

## 🚀 Como rodar (Docker Desktop)

### Pré-requisitos
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e rodando

### 1. Clonar/abrir o projeto
Abra o terminal na pasta raiz do projeto (`nexomark/`).

### 2. Subir tudo
```bash
docker compose up --build
```

Aguarde aparecer:
```
✅ NexoMark API rodando na porta 3000
🗄️  Banco de dados inicializado com sucesso.
```

### 3. Acessar

| URL                       | O quê                          |
|---------------------------|--------------------------------|
| http://localhost          | Landing page NexoMark          |
| http://localhost/api/health | Healthcheck da API            |
| http://localhost:8080     | Adminer (GUI do banco)         |

### 4. Parar
```bash
docker compose down
```

Para apagar também o banco de dados:
```bash
docker compose down -v
```

---

## 🔌 API — Endpoints

### Público

#### `POST /api/budgets`
Envia um orçamento pelo formulário da landing page.

**Body JSON:**
```json
{
  "nome":     "João Silva",
  "empresa":  "Minha Empresa",
  "email":    "joao@empresa.com",
  "telefone": "(47) 99999-0000",
  "servico":  "Gestão de Redes Sociais",
  "plano":    "Profissional — R$ 1.897/mês",
  "mensagem": "Quero crescer no Instagram."
}
```

**Resposta 201:**
```json
{ "message": "Orçamento recebido! Retornaremos em até 24h.", "id": 1 }
```

---

### Admin (requer autenticação Basic Auth)

> Credenciais padrão: `admin` / `admin123`

#### `GET /api/admin/stats`
Resumo de orçamentos por status.

#### `GET /api/admin/budgets`
Lista todos os orçamentos.
- Query params: `?status=novo&page=1&limit=20`

#### `GET /api/admin/budgets/:id`
Detalhe de um orçamento.

#### `PATCH /api/admin/budgets/:id`
Atualiza status ou nota interna.
```json
{ "status": "em_contato", "nota_interna": "Ligamos, cliente interessado." }
```

Status disponíveis: `novo` · `em_contato` · `proposta_enviada` · `fechado` · `perdido`

#### `DELETE /api/admin/budgets/:id`
Remove um orçamento.

---

### Exemplos com curl

```bash
# Enviar orçamento
curl -X POST http://localhost/api/budgets \
  -H "Content-Type: application/json" \
  -d '{"nome":"Maria","email":"maria@test.com","servico":"Tráfego Pago"}'

# Ver todos os orçamentos (admin)
curl http://localhost/api/admin/budgets \
  -u admin:admin123

# Ver estatísticas
curl http://localhost/api/admin/stats \
  -u admin:admin123

# Atualizar status
curl -X PATCH http://localhost/api/admin/budgets/1 \
  -H "Content-Type: application/json" \
  -u admin:admin123 \
  -d '{"status":"fechado","nota_interna":"Contrato assinado!"}'
```

---

## 🗄️ Adminer (GUI do Banco)

Acesse **http://localhost:8080** e faça login:

| Campo    | Valor      |
|----------|------------|
| Sistema  | PostgreSQL |
| Servidor | db         |
| Usuário  | nexo       |
| Senha    | nexopass   |
| Database | nexomark   |

---

## ⚙️ Variáveis de Ambiente

Edite `backend/.env.example` (ou crie `.env`) para customizar:

```env
PORT=3000
CORS_ORIGIN=http://localhost
DB_HOST=db
DB_PORT=5432
DB_NAME=nexomark
DB_USER=nexo
DB_PASS=nexopass
```

---

## 🔒 Checklist para Produção

- [ ] Trocar senha do banco (`POSTGRES_PASSWORD`)
- [ ] Trocar credenciais admin (ou implementar JWT)
- [ ] Configurar `CORS_ORIGIN` com o domínio real
- [ ] Remover porta `5432` exposta no `docker-compose.yml`
- [ ] Remover o serviço `adminer`
- [ ] Adicionar HTTPS (Certbot/Let's Encrypt)
- [ ] Usar bcrypt para hash de senhas admin

---

## 🧱 Banco de Dados — Tabela `budgets`

| Coluna        | Tipo         | Descrição                        |
|---------------|--------------|----------------------------------|
| id            | SERIAL PK    | ID automático                    |
| nome          | VARCHAR(120) | Nome do lead                     |
| empresa       | VARCHAR(120) | Empresa (opcional)               |
| email         | VARCHAR(180) | E-mail                           |
| telefone      | VARCHAR(30)  | WhatsApp (opcional)              |
| servico       | VARCHAR(100) | Serviço de interesse             |
| plano         | VARCHAR(80)  | Plano escolhido (opcional)       |
| mensagem      | TEXT         | Mensagem livre                   |
| status        | VARCHAR(30)  | Funil de vendas                  |
| nota_interna  | TEXT         | Notas da equipe (não visível)    |
| created_at    | TIMESTAMPTZ  | Data de criação                  |
| updated_at    | TIMESTAMPTZ  | Atualizado automaticamente       |
