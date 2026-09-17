# Instalação — time de subagentes (Antigravity CLI + OpenCode)

## 1. Antigravity CLI (`agy`)

Agentes customizados são descobertos automaticamente em:

| Escopo | Caminho |
|---|---|
| Projeto | `.agents/agents/<nome>.md` |
| Global (todos os repos) | `~/.gemini/config/agents/<nome>.md` |
| Plugin | `plugins/<nome>/agents/` |

Copie a pasta do projeto:

```bash
cd /mnt/c/Users/Vinicius/Supermercado
cp -r agentes-antigravity/.agents .
cp AGENTS.md .
```

Verifique com `/agents` dentro do `agy`. Subagentes com `subagent: true` passam a
ser invocáveis pelo agente principal via `invoke_subagent`; `tech-lead` tem
`mainAgent: true` e aparece como agente primário selecionável.

> **Atenção ao campo `tools`.** A documentação do Antigravity avisa que um nome de
> ferramenta inexistente ou digitado errado pode travar o subagente em execução.
> Confira os nomes disponíveis na sua versão (`agy` → `/agents`) antes de ampliar
> as listas. Usei apenas nomes documentados: `view_file`, `grep_search`,
> `replace_file_content`, `run_command`.

### Segurança — ative isto antes de usar o time

`~/.gemini/antigravity-cli/settings.json`:

```json
{
  "enableTerminalSandbox": true,
  "permissions": {
    "allow": [
      "command(git status)",
      "command(git diff)",
      "command(git log)",
      "command(npm test)",
      "command(npm run lint)",
      "command(npm run build)"
    ],
    "deny": [
      "command(rm -rf)",
      "command(git push)",
      "command(docker compose up)",
      "command(curl)",
      "command(chmod 777)"
    ]
  }
}
```

O sandbox usa recursos nativos do SO (nsjail no Linux, `sandbox-exec` no macOS,
AppContainer no Windows) e vem **desligado por padrão**. Ligue.

### Pare de usar `--dangerously-skip-permissions`

No seu print o CLI está subindo com essa flag. Ela remove o portão de aprovação —
justamente o mecanismo que faz o modelo de permissão mínima deste time funcionar.
Um subagente com escrita liberada e zero confirmação, rodando em cima do seu
`/mnt/c/Users/Vinicius/`, é exatamente o cenário que nenhuma equipe séria aceita hoje.

Use em vez disso:

```bash
agy                 # e configure o nível em /permissions
```

Se quiser autonomia alta, o caminho certo é **sandbox ligado + allowlist de
comandos + worktree isolada**, não desligar a checagem.

## 2. OpenCode

Agentes em Markdown ficam em:

| Escopo | Caminho |
|---|---|
| Projeto | `.opencode/agents/<nome>.md` |
| Global | `~/.config/opencode/agents/<nome>.md` |

```bash
cd /mnt/c/Users/Vinicius/Supermercado
cp -r agentes-opencode/.opencode .
```

> Versões mais antigas do OpenCode usavam `agent/` (singular) em vez de `agents/`.
> Se os agentes não aparecerem, renomeie a pasta e teste de novo.

Em `opencode.json` do projeto, trave a profundidade de delegação e o agente padrão:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "default_agent": "tech-lead",
  "subagent_depth": 1
}
```

`subagent_depth: 1` é o padrão: agentes primários podem lançar subagentes, mas
subagentes não lançam outros. Mantenha assim — é o que evita recursão e gasto
descontrolado.

O `tech-lead` invoca os outros pelo nome, **sem `@`** (o `@` é só para você chamar
manualmente no chat).

## 3. Orca — uma worktree por frente de trabalho

Você já tem `main` e `betta` como worktrees. O padrão que funciona:

- Uma worktree = uma tarefa = uma sessão de agente. Nunca dois agentes escrevendo
  na mesma árvore.
- `backend-dev` e `frontend-dev` podem rodar em paralelo em worktrees separadas
  quando o contrato já está fechado.
- O setup script do Orca (aquele card "Add a setup script" no seu print) é o lugar
  certo para: instalar dependências, copiar `.env.staging.example` → `.env` local e
  rodar o healthcheck. Assim toda worktree nova nasce pronta e sem segredo real.

## 4. O portão que realmente importa: CI

Prompt não é controle de segurança — é orientação. O que impede um agente de
quebrar o projeto é a esteira. Configure no repositório:

- Proteção de branch na `main`: PR obrigatório, aprovação humana, status checks.
- No CI: lint, testes, **scan de segredo** (gitleaks/trufflehog) e **SAST**
  (semgrep/CodeQL) como checks bloqueantes.
- `permissions: read-all` como base no workflow; eleve só onde precisar.
- Ações de terceiros fixadas por SHA, não por tag.
- `CODEOWNERS` exigindo revisor humano em `deploy/`, `.github/` e migrações.
- Pre-commit hook com gitleaks, para o segredo nunca chegar ao histórico.

## 5. Um alerta sobre `.env.staging`

Na sua árvore de arquivos, `.env.staging` aparece ao lado de
`.env.staging.example`. Verifique agora se ele está no `.gitignore` e se nunca foi
commitado:

```bash
git check-ignore -v .env.staging
git log --oneline -- .env.staging
```

Se houver histórico, considere as credenciais comprometidas: rotacione as chaves e
limpe o histórico (`git filter-repo`) antes de dar acesso de leitura ampla a
qualquer agente.

## 6. Ordem sugerida de adoção

1. `AGENTS.md` na raiz + `.gitignore` e segredos auditados.
2. CI com os checks bloqueantes.
3. Sandbox e allowlist ligados; remover `--dangerously-skip-permissions`.
4. `tech-lead` + `security-reviewer` (os dois read-only) — comece só com eles.
5. Depois de uma semana funcionando, habilite os três que escrevem.
