# ── Build stage ───────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev

# ── Runtime stage ──────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Usuário não-root por segurança
RUN addgroup -S nexo && adduser -S nexo -G nexo

COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY package.json ./

RUN chown -R nexo:nexo /app
USER nexo

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "src/index.js"]
