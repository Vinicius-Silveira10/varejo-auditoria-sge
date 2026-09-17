# Tarefa: Saneamento Técnico e Governança da Fase 1

> Arquivo criado pelo `tech-lead` para registro formal e histórico da Fase 1.
> Nome do arquivo: `.agents/tasks/2026-09-16-fase-1-saneamento.md`

- **ID:** 2026-09-16-fase-1-saneamento
- **Worktree:** `.worktrees/fase-1-saneamento` (branch `fase-1-saneamento`)
- **Status:** `APROVADO`

---

## Objetivo

Executar o saneamento técnico inicial do SGE Fortal: sanitizar variáveis e modelos de ambiente, padronizar portas de rede (3000/3001) eliminando a porta residual 3333, desacoplar dependências inativas do Bull/Redis e implementar o fluxo de dupla aprovação de ajustes de estoque de alto impacto com Segregação de Funções (SoD) e papel `CONTROLADORIA`.

## Critério de aceite

- [x] Saneamento do Git e `.env`: `.env.staging.example` sanitizado com `SUBSTITUA_POR_...`, `.gitignore` protegendo worktrees e permitindo documentação e agentes.
- [x] Padronização de Portas e CORS: Backend na 3000, Frontend na 3001, CORS estrito para `http://localhost:3001,http://localhost:3000`.
- [x] Desacoplamento Bull / Redis: Remoção de `@nestjs/bull`, `bull`, `ioredis`, remoção do `BullModule.forRoot` no `AppModule` e flexibilização de Redis no `env.validation.ts`.
- [x] Dupla Aprovação (RN-AJU-004 / P06): Extensão do schema Prisma (`CONTROLADORIA`, `PENDENTE_CONTROLADORIA`, `aprovadorGestorId`, `aprovadorControladoriaId`) e máquina de estados bifásica em `ApproveAdjustmentUseCase` com SoD estrito (RN-REL-004).
- [x] Qualidade e Testes: 65/65 suítes no backend (336 testes) e 8/8 suítes no frontend (31 testes) 100% verdes.
- [x] Gate de Segurança: Veredito formal APROVADO emitido pelo `security-reviewer`.

## Contrato de dados

- **DTO de Aprovação de Ajuste:** `ApproveAdjustmentDto { ajusteId: number, aprovadorId: number, aprovadorRole: string, aprovado: boolean, justificativaRejeicao?: string }`
- **Transições de Status:**
  - Baixo impacto (`≤ 2%` e `≤ R$ 1.000`): `PENDENTE` -> `APROVADO` (1 etapa por `GESTOR`/`ADMIN`).
  - Alto impacto (`> 2%` ou `> R$ 1.000`): `PENDENTE` -> `PENDENTE_CONTROLADORIA` (Etapa 1: `GESTOR`/`ADMIN`, estoque intocado) -> `APROVADO` (Etapa 2: `CONTROLADORIA`/`ADMIN`, estoque atualizado, SoD 1º aprovador ≠ 2º aprovador).

## Briefing do scout

- Código do backend utiliza NestJS 11 com Prisma ORM e PostgreSQL.
- Dependências inativas do Bull v4 causavam tentativa compulsória de conexão com Redis no bootstrap.
- Frontend Next.js continha fallback para porta legada 3333 em `src/lib/api.ts`.
- Regras de ajuste em `adjustment.rules.ts` previam `DUPLA_APROVACAO`, mas a tabela `AjusteEstoque` só continha `aprovadorId`.

## Arquivos afetados

- `.gitignore`
- `.env.staging.example`
- `backend/.env.example`
- `frontend/.env.example`
- `frontend/package.json`
- `frontend/src/lib/api.ts`
- `backend/package.json`
- `backend/src/app.module.ts`
- `backend/src/config/env.validation.ts`
- `backend/prisma/schema.prisma`
- `backend/src/core/use-cases/adjustment/approve-adjustment.use-case.ts`
- `backend/src/core/use-cases/adjustment/approve-adjustment.use-case.spec.ts`
- `backend/src/core/use-cases/adjustment/adjustment-level-consistency.spec.ts`

## Decisões tomadas

- Mantido campo `aprovadorId` como opcional para retrocompatibilidade com migrations e queries legadas.
- Variáveis `REDIS_HOST` e `REDIS_PORT` tornadas opcionais em `env.validation.ts` para não quebrar inicializações locais sem Redis.
- Aprovador da 1ª etapa não pode ser o mesmo da 2ª etapa (SoD estrita), verificado tanto fora quanto dentro da transação atômica via Unit of Work com locks pessimistas.

## Registro de delegação

| Rodada | Agente | Pedido | Resultado |
|---|---|---|---|
| 1 | scout | Reconhecimento e mapeamento de dependências e regras de ajuste | Briefing entregue |
| 2 | dev | Implementação isolada na worktree `.worktrees/fase-1-saneamento` | Tarefas 1 a 4 executadas e commitadas |
| 3 | qa-validator | Execução de testes unitários e de integração | 336 testes backend + 31 frontend aprovados |
| 4 | security-reviewer | Auditoria completa de segurança e SoD | Veredito APROVADO sem vulnerabilidades |

## Estado final

Fase 1 totalmente implementada, testada e auditada com sucesso na branch `fase-1-saneamento`. Aprovada para merge na `main`.
