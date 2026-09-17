# ROADMAP.md — do zero ao time de 4 subagentes rodando

Cinco fases, uma variável por vez. Cada fase tem critério de parada — não avance
sem ele.

---

## FASE 0 — Fechar as portas (1 hora, não pule)

```bash
cd /mnt/c/Users/Vinicius/Supermercado
git check-ignore -v .env.staging      # deve apontar pro .gitignore
git log --oneline -- .env.staging     # deve vir VAZIO
```

Se vier commit: as credenciais vazaram — rotacione antes de continuar.

Pare de rodar `agy '--dangerously-skip-permissions'`. Use `agy` normal e
`/permissions` → `request-review`. Ligue o sandbox em
`~/.gemini/antigravity-cli/settings.json` (`enableTerminalSandbox: true`).

Backup: `git checkout -b backup/pre-agentes && git push -u origin backup/pre-agentes`.

**✅ Critério:** histórico limpo + sandbox ligado + branch de backup no remoto.

---

## FASE 1 — Contrato do repositório (30 min)

Copie `AGENTS.md` e `HARNESS.md` para a raiz. Preencha a seção de comandos do
`AGENTS.md` com os comandos reais do projeto (instalar, build, teste, lint).

**✅ Critério:** cada comando listado roda de verdade no terminal.

---

## FASE 2 — Skills de método + a skill de teste de navegador (30 min)

```bash
npx skills add https://github.com/obra/superpowers --skill using-superpowers
npx skills add https://github.com/obra/superpowers --skill writing-plans
npx skills add https://github.com/obra/superpowers --skill verification-before-completion
npx skills add https://github.com/obra/superpowers --skill test-driven-development
npx skills add https://github.com/obra/superpowers --skill using-git-worktrees

npx skills add https://github.com/stablyai/orca --skill orca-cli
npx skills add https://github.com/stablyai/orca --skill orchestration

npx skills add vercel-labs/agent-browser --skill agent-browser
npx skills add vercel-labs/agent-browser --skill dogfood
```

Confirme com `/skills` dentro do `agy`. Reinicie a sessão se não aparecerem.

**Sobre `agent-browser`/`dogfood`:** classificação de risco alto na auditoria
(controla navegador real via protocolo de depuração). Instale, mas ela só pode
ser usada dentro do `qa-validator`, contra `localhost`/staging, com usuário
sintético — nunca solta em outro agente.

**✅ Critério:** `/skills` lista as 8 skills.

---

## FASE 3 — Dois agentes read-only (1 semana)

```bash
mkdir -p .agents/agents
cp ~/Downloads/agentes-antigravity/.agents/agents/tech-lead.md .agents/agents/
cp ~/Downloads/agentes-antigravity/.agents/agents/security-reviewer.md .agents/agents/
```

Você continua codando manualmente. `tech-lead` só planeja, `security-reviewer`
só revisa o que você escreveu à mão.

**✅ Critério:** `security-reviewer` encontrou pelo menos um problema real que
você não tinha visto. Se só gerou ruído em uma semana, ajuste o prompt antes de
escalar — não force a passagem de fase.

---

## FASE 4 — Os agentes que escrevem, um por vez (2–3 semanas)

**Semana 1 — `qa-validator`.** Comece só com testes unitários/integração,
sem ligar a exploração de navegador ainda:

```bash
cp ~/Downloads/agentes-antigravity/.agents/agents/qa-validator.md .agents/agents/
```

Rode contra um fluxo simples e barato de refazer. É o agente mais seguro porque,
se errar, o teste quebra e você percebe na hora.

**Semana 2 — ligar a exploração de navegador do `qa-validator`.** Só depois de
provisionar o usuário de teste sintético em staging. Peça: *"explore o fluxo de
X e traga um relatório"*. Confira se ele respeita a contenção (nunca produção,
nunca credencial real) antes de confiar no relatório.

**Semana 3 — `dev`.** Comece só com tarefas de backend, depois libere frontend.
Você lê 100% do diff antes do merge, sem exceção.

**Semana 4 — `ci-cd`.** Por último, porque mexe na esteira que valida todo o resto.

**✅ Critério:** três ciclos seguidos de tarefa → dev → qa-validator →
security-reviewer → merge, sem você precisar desfazer nada.

---

## FASE 5 — Orquestração real

Só depois da Fase 4 estável:

```bash
npx skills add https://github.com/obra/superpowers --skill subagent-driven-development
npx skills add https://github.com/obra/superpowers --skill dispatching-parallel-agents
```

Agora `tech-lead` despacha `dev` e `qa-validator` em worktrees separadas do Orca,
com `ci-cd` em paralelo quando a tarefa toca infraestrutura. Aqui, e só aqui,
avalie `/teamwork-preview` e `/boost` do Antigravity (planos pagos) — você só
consegue julgar se eles ajudam depois de ver o time manual funcionando bem.

---

## O erro mais comum

Instalar tudo e ligar os 4 subagentes na primeira semana. O resultado é sempre
o mesmo: contexto poluído, comportamento estranho sem diagnóstico possível, e a
conclusão errada de que "não funciona". Uma variável por vez é mais lento nas
duas primeiras semanas e mais rápido a partir da terceira.
