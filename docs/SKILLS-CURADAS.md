# SKILLS-CURADAS.md (v2) — catálogo ampliado, por agente

Curadoria de 15/09/2026. Status de auditoria e números mudam — confira em
https://www.skills.sh/audits antes de instalar.

## ⚠️ Correção em relação à versão anterior

Duas skills que apareciam no leaderboard foram **descontinuadas** pelo autor em
julho/2026 e substituídas. Se você tinha anotado, atualize:

| Descontinuada | Substituta |
|---|---|
| `to-prd` | `to-spec` |
| `to-issues` | `to-tickets` |

O fluxo oficial atual do pacote `mattpocock/skills` é:
`grill-with-docs` → `to-spec` → `to-tickets` → `implement` → `code-review`,
com `wayfinder` acima de tudo para trabalho multi-sessão.

---

## Regra zero (não mudou)

Skill roda **com a autoridade do agente que a carrega**. Antes de liberar
qualquer skill nova para um agente que escreve ou executa comando:
instale primeiro num agente read-only (`scout`, `security-reviewer`), leia o
`SKILL.md`, e versione a pasta no git para poder auditar atualizações por diff.

---

## Camada 1 — Contexto e sessão (NOVO — atende seu pedido de zerar contexto)

| Skill | Origem | Auditoria | Agente |
|---|---|---|---|
| `handoff` | mattpocock | **Safe / 0 alertas / baixo** | tech-lead |
| `wayfinder` | mattpocock | verificar | tech-lead (só tarefas grandes) |
| `zoom-out` | mattpocock | verificar | scout |

```bash
npx skills add https://github.com/mattpocock/skills --skill handoff
npx skills add https://github.com/mattpocock/skills --skill zoom-out
```

- **`handoff`** é a peça central do protocolo de contexto zero. Comprime a
  conversa num documento de passagem, referencia artefatos por caminho em vez de
  duplicar conteúdo, e redige informação sensível. Instale agora.
- **`wayfinder`** planeja trabalho grande demais para uma sessão, como mapa de
  tickets de decisão no issue tracker. Instale só quando chegar nesse porte.
- **`zoom-out`** serve para entender o papel de um trecho de código no sistema
  como um todo — casa exatamente com a função do `scout`.

---

## Camada 2 — Método de desenvolvimento

Pack `obra/superpowers`.

| Skill | Agente |
|---|---|
| `using-superpowers` | todos (meta-skill do pack) |
| `brainstorming` | tech-lead |
| `writing-plans` | tech-lead |
| `executing-plans` | dev |
| `verification-before-completion` | **todos que escrevem** |
| `test-driven-development` | qa-validator |
| `systematic-debugging` | dev, qa-validator |
| `requesting-code-review` | security-reviewer |
| `receiving-code-review` | dev |
| `using-git-worktrees` | tech-lead, ci-cd |
| `subagent-driven-development` | tech-lead (Fase 5) |
| `dispatching-parallel-agents` | tech-lead (Fase 5) |
| `finishing-a-development-branch` | ci-cd |

```bash
npx skills add https://github.com/obra/superpowers --skill using-superpowers
npx skills add https://github.com/obra/superpowers --skill writing-plans
npx skills add https://github.com/obra/superpowers --skill executing-plans
npx skills add https://github.com/obra/superpowers --skill verification-before-completion
npx skills add https://github.com/obra/superpowers --skill test-driven-development
npx skills add https://github.com/obra/superpowers --skill systematic-debugging
npx skills add https://github.com/obra/superpowers --skill using-git-worktrees
```

> Esse pack não aparecia no top-50 auditado quando consultei. Confira o selo de
> cada skill antes de liberar para agente com escrita.

---

## Camada 3 — Orca (seu ambiente)

| Skill | Auditoria | Agente |
|---|---|---|
| `orca-cli` | verificar | tech-lead, ci-cd |
| `orchestration` | **Warn no Gen Trust Hub**, Socket e Snyk passam | tech-lead |

```bash
npx skills add https://github.com/stablyai/orca --skill orca-cli
npx skills add https://github.com/stablyai/orca --skill orchestration
```

O `Warn` faz sentido: a skill coordena execução de outros agentes, então dispara
alerta por desenho. Aceitável com sandbox ligado.

---

## Camada 4 — Teste de navegador (o que você tinha visto)

| Skill | Origem | Auditoria | Agente |
|---|---|---|---|
| `agent-browser` | vercel-labs | **RISCO ALTO** | qa-validator, só ele |
| `dogfood` | vercel-labs | **RISCO ALTO** | qa-validator, só ele |

```bash
npx skills add vercel-labs/agent-browser --skill agent-browser
npx skills add vercel-labs/agent-browser --skill dogfood
```

