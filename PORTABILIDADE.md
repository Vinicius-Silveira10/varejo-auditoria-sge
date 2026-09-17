# PORTABILIDADE.md — usar o mesmo time em qualquer projeto

Você tem dois runtimes (`agy` e `opencode`), e eles se comportam **diferente**
quanto a escopo global. Não dá para tratar os dois com a mesma receita —
tentei e o `agy` tem um problema documentado que muda a estratégia.

---

## OpenCode — escopo global funciona de verdade

Confirmado por múltiplos projetos da comunidade que usam exatamente esse
padrão: agentes em `~/.config/opencode/agents/*.md` e regras em
`~/.config/opencode/AGENTS.md` são carregados **em qualquer projeto**, sem
precisar copiar nada por repositório.

```bash
mkdir -p ~/.config/opencode/agents
cp agentes-opencode/.opencode/agents/*.md ~/.config/opencode/agents/
cp AGENTS.md ~/.config/opencode/AGENTS.md
```

A partir daqui, todo projeto onde você rodar `opencode` já enxerga os 6
agentes. Não precisa `git clone` nem `cp` de novo.

**A única coisa que muda por projeto** é o conteúdo do `AGENTS.md`, porque a
estrutura de pasta (backend/frontend vs. Maven padrão Java) é diferente em
cada repo. Solução: mantenha a versão **global** com só as regras
universais (segredo, git, separação escrever/aprovar, protocolo de contexto) e
adicione um `AGENTS.md` **local** em cada projeto só com a tabela de estrutura
de pastas daquele repo especificamente. O OpenCode lê os dois — o global dá a
base, o local dá o detalhe do projeto.

```
~/.config/opencode/AGENTS.md          → regras universais (uma vez, para sempre)
<projeto>/AGENTS.md                   → estrutura de pastas DESSE projeto
```

---

## Antigravity CLI (agy) — escopo global tem bug confirmado

Aqui a notícia é diferente. Existe um bug relatado e reproduzido: o próprio
`agy` anuncia um caminho global na tela de criação de agente, mas o comando
`/agents` que lista os agentes disponíveis nunca escaneia essa pasta — só
projeto e plugin. Ou seja, **mesmo fazendo tudo certo, o agente global pode
não aparecer** na versão atual.

Solução que funciona sem depender de bug corrigido: **template + bootstrap**.
Em vez de "global de verdade", você tem um repositório-modelo e um script que
copia ele para dentro de qualquer projeto novo em um comando. Não é a mesma
coisa que escopo global nativo, mas resolve seu problema prático — você não
reescreve nada, só roda um comando.

```bash
mkdir -p ~/agentes-templates
cp -r agentes-antigravity/.agents ~/agentes-templates/
cp AGENTS.md HARNESS.md CONTEXTO-ZERO.md INTEGRACAO.md SKILLS-CURADAS.md \
   ~/agentes-templates/
cp novo-projeto.sh ~/agentes-templates/
chmod +x ~/agentes-templates/novo-projeto.sh
```

Depois, em qualquer projeto novo:

```bash
~/agentes-templates/novo-projeto.sh /caminho/do/novo/projeto
```

O script está no pacote (`novo-projeto.sh`) e copia a estrutura, cria os
diretórios de ledger, e commita. Reveja e ajuste a tabela de estrutura do
`AGENTS.md` gerado para bater com o projeto real antes de commitar — o script
não adivinha se o projeto é Java, JS ou outra coisa.

---

## O que já é portável por desenho, sem ação nenhuma sua

O `dev.md` foi generalizado nesta rodada: ele não assume mais `backend/**` e
`frontend/**` fixos. Agora ele **declara os diretórios reais** que vai tocar a
cada tarefa (detectados com ajuda do `scout` se precisar) e tem escrita
liberada em qualquer código de aplicação, exceto os caminhos sempre reservados
(`deploy/`, `.github/`, `docker-compose*`, `.agents/`, `docs/adr/`) — esses
sim são universais, porque `ci-cd` e `tech-lead` sempre precisam dessa reserva
independente do projeto.

A detecção de stack (Java vs. JavaScript/TypeScript, por `pom.xml`/`package.json`)
também já era genérica desde a rodada anterior — funciona sem ajuste em
qualquer repo novo.

---

## O que NÃO é portável — e não deveria ser

- **Skills instaladas.** Cada projeto tem sua própria pasta de skills; instalar
  `agent-browser`/`dogfood` globalmente faria o `qa-validator` de um projeto
  Java tentar testar via browser um serviço que não tem frontend. Instale
  skill por projeto, conforme a Camada 7 do `SKILLS-CURADAS.md`.
- **Ledger de tarefas** (`.agents/tasks/`) — é memória da tarefa daquele
  repositório especificamente, não faz sentido compartilhar entre projetos.
- **Regra de estrutura de pastas** no `AGENTS.md` — sempre local ao projeto,
  pelo motivo já explicado acima.

## Resumo de decisão

| Você quer... | Faça isto |
|---|---|
| Rodar `opencode` em qualquer projeto com o time pronto | Copie os 6 agentes para `~/.config/opencode/agents/` uma vez, para sempre |
| Rodar `agy` em qualquer projeto com o time pronto | Use `~/agentes-templates/novo-projeto.sh <novo-repo>` a cada projeto novo |
| Trocar a regra de negócio universal (segredo, git, gate de aprovação) | Edite o `AGENTS.md` global do OpenCode e o template do Antigravity — os dois, senão eles divergem |
| Trocar a estrutura de pastas de um projeto específico | Edite só o `AGENTS.md` **daquele** repositório |
