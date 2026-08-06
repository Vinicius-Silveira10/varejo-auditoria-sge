# ==========================================
# Stage 1: Dependências
# ==========================================
FROM node:20-alpine AS deps
# libc6-compat é recomendado para o SWC do Next.js no Alpine
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ==========================================
# Stage 2: Builder
# ==========================================
FROM node:20-alpine AS builder
WORKDIR /app

# -----------------------------------------------------------------------------
# DOCUMENTAÇÃO OPERACIONAL (Conforme Raio-X)
# -----------------------------------------------------------------------------
# NEXT_PUBLIC_API_URL é recebida como ARG (build-time).
# O Next.js injeta esse valor estaticamente no bundle HTML/JS durante o build.
#
# COMO TROCAR A URL DE API ENTRE AMBIENTES?
# É necessário REBUILDAR a imagem passando a nova URL:
#   docker build --build-arg NEXT_PUBLIC_API_URL=https://api.staging.fortal.com .
#
# (Backlog): Se a necessidade de rebuildar for um impeditivo operacional,
# a equipe deve avaliar a migração para `runtimeConfig` nativo do Next.js
# em sprints futuras, abandonando o prefixo NEXT_PUBLIC_.
# -----------------------------------------------------------------------------
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# ==========================================
# Stage 3: Runtime
# ==========================================
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

# Copiar apenas os assets essenciais
COPY --from=builder /app/public ./public

# Configurar permissões para o cache interno do Next
RUN mkdir .next && chown nextjs:nodejs .next

# Copiar a saída "standalone" gerada (configurada no next.config.ts)
# Este diretório inclui dependências mínimas e um server.js leve.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# Executar o server standalone do Next.js
CMD ["node", "server.js"]
