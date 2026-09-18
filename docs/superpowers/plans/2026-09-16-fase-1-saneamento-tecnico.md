# Saneamento Técnico — Fase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Executar o saneamento técnico da Fase 1 do Supermercado: auditar e sanitizar arquivos `.env` e controle Git, alinhar portas e CORS (eliminando porta 3333 legada e padronizando Backend 3000 / Frontend 3001), desativar a dependência inativa do Bull/Redis para enxugar o bundle, e implementar o fluxo formal de Dupla Aprovação (RN-AJU-004 / P06) com segregação de funções e consistência de enums no Prisma e domínio.

**Architecture:**

- **Segurança &amp; Configuração**: Sanitização completa de `.env.example` e `.env.staging.example` com placeholders explícitos; inclusão definitiva de `.worktrees/` e `worktrees/` em `.gitignore`; isolamento estrito de segredos.
- **Rede &amp; Infraestrutura HTTP**: Padronização canônica da topologia de rede local e staging: API NestJS operando na porta 3000 (`PORT=3000`), Frontend Next.js operando na porta 3001 (`PORT=3001`, script `"dev": "next dev -p 3001"`), `NEXT_PUBLIC_API_URL` apontando para `http://localhost:3000`, e `ALLOWED_ORIGINS` configurado com `http://localhost:3001,http://localhost:3000`.
- **Bundle &amp; Filas Assíncronas**: Remoção das dependências não utilizadas (`bull`, `@nestjs/bull`, `ioredis`) que adicionavam 50+ pacotes e geravam conexões fantasmas ao Redis sem nenhum worker ou fila registrada.
- **Governança &amp; Dupla Aprovação (RN-AJU-004 / P06)**: Extensão do enum de papéis (`Perfil`) no Prisma para incluir `CONTROLADORIA`, modelagem da transição de estados de `AjusteEstoque` (`PENDENTE` → `PENDENTE_CONTROLADORIA` → `APROVADO`), rastreamento de duplo aprovador (`aprovadorGestorId` e `aprovadorControladoriaId`), e enforcement de Segregação de Funções (SoD, RN-REL-004) onde Gestor e Controladoria devem ser usuários distintos e nenhum pode ser o solicitante.

**Tech Stack:**

- NestJS v11, Next.js v16, React 19, TypeScript 5, Prisma 5.22, Jest, TailwindCSS 4, Docker Compose.

**Spec:**

- `Escopo_Projeto/NEXUSSW_04_06_Processo_PRC-AJU-005_Ajustes_de_Estoque.md`
- `Escopo_Projeto/NEXUSSW_05_Regras_de_Negocio.md` (RN-AJU-004, RN-REL-004)
- `backend/docs/adr/0006-extracao-regra-rn-aju-004-funcao-pura.md`
- `backend/docs/adr/0008-decisoes-deploy-staging.md`

## Global Constraints

- Sem quebra de backwards compatibility para os 328 testes unitários existentes.
- Nenhum segredo em texto claro em commits ou arquivos `.example`.
- Regra de alçada RN-AJU-004: Tolerância de 2% no saldo teórico OU R$ 1.000,00 de valor absoluto exigem Dupla Aprovação (`GESTOR + CONTROLADORIA`).
- Segregação de Funções (RN-REL-004): Solicitante não aprova; Aprovador 1 não pode ser Aprovador 2.
- A aplicação local e staging não deve falhar por indisponibilidade de Redis enquanto filas assíncronas não estiverem ativas.

---

### Task 1: Saneamento do Git, .gitignore e Modelos de Ambiente (.env.example)

**Files:**

- Modify: `.gitignore`
- Modify: `.env.staging.example`
- Modify: `backend/.env.example`
- Modify: `frontend/.env.example`

**Interfaces:**

- Consumes: Arquivos de configuração de ambiente e variáveis validadas por `validateEnv()` e Docker Compose.
- Produces: Modelos `.example` padronizados, sem credenciais utilizáveis e com placeholders evidentes.

- [ ] **Step 1: Atualizar `.gitignore` para ignorar formalmente worktrees locais**

  Editar `.gitignore` para garantir que `.worktrees/` e `worktrees/` fiquem ignorados em qualquer clonagem ou branch.

```gitignore
# Worktrees
.worktrees/
worktrees/
```

- [ ] **Step 2: Sanitizar `.env.staging.example` removendo senhas e tokens reais**

