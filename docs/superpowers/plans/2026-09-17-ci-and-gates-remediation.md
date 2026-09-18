# Plano de Implementação — Correção dos Gates de CI e Segurança

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolver os 4 bloqueios de CI/Gates no repositório: permissões do Gitleaks no GitHub Actions, migração do Prisma para colunas de dupla aprovação e cascade/cleanup de PedidoExpedicao, adequação de escopo do ESLint backend para testes E2E, e tipagem/regras React do ESLint frontend.

**Architecture:**
- **Segurança (.github/workflows/security.yml):** Adicionar permissão `pull-requests: read` e injetar `GITHUB_TOKEN: ${{ github.token }}` para compatibilidade com `gitleaks-action@v3`.
- **Banco de Dados (Prisma):** Criar a migração `20260917204500_add_adjustment_approver_roles` adicionando `aprovadorGestorId` e `aprovadorControladoriaId` com FKs para `Usuario(id)`, atualizar relação `ItemPedido -> PedidoExpedicao` com `onDelete: Cascade` e garantir cleanup de dependências em testes E2E.
- **Linter Backend (ESLint + package.json):** Restringir `recommendedTypeChecked` nos testes via override em `backend/eslint.config.mjs`, remover `--fix` de `npm run lint` para checagem pura no CI, converter `require('supertest')` para import ESM e podar variáveis não utilizadas.
- **Linter Frontend (Next.js / React / TypeScript):** Tipar `apiFetch` e autenticação em `frontend/src/lib/api.ts`, substituir `err: any` por `err: unknown`, derivar papéis diretamente em `Header.tsx` sem sincronização em `useEffect`, aplicar `useCallback` em queries de aprovação/pedidos e ignorar scripts fora do build.

**Tech Stack:**
- GitHub Actions, Prisma ORM 5.22, NestJS 11, Next.js 15, TypeScript 5, ESLint 9 (Flat Config), Jest / Supertest.

---

### Task 1: Ajustar Permissões e Token do Gitleaks no Workflow de Segurança
**Files:**
- Modify: `.github/workflows/security.yml`

- [ ] Adicionar `pull-requests: read` no bloco `permissions`
- [ ] Adicionar `env: GITHUB_TOKEN: ${{ github.token }}` no step do `gitleaks-action`
- [ ] Validar sintaxe YAML do workflow

---

### Task 2: Criar Migração do Prisma para Aprovadores e Ajustar Cascade de Pedido
**Files:**
- Create: `backend/prisma/migrations/20260917204500_add_adjustment_approver_roles/migration.sql`
- Modify: `backend/prisma/schema.prisma`
- Modify: `backend/test/chain-pointer-full-flow.e2e-spec.ts`

- [ ] Atualizar `ItemPedido` no `schema.prisma` com `onDelete: Cascade`
- [ ] Criar o arquivo `migration.sql` com os `ALTER TABLE` de `AjusteEstoque` e `ItemPedido`
- [ ] Atualizar limpeza em `chain-pointer-full-flow.e2e-spec.ts` para deletar `itemPedido` antes de `pedidoExpedicao`

---

### Task 3: Configurar ESLint Backend e Limpar Variáveis Não Utilizadas nos Testes
**Files:**
- Modify: `backend/eslint.config.mjs`
- Modify: `backend/package.json`
- Modify: `backend/test/picking-rn-exp-007.e2e-spec.ts`
- Modify: `backend/test/picking-deadlock.e2e-spec.ts`
- Modify: `backend/test/use-cases/receive-batch.concurrency.e2e-spec.ts`
- Modify: `backend/test/use-cases/register-movement.spec.ts`
- Modify: `backend/test/api-flow.e2e-spec.ts`

- [ ] Ajustar `backend/package.json` para script `lint` sem flag `--fix`
- [ ] Ajustar `backend/eslint.config.mjs` com overrides para testes
- [ ] Remover `expiredBatchId` de `picking-rn-exp-007.e2e-spec.ts`
- [ ] Remover `loteIdA`, `batchRepo`, `movementRepo` de `picking-deadlock.e2e-spec.ts`
- [ ] Remover imports não utilizados em `receive-batch.concurrency.e2e-spec.ts` e `register-movement.spec.ts`
- [ ] Trocar `require('supertest')` por `import request from 'supertest'` em `api-flow.e2e-spec.ts`
- [ ] Rodar checagem local do backend

---

### Task 4: Saneamento de Tipagem e Regras de Linter no Frontend
**Files:**
- Modify: `frontend/eslint.config.mjs`
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/components/Header.tsx`
- Modify: `frontend/src/app/putaway/page.tsx`
- Modify: `frontend/src/app/approvals/page.tsx`
- Modify: `frontend/src/app/picking/page.tsx`
- Modify: `frontend/src/app/adjustments/request/page.tsx`
- Modify: `frontend/src/app/inventory/page.tsx`
- Modify: `frontend/src/app/inventory/register/page.tsx`
- Modify: `frontend/src/app/inventory/reports/page.tsx`
- Modify: `frontend/src/app/login/page.tsx`
- Modify: `frontend/src/app/dashboard/page.tsx`
- Modify: `frontend/src/app/dashboard/__tests__/Dashboard.test.tsx`

- [ ] Adicionar `ws_test.js` aos ignores do `frontend/eslint.config.mjs`
- [ ] Tipar `AuthUser`, `ApiResponse`, `setUser`, `getUser`, `isError` em `frontend/src/lib/api.ts`
- [ ] Derivar papéis em `Header.tsx` sem `useState`/`useEffect` síncrono
- [ ] Remover atualização de estado no effect de autorização em `putaway/page.tsx`
- [ ] Memoizar `fetchAjustes` e `fetchOrders` com `useCallback`
- [ ] Substituir `err: any` por `err: unknown` nos blocos catch das páginas
- [ ] Substituir `require` por `import` nos testes/páginas do dashboard
- [ ] Validar lint no frontend

---

### Task 5: Validação Final e Preparação do Commit
- [ ] Rodar testes unitários no backend
- [ ] Rodar testes unitários no frontend
- [ ] Verificar `git status` e diff
