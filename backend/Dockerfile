# ==========================================
# Stage 1: Builder
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar openssl no builder — necessario para prisma generate selecionar
# o binaryTarget correto (linux-musl-openssl-3.0.x) em vez de linux-musl plain.
RUN apk add --no-cache openssl

# 1. Instalar todas as dependencias (incluindo devDependencies) para o build
COPY package.json package-lock.json ./
RUN npm ci

# 2. Copiar o schema do Prisma e gerar o cliente
COPY prisma ./prisma/
RUN npx prisma generate

# 3. Copiar o codigo-fonte e compilar
COPY . .
RUN npm run build

# 4. Remover devDependencies para o stage de runtime
# npm prune e mais seguro que npm ci --omit=dev pois nao apaga o cliente Prisma ja gerado
RUN npm prune --omit=dev && npm cache clean --force

# ==========================================
# Stage 2: Runtime
# ==========================================
FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

# openssl: obrigatorio para o Prisma CLI (prisma migrate deploy) no Alpine.
# Sem ele: 'Prisma failed to detect the libssl version' e o migrate falha.
RUN apk add --no-cache openssl

# Criar usuario non-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

# Copiar artefatos de producao (sem devDependencies)
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./

# Gerar entrypoint sem dependencia de line endings do Windows (inline via printf).
#
# RUNBOOK DE STAGING / PRODUÇÃO:
#   1. prisma migrate deploy  -- aplica migrations pendentes (idempotente, seguro re-executar)
#   2. node dist/src/main     -- inicia o servidor NestJS
#
# Atenção — o fail-loud protege contra boot inseguro da API, mas NÃO impede 
# migrations de rodarem contra qualquer banco apontado por DATABASE_URL, mesmo que
# outras variáveis críticas estejam ausentes. Sempre confirme o DATABASE_URL antes 
# de subir qualquer ambiente.
#
# SEED (Execução Segura pós-boot):
# O seed.ts já é compilado nativamente pelo processo de build do NestJS.
# Em produção, como o ts-node é removido, o script de seed PODE e DEVE ser 
# executado invocando o arquivo JavaScript compilado no dist.
# Para injetar o administrador inicial após subir o Staging, execute UMA VEZ:
#   docker exec -it sge_backend_staging node dist/prisma/seed.js
# Alternativa recomendada: criar uma migration SQL com os dados iniciais.
RUN printf '#!/bin/sh\nset -e\necho "[entrypoint] Aplicando migrations..."\nnpx prisma migrate deploy\necho "[entrypoint] Iniciando NestJS..."\nexec node dist/src/main\n' > ./entrypoint.sh && chmod +x ./entrypoint.sh

USER nestjs

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