Substituir valores reais/utilizáveis por placeholders explícitos:

```env
# Template para ambiente de Staging
# Copie este arquivo para .env.staging e preencha os valores reais.
# .env.staging NÃO deve ser commitado (ver .gitignore).

DB_USER=staging_user
DB_PASSWORD=SUBSTITUA_POR_SENHA_FORTE_DO_BANCO_STAGING
DB_NAME=sge_staging

JWT_SECRET=SUBSTITUA_POR_CHAVE_JWT_ALEATORIA_MIN_64_CHARS
ALLOWED_ORIGINS=http://localhost:3001,http://localhost:3000
SEED_ADMIN_PASSWORD=SUBSTITUA_POR_SENHA_FORTE_ADMIN_STAGING

# PORT: porta interna em que o NestJS escuta dentro do container (padrão 3000)
PORT=3000

# URL da API do backend consumida pelo frontend
NEXT_PUBLIC_API_URL=http://localhost:3000
```

- [ ] **Step 3: Harmonizar `backend/.env.example` e `frontend/.env.example`**

Garantir que `backend/.env.example` referencie `ALLOWED_ORIGINS="http://localhost:3001,http://localhost:3000"` e `PORT=3000`.
Garantir que `frontend/.env.example` aponte `NEXT_PUBLIC_API_URL=http://localhost:3000` (eliminando a referência desatualizada a `3333`).

- [ ] **Step 4: Verificar ausência de segredos rastreados no Git**

Executar comando de auditoria para confirmar que nenhum `.env` real ou credencial está no índice:

Run: `git ls-files | grep -E "(\.env$|\.env\.local$|\.env\.staging$)"`
Expected: Vazio (nenhum arquivo de credencial real rastreado).

- [ ] **Step 5: Commit do Task 1**

```bash
git add .gitignore .env.staging.example backend/.env.example frontend/.env.example
git commit -m "chore(security): sanitizar modelos de env e ignorar worktrees no gitignore"
```

---

### Task 2: Padronização de Portas e CORS (Backend 3000 vs Frontend 3001)

**Files:**

- Modify: `frontend/package.json`
- Modify: `frontend/src/lib/api.ts`
- Modify: `backend/src/config/env.validation.ts`
- Modify: `backend/src/config/env.validation.spec.ts`

**Interfaces:**

- Consumes: `process.env.PORT`, `process.env.NEXT_PUBLIC_API_URL`, `process.env.ALLOWED_ORIGINS`.
- Produces: API NestJS em 3000, Frontend Next.js em 3001 em modo desenvolvimento, fallback seguro sem porta 3333.

- [ ] **Step 1: Atualizar script de desenvolvimento do Frontend**

  Em `frontend/package.json`, alterar o script `"dev"` para rodar na porta 3001 por padrão:

```json
"scripts": {
  "dev": "next dev -p 3001",
  "build": "next build",
  "start": "next start -p 3001",
  "lint": "eslint",
  "test": "jest"
}
```

- [ ] **Step 2: Atualizar fallback de API no Frontend**

Em `frontend/src/lib/api.ts`:
Alterar linha 1 de:

```typescript
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
```

Para:

```typescript
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
```

- [ ] **Step 3: Ajustar default de CORS no Backend**

Em `backend/src/config/env.validation.ts`:
Atualizar o fallback de `ALLOWED_ORIGINS` para contemplar a porta 3001 do frontend em dev:

```typescript
const originsRaw = process.env.ALLOWED_ORIGINS ?? 'http://localhost:3001,http://localhost:3000';
const ALLOWED_ORIGINS = originsRaw.split(',').map((o) => o.trim()).filter(Boolean);
```

- [ ] **Step 4: Executar testes de validação de ambiente e API**

Run: `npx jest src/config/env.validation.spec.ts` (no backend)
Run: `npm test -- src/lib/__tests__/api.spec.ts` (no frontend)
Expected: PASS em ambas as suítes.

- [ ] **Step 5: Commit do Task 2**

```bash
git add frontend/package.json frontend/src/lib/api.ts backend/src/config/env.validation.ts backend/src/config/env.validation.spec.ts
git commit -m "fix(network): padronizar backend na porta 3000, frontend na 3001 e remover referencias a porta 3333"
```

---

### Task 3: Desacoplamento e Limpeza da Dependência Bull / Redis

**Files:**