`dogfood` é o workflow de exploração sistemática: navega pela aplicação como um
usuário real, encontra bugs e problemas de UX, e produz relatório estruturado
com screenshots e vídeo de reprodução. É exatamente o que você descreveu.

Risco alto porque controla um Chrome real via protocolo de depuração. Contenção
obrigatória está escrita dentro do `qa-validator.md`: só localhost e staging,
só usuário sintético, sempre em worktree isolada.

---

## Camada 5 — Disciplina de código

| Skill | Agente | Nota |
|---|---|---|
| `code-review` | security-reviewer | base metodológica da revisão |
| `diagnose` | dev, qa-validator | reproduzir → minimizar → hipótese → corrigir → teste de regressão |
| `tdd` | qa-validator | red-green-refactor |
| `to-spec` | tech-lead | conversa + codebase → especificação |
| `to-tickets` | tech-lead | spec → fatias verticais independentes |
| `implement` | dev | executar ticket |
| `improve-codebase-architecture` | tech-lead | periódico, não por tarefa |
| `setup-pre-commit` | ci-cd | roda uma vez, no setup |
| `research` | scout | investigação que alimenta o planejamento |

```bash
npx skills add https://github.com/mattpocock/skills --skill code-review
npx skills add https://github.com/mattpocock/skills --skill diagnose
npx skills add https://github.com/mattpocock/skills --skill to-spec
npx skills add https://github.com/mattpocock/skills --skill to-tickets
npx skills add https://github.com/mattpocock/skills --skill setup-pre-commit
```

**`improve-codebase-architecture` merece atenção especial.** O próprio autor do
pacote aponta que agentes aceleram a entropia do software — o código fica
desorganizado mais rápido quando a produção aumenta. Rode essa skill
periodicamente (a cada 2–3 semanas), não a cada tarefa. É manutenção preventiva.

> **Viés de stack:** esse autor é referência em TypeScript. As skills de método
> (`code-review`, `diagnose`, `handoff`, `to-spec`) são agnósticas. As de
> modelagem e arquitetura virão com sotaque TS.

---

## Camada 6 — Descoberta e frontend

```bash
npx skills add vercel-labs/skills --skill find-skills
npx skills add anthropics/skills --skill frontend-design
```

- **`find-skills`** (Safe / 0 alertas): skill nº1 do catálogo. Resolve o problema
  de gestão — em vez de instalar 40 skills "por garantia", o agente busca a certa
  na hora. Fica no `tech-lead`.
- **`frontend-design`** (Safe / 0 alertas / baixo): para o `dev` no domínio frontend.

---

## Camada 7 — Stack (fechada: JavaScript/TypeScript hoje, Java a caminho)

### Supermercado (JavaScript/TypeScript, agora)
Ainda não recebi framework/banco específico (Express? NestJS? Prisma?
Supabase?). Assim que informar, eu fecho esta subseção com skills de
framework. Por ora, o `dev` já segue as convenções genéricas de JS/TS descritas
no próprio `dev.md`.

### Novo trabalho (Java + Spring Boot, confirmado)

Java não tem, ainda, um pacote com o nível de adoção e auditoria pública do
`mattpocock/skills` ou do `superpowers`. As opções abaixo são referência útil,
**não** "testadas pelo mercado" no mesmo sentido das anteriores — sem selo de
auditoria verificável em skills.sh/audits no momento desta curadoria. Revise o
`SKILL.md` antes de liberar para um agente com escrita.

| Skill | Origem | Instalações | Cobre |
|---|---|---|---|
| `java-spring-boot-structure` | israf1l | — | pacote por domínio, MapStruct, DTO/entidade separados, Spring AI — é a que mais bate com o que o `dev.md` já implementa à mão |
| `spring-boot-engineer` | 404kidwiz/claude-supercode-skills | ~105 | REST, microsserviços, Spring 3+, virtual threads |
| `java-expert` | personamanagmentlayer/pcl | ~284 | Java 17+/21+, Maven/Gradle, JUnit |

```bash
# Revise o SKILL.md de cada uma antes de rodar
npx skills add https://github.com/israf1l/java-spring-boot-structure --skill java-spring-boot-structure
```

**Minha recomendação:** não instale nenhuma agora. O `dev.md` já carrega, por
escrito, as convenções de Spring Boot que essas skills cobririam — estrutura
por domínio, separação DTO/entidade via MapStruct, `@RestControllerAdvice`
central, Testcontainers. Ganho marginal de instalar é pequeno; risco de
carregar instrução de terceiro não auditada num agente que escreve código é
real. Revisite quando o projeto crescer e precisar de algo mais específico
(ex: Spring Security com OAuth2, Spring Cloud, Kafka).