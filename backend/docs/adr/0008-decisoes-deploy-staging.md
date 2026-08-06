# ADR 0008: Decisões de Deploy para Ambiente de Staging

## Status

Aceito

## Contexto

O raio-X de prontidão para staging (06/08/2026) identificou três pontos de
ambiguidade que precisavam de decisão consciente antes da criação dos Dockerfiles
e da configuração de infraestrutura:

1. **Concorrência / ChainPointer:** o mecanismo de integridade de cadeia de hash
   (BUG-007, ADR-005) usa locks pessimistas a nível de banco (`SELECT FOR UPDATE`).
   A questão era: staging vai rodar com uma ou múltiplas réplicas do backend?

2. **WebSocket (DashboardGateway):** o socket.io do backend precisa de configuração
   específica quando atrás de um proxy reverso (headers de upgrade HTTP/1.1).
   A questão era: qual proxy será usado e como ele deve ser configurado?

3. **Senha do Seed:** o `prisma/seed.ts` original usava a senha hardcoded
   `'SenhaSegura123!'` para todos os ambientes, incluindo staging. Isso significa
   que qualquer ambiente que roda o seed cria um usuário ADMIN com senha conhecida
   e versionada publicamente, o que é inaceitável fora de desenvolvimento local.

---

## Decisão 1 — Concorrência: Instância Única em Staging

**Staging roda como instância única do backend NestJS**, sem múltiplas réplicas.

### Justificativa

- O lock de integridade do ChainPointer já funciona a nível de banco
  (`FOR UPDATE`), o que tecnicamente seria seguro sob múltiplas réplicas.
  Contudo, esse cenário **nunca foi testado** com N processos distintos
  apontando para o mesmo banco.
- O volume operacional de um CD (Centro de Distribuição) com uma equipe
  pequena não justifica a complexidade de escala horizontal neste momento.
- Instância única elimina a necessidade de sticky sessions para o WebSocket,
  simplificando a configuração de proxy.

### Consequências

- A configuração de nginx não precisa de sticky sessions.
- A decisão deve ser revisitada se o volume real de uso exigir escala.
- Para produção com múltiplas réplicas, um teste de carga específico
  deve ser executado antes do deploy, validando o ChainPointer sob
  concorrência de processos distintos.

---

## Decisão 2 — WebSocket: Nginx com Upgrade de Protocolo

**Nginx é o proxy reverso de referência para staging**, configurado com
upgrade de protocolo HTTP/1.1 para suportar o `DashboardGateway` (socket.io).

### Configuração mínima obrigatória

```nginx
# Bloco upstream do backend
upstream backend {
    server backend:3000;
}

server {
    listen 80;

    # Rota da API REST e WebSocket — ambos no mesmo processo NestJS
    location /socket.io/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;                    # obrigatório para WebSocket
        proxy_set_header Upgrade $http_upgrade;    # header de upgrade do protocolo
        proxy_set_header Connection "upgrade";     # mantém a conexão aberta
        proxy_set_header Host $host;
    }

    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Justificativa

- Sem `proxy_http_version 1.1` e os headers `Upgrade`/`Connection`,
  o Nginx faz downgrade para HTTP/1.0, que não suporta conexões
  persistentes — o WebSocket nunca estabelece handshake.
- Como há apenas uma instância backend, sticky sessions não são necessárias.
- A configuração completa de referência está em `deploy/nginx.conf.example`.

### Consequências

- Todo ambiente de staging que não usar Nginx precisa garantir os
  mesmos headers de upgrade no proxy escolhido (Caddy, Traefik, etc.).
- O arquivo `deploy/nginx.conf.example` é a fonte de verdade para a
  configuração de proxy — não deve ser commitado como configuração ativa.

---

## Decisão 3 — Senha do Seed: Comportamento Diferenciado por Ambiente

**O script `prisma/seed.ts` tem comportamento diferenciado por `NODE_ENV`:**

| Ambiente | `NODE_ENV` | Comportamento |
|---|---|---|
| Desenvolvimento | `development` ou ausente | Usa senha padrão `'SenhaSegura123!'` com `console.warn()` explícito alertando que é insegura |
| Staging / Produção | qualquer outro valor | Lê `SEED_ADMIN_PASSWORD` do ambiente; **falha explicitamente** se ausente (fail-loud) |

### Justificativa

- A senha `'SenhaSegura123!'` estava hardcoded no `seed.ts` versionado,
  o que significa que qualquer pessoa com acesso ao repositório conhece
  a senha do ADMIN em qualquer ambiente que executasse o seed sem sobrescrever.
- O padrão `fail-loud` já implementado para `JWT_SECRET` e `DATABASE_URL`
  em `src/config/env.validation.ts` deve ser aplicado consistentemente
  ao seed para ambientes além do desenvolvimento.
- Em desenvolvimento, a conveniência supera o risco — o banco é local
  e não contém dados reais.

### Consequências

- O pipeline de staging/produção deve injetar `SEED_ADMIN_PASSWORD`
  como secret gerenciado (GitHub Secrets, Vault, etc.) antes de executar
  `npx prisma db seed`.
- O `backend/.env.example` documenta `SEED_ADMIN_PASSWORD` como variável
  obrigatória fora de desenvolvimento.
- O comportamento em dev permanece inalterado para não impactar o
  fluxo de trabalho da equipe.

---

## Arquivos Relacionados

- `prisma/seed.ts` — implementa a Decisão 3
- `src/config/env.validation.ts` — padrão fail-loud de referência (Decisão 3)
- `backend/Dockerfile` — implementa isolamento de build (Tarefas 2 e 3)
- `deploy/nginx.conf.example` — configuração de referência (Decisão 2)
- `backend/.env.example` — documenta `SEED_ADMIN_PASSWORD`