- Modify: `backend/src/app.module.ts`
- Modify: `backend/package.json`
- Modify: `backend/src/config/env.validation.ts`
- Modify: `backend/src/config/env.validation.spec.ts`

**Interfaces:**

- Consumes: Módulos registrados em `AppModule`.
- Produces: Backend inicializável sem dependência mandatória de socket Redis quando filas assíncronas não existirem.

- [ ] **Step 1: Remover import do BullModule em `app.module.ts`**

  Remover:

```typescript
import { BullModule } from '@nestjs/bull';
...
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
      },
    }),
```

- [ ] **Step 2: Tornar variáveis de Redis opcionais em `env.validation.ts`**

Modificar `backend/src/config/env.validation.ts`:

```typescript
interface ValidatedEnv {
  DATABASE_URL: string;
  JWT_SECRET: string;
  REDIS_HOST?: string;
  REDIS_PORT?: number;
  PORT: number;
  ALLOWED_ORIGINS: string[];
}
...
  const REDIS_HOST = process.env.REDIS_HOST ?? 'localhost';
  const REDIS_PORT = Number(process.env.REDIS_PORT ?? 6379);
```

Garantir que a ausência de Redis nunca cause `fail-loud` no bootstrap da API (Redis deve ser opcional até implementação de workers assíncronos em sprint futura com BullMQ oficial).

- [ ] **Step 3: Remover pacotes não utilizados de `package.json`**

Remover de `backend/package.json` as dependências mortas:
`"@nestjs/bull"` e `"bull"` (e `"ioredis"` se não utilizado).
Executar desinstalação controlada dentro da worktree.

- [ ] **Step 4: Executar build e testes do backend**

Run: `npm run build`
Run: `npx jest src/app.controller.spec.ts`
Expected: Build compila com sucesso e sem avisos de módulos Bull faltantes.

- [ ] **Step 5: Commit do Task 3**

```bash
git add backend/src/app.module.ts backend/src/config/env.validation.ts backend/src/config/env.validation.spec.ts backend/package.json backend/package-lock.json
git commit -m "chore(deps): remover @nestjs/bull e bull inativos enxugando bundle do backend"
```

---

### Task 4: Fluxo de Dupla Aprovação de Ajuste de Estoque (RN-AJU-004 / P06)

**Files:**

- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/YYYYMMDD_add_controladoria_and_double_approval/migration.sql`
- Modify: `backend/src/core/domain/adjustment/adjustment.rules.ts`
- Modify: `backend/src/core/domain/adjustment/adjustment.rules.spec.ts` (ou criar)
- Modify: `backend/src/core/interfaces/repositories/i-adjustment.repository.ts`
- Modify: `backend/src/infrastructure/database/prisma/repositories/prisma-adjustment.repository.ts`
- Modify: `backend/src/core/use-cases/adjustment/approve-adjustment.use-case.ts`
- Modify: `backend/src/core/use-cases/adjustment/approve-adjustment.use-case.spec.ts`
- Modify: `backend/src/core/use-cases/adjustment/adjustment-level-consistency.spec.ts`

**Interfaces:**

- Consumes: `ApproveAdjustmentDto`, `Usuario` com perfis `ADMIN | GESTOR | CONTROLADORIA | OPERADOR`, `AjusteEstoque`.
- Produces: Fluxo bifásico de aprovação para ajustes severos (&gt; 2% ou &gt; R$ 1.000,00) com segregação de funções.

- [ ] **Step 1: Escrever teste de unidade para as novas regras de Dupla Aprovação**

  Em `backend/src/core/domain/adjustment/adjustment.rules.spec.ts`:
  Criar testes que comprovem:

1. Ajuste ≤ 2% e ≤ R$ 1.000: exige apenas 1 aprovação (`GESTOR`).
2. Ajuste &gt; 2% ou &gt; R$ 1.000: exige 2 aprovações (`DUPLA_APROVACAO` com `GESTOR` seguido de `CONTROLADORIA`).
3. Solicitante não pode ser o 1º aprovador nem o 2º aprovador.
4. O 1º aprovador não pode ser o mesmo usuário do 2º aprovador (SoD).

- [ ] **Step 2: Atualizar `schema.prisma` com perfil CONTROLADORIA e colunas de dupla aprovação**

Atualizar `schema.prisma`:

```prisma
enum Perfil {
  ADMIN
  GESTOR
  CONTROLADORIA
  OPERADOR
}

