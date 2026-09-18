# AGENTS.md — Supermercado (SGE Fortal)

> Sistema de Gestão de Estoque — Governança e Regras de Engenharia do Time de Agentes.
> Ver HARNESS.md e CONTEXTO-ZERO.md para os controles detalhados.

## Estrutura

```
backend/                       API NestJS 11, Prisma ORM, regras de domínio e testes
frontend/                      Aplicação Next.js 15, TailwindCSS e interface operacional
deploy/ .github/               Infraestrutura, Docker Compose e workflows de CI (universal)
tests/ e2e/ reports/           Saída de testes e relatórios do qa-validator (universal)
.agents/tasks/                 Ledger das tarefas (universal)
docs/adr/                      Decisões de arquitetura e governança (universal)
```

## O time

| Agente | Papel | Escreve em | Aprova? |
|---|---|---|---|
| `tech-lead` | orquestra, mantém o ledger | `.agents/tasks/`, `docs/adr/` | não |
| `scout` | levanta o terreno, protege o contexto | nada | não |
| `dev` | implementa (declara diretório por tarefa) | código de aplicação, exceto reservados | não |
| `qa-validator` | testa (unitário + navegador real) | `tests/`, `e2e/`, `reports/` | não |
| `security-reviewer` | audita e dá veredito | nada | **sim, é o único** |
| `ci-cd` | pipeline, container, observabilidade | `deploy/`, `.github/` | não |

## Regras inegociáveis

1. Segredos: ninguém lê/edita/commita `.env`/`.env.staging` real.
2. Sem `git push`, sem `--force`, sem deploy, sem migração remota.
3. Quem escreve não aprova — sempre via `security-reviewer`.
4. `qa-validator` só testa `localhost`/staging, usuário sintético.
5. Uma tarefa = uma conversa = uma worktree = um ledger.
6. Fora do escopo? Devolve ao `tech-lead`, não contorna.

## Comandos do projeto

```bash
# Instalação de dependências
npm --prefix backend ci
npm --prefix frontend ci

# Build de produção
npm --prefix backend run build
npm --prefix frontend run build

# Testes unitários e de integração
npm --prefix backend test
npm --prefix frontend test

# Testes E2E
npm --prefix backend run test:e2e

# Typecheck e Lint
npm --prefix backend run typecheck
npm --prefix frontend run lint
```
