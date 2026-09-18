# HANDOFF — leve isto para a próxima conversa

Cole no início da nova conversa. Resume tudo que já foi decidido.

---

## Projeto

**Supermercado**, em `/mnt/c/Users/Vinicius/Supermercado`.
Ambiente: **Antigravity CLI** (`agy`, Gemini 3.x) + **OpenCode** + **Orca**
(worktrees). Estrutura: `backend/`, `frontend/`, `deploy/`, `.github/`,
`docker-compose*.yml`. Stack (linguagens/banco) **ainda não informada**.

## Arquitetura fechada (não reabrir sem motivo novo)

Orquestrador `tech-lead` + **5 subagentes**, nesting depth = 1:

| Agente | Escreve em | Observação |
|---|---|---|
| `tech-lead` | `.agents/tasks/`, `docs/adr/` | orquestra e mantém o ledger; nunca código |
| `scout` | nada | read-only, absorve o custo de exploração |
| `dev` | `backend/`, `frontend/` | full-stack, declara domínio por tarefa |
| `qa-validator` | `tests/`, `e2e/`, `reports/` | usa `agent-browser`/`dogfood` |
| `security-reviewer` | nada | único gate de aprovação |
| `ci-cd` | `deploy/`, `.github/` | nunca executa deploy |

## Princípios aplicados

**Engenharia de harness** (`Agente = Modelo + Harness`): todo controle está na
configuração (tools, escopo de escrita, permissão), não na boa vontade do modelo.
Sete controles documentados em `HARNESS.md`.

**Contexto efêmero, artefato durável** (`CONTEXTO-ZERO.md`): uma tarefa = uma
conversa = uma worktree = um ledger em `.agents/tasks/`. Subagentes do Antigravity
já nascem sem herdar a janela do pai; o `scout` e o ledger cobrem o resto.
Skill `handoff` para quando a tarefa excede uma sessão.

## Entregue e versionado (não pedir de novo)

`AGENTS.md`, `HARNESS.md`, `CONTEXTO-ZERO.md`, `SKILLS-CURADAS.md` (v2),
`ROADMAP.md`, `INSTALACAO.md`, `_TEMPLATE.md` do ledger, e 12 arquivos de agente
(6 em formato Antigravity, 6 em formato OpenCode).

## Em aberto

1. **Stack não informada** — sem isso os prompts do `dev` são genéricos e a
   Camada 7 de skills (Prisma/Supabase/React) não foi escolhida.
2. **`.env.staging` pode estar no histórico do git** — alertado, não confirmado
   se o usuário rodou `git log --oneline -- .env.staging`.
3. **`--dangerously-skip-permissions`** pode ainda estar em uso no `agy`.
4. **Usuário de teste sintético** para o `qa-validator` ainda não provisionado.
5. **CI real** (lint/teste/SAST/scan de segredo como status check obrigatório)
   não configurado — sem isso o harness fica só no papel.
6. **ROADMAP** ainda descreve 4 subagentes; precisa incorporar `scout` e o
   protocolo de contexto.

## Tom esperado

Profissional, criterioso, direto, padrão de mercado ou acima, caminho
"mastigado" — ainda está aprendendo a administrar Antigravity/OpenCode/Orca.
Prefere uma variável por vez. Já assimilou o conceito de harness e de gestão de
contexto; não precisa reexplicar do zero.