enum StatusAprovacao {
  PENDENTE
  PENDENTE_CONTROLADORIA
  APROVADO
  REJEITADO
}

model AjusteEstoque {
  id                      Int             @id @default(autoincrement())
  loteId                  Int
  quantidadeDelta         Int
  motivo                  String
  valorDelta              Float           @default(0.0)
  saldoTeorico            Int
  statusAprovacao         StatusAprovacao @default(PENDENTE)
  solicitanteId           Int
  aprovadorGestorId       Int?
  aprovadorControladoriaId Int?
  criadoEm                DateTime        @default(now())
  atualizadoEm            DateTime        @updatedAt

  lote                  Lote     @relation(fields: [loteId], references: [id])
  solicitante           Usuario  @relation("AjusteSolicitante", fields: [solicitanteId], references: [id])
  aprovadorGestor       Usuario? @relation("AjusteAprovadorGestor", fields: [aprovadorGestorId], references: [id])
  aprovadorControladoria Usuario? @relation("AjusteAprovadorControladoria", fields: [aprovadorControladoriaId], references: [id])
}
```

- [ ] **Step 3: Atualizar `ApproveAdjustmentUseCase` com a máquina de estados**

Regra de Transição:

1. **Se ajuste simples (`GESTOR`):**
  - Papel aceito: `GESTOR` ou `ADMIN`.
  - Se aprovado: status vai direto para `APROVADO`, efetiva delta no lote e gera movimentação.
2. **Se ajuste de alto impacto (`GESTOR_CONTROLADORIA`):**
  - **Fase 1 (`statusAprovacao === 'PENDENTE'`):**
    - Papel aceito: `GESTOR` ou `ADMIN`.
    - Se aprovado: status vai para `PENDENTE_CONTROLADORIA`, grava `aprovadorGestorId = dto.aprovadorId`. NÃO altera o estoque do lote ainda!
  - **Fase 2 (`statusAprovacao === 'PENDENTE_CONTROLADORIA'`):**
    - Papel aceito: `CONTROLADORIA` ou `ADMIN`.
    - Validação SoD: `dto.aprovadorId !== ajuste.aprovadorGestorId`. Se igual, lança erro de SoD (quem fez o 1º aceite não pode fazer o 2º).
    - Se aprovado: status vai para `APROVADO`, grava `aprovadorControladoriaId = dto.aprovadorId`, efetiva alteração no Lote e grava a `Movimentacao` de auditoria.
3. **Rejeição:**
  - Em qualquer fase (`PENDENTE` ou `PENDENTE_CONTROLADORIA`), rejeição cancela imediatamente o fluxo, marcando `statusAprovacao = 'REJEITADO'`.

- [ ] **Step 4: Executar suíte de testes de consistência e aprovação**

Run: `npx jest src/core/use-cases/adjustment/approve-adjustment.use-case.spec.ts`
Run: `npx jest src/core/use-cases/adjustment/adjustment-level-consistency.spec.ts`
Expected: Todos os testes passando com 100% de cobertura nos ramos de dupla aprovação e SoD.

- [ ] **Step 5: Commit do Task 4**

```bash
git add backend/prisma/schema.prisma backend/src/core/domain/adjustment/ backend/src/core/use-cases/adjustment/ backend/src/infrastructure/database/prisma/repositories/
git commit -m "feat(adjustment): implementar fluxo de dupla aprovacao RN-AJU-004 com segregacao de funcoes e papel CONTROLADORIA"
```

---

### Task 5: Validação Integrada, Compilação e Gates de Qualidade

**Files:**

- Verify all modified files across backend and frontend.

- [ ] **Step 1: Executar typecheck TypeScript completo em backend e frontend**

Run: `npm --prefix backend run typecheck`
Run: `npm --prefix frontend run lint`
Expected: 0 erros de compilação ou tipagem.

- [ ] **Step 2: Executar bateria completa de testes unitários do backend**

Run: `npm --prefix backend test`
Expected: Todas as suítes (65+) passando sem timeouts.

- [ ] **Step 3: Executar bateria de testes do frontend**

Run: `npm --prefix frontend test`
Expected: 8/8 suítes passando com sucesso.

- [ ] **Step 4: Commit de finalização da Fase 1**

```bash
git commit --allow-empty -m "chore: saneamento da Fase 1 concluido e verificado com sucesso"
```

