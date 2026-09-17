# AGENTS.md — Projeto Supermercado

Lido por qualquer agente que abra este repositório. Coloque na raiz.
Complementos: `HARNESS.md` (controles de segurança) e `CONTEXTO-ZERO.md`
(protocolo de contexto por tarefa).

## Estrutura

```
backend/              API e regras de negócio
frontend/             interface
deploy/ .github/      infraestrutura e CI
tests/ e2e/ reports/  saída do qa-validator
.agents/tasks/        ledger das tarefas (memória durável)
docs/adr/             decisões de arquitetura
```

## O time

| Agente | Papel | Escreve em | Aprova? |
|---|---|---|---|
| `tech-lead` | orquestra, mantém o ledger | `.agents/tasks/`, `docs/adr/` | não |
| `scout` | levanta o terreno, protege o contexto | nada | não |
| `dev` | implementa backend e frontend | `backend/`, `frontend/` | não |
| `qa-validator` | testa (unitário + navegador real) | `tests/`, `e2e/`, `reports/` | não |
| `security-reviewer` | audita e dá veredito | nada | **sim, é o único** |
| `ci-cd` | pipeline, container, observabilidade | `deploy/`, `.github/` | não |

Fluxo: **scout levanta → tech-lead planeja → dev implementa → qa-validator testa
→ security-reviewer aprova → tech-lead fecha o ledger → humano faz o merge**.

## Regras inegociáveis

1. **Segredos.** Ninguém lê, edita ou commita `.env`/`.env.staging` real.
2. **Sem `git push`, sem `--force`, sem deploy, sem migração remota.**
3. **Quem escreve não aprova.** Sempre via `security-reviewer`.
4. **`qa-validator` só testa `localhost` e staging, com usuário sintético.**
5. **Uma tarefa = uma conversa = uma worktree = um ledger.** Nunca reaproveite conversa.
6. **Estado importante vai para o ledger**, não fica só no contexto.
7. **Fora do escopo? Devolve ao `tech-lead`**, não contorna.
8. **Sem desabilitar teste, lint ou verificação de segurança** para passar o build.

## Definition of Done

- [ ] Critério de aceite do ledger atendido
- [ ] `dev`: código + teste + tratamento de erro + log sem PII
- [ ] `qa-validator`: relatório sem `CRITICO` em aberto
- [ ] `security-reviewer`: veredito `APROVADO`
- [ ] Ledger atualizado com estado final
- [ ] Contrato/documentação atualizados se a API mudou

## Comandos do projeto

> Preencha com os comandos reais. Sem isto, os agentes adivinham.

```bash
# instalar
# build
# testes
# lint
```
