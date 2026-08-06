# ==========================================
# Stage 1: Builder
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# 1. Instalar TODAS as dependências (incluindo devDependencies) para o build
COPY package.json package-lock.json ./
RUN npm ci

# 2. Copiar o schema do Prisma e gerar o cliente
COPY prisma ./prisma/
RUN npx prisma generate

# 3. Copiar o código-fonte e compilar
COPY . .
RUN npm run build

# 4. Remover devDependencies para enxugar o node_modules que vai para runtime
# Utilizamos npm prune --omit=dev em vez de npm ci --omit=dev para não apagar o cliente Prisma já gerado
RUN npm prune --omit=dev && npm cache clean --force

# ==========================================
# Stage 2: Runtime
# ==========================================
FROM node:20-alpine AS runtime

WORKDIR /app

# Definir como ambiente de produção
ENV NODE_ENV=production

# Criar usuário non-root por segurança (não rodar processo como root)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

# Copiar artefatos do stage anterior (com ownership correto)
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./

# Trocar para o usuário non-root
USER nestjs

# Expor porta padrão do NestJS
EXPOSE 3000

# Iniciar o servidor
CMD ["node", "dist/src/main"]
