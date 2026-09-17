# HARNESS.md — Engenharia de harness do time Supermercado

`Agente = Modelo + Harness`. O modelo (Gemini 3.x, no seu caso) fornece
raciocínio. O harness é tudo que transforma esse raciocínio em comportamento
confiável: quais ferramentas o agente enxerga, o que ele pode escrever, o que
precisa de aprovação, e o que é proibido de qualquer forma. Este documento
declara o harness de cada peça do time — nada fica implícito no prompt.

## Topologia

```
              tech-lead (orquestrador, mainAgent)
              escreve SÓ .agents/tasks/ e docs/adr/
                          │
     ┌────────┬───────────┼───────────┬──────────┐
     ▼        ▼           ▼           ▼          ▼
  scout     dev      qa-validator  security-  ci-cd
 (read-   (escreve    (escreve em   reviewer  (escreve
  only)    backend+    tests/,      (read-     deploy/,
           frontend)   e2e/,         only,     .github/)
                       reports/)     aprova)
```

`subagent_depth: 1` (OpenCode) / limite de aninhamento do Antigravity: nenhum
subagente invoca outro subagente. Toda comunicação passa pelo `tech-lead`. Isso
não é burocracia — é o que impede recursão descontrolada e mantém uma trilha de
auditoria linear: sempre dá para responder "quem pediu isso e por quê".

## Os 7 controles de harness aplicados

### 1. Menor privilégio por ferramenta, não por confiança
Cada agente só enxerga as ferramentas que a função exige. `security-reviewer`
não tem `write`/`edit` no frontmatter — não porque "confiamos menos" nele, mas
porque a função de aprovar exige, por definição, não poder alterar o que está
aprovando. Isso é forçado na configuração, não pedido no prompt.

### 2. Escopo de escrita por caminho de arquivo
| Agente | Escreve em |
|---|---|
| `tech-lead` | `.agents/tasks/**`, `docs/adr/**` (ledger e ADR, nunca código) |
| `scout` | nada |
| `dev` | `backend/**`, `frontend/**` |
| `qa-validator` | `tests/**`, `e2e/**`, `reports/**` |
| `ci-cd` | `deploy/**`, `.github/**`, `docker-compose*.yml` |
| `security-reviewer` | nada |

Nenhum agente tem escopo de escrita sobreposto com outro. Se uma tarefa parece
exigir que dois agentes escrevam no mesmo caminho, isso é sinal de que o
`tech-lead` errou a decomposição — não uma exceção a abrir.

### 3. Separação entre execução e aprovação
O controle mais importante do time inteiro. `dev` implementa. `security-reviewer`
aprova. Nunca a mesma entidade. Isso vale mesmo sob pressão de prazo — é
justamente sob pressão que esse controle mais evita erro caro.

### 4. Contenção da ferramenta de maior risco
`qa-validator` usa automação de navegador real (skill com classificação de
**risco alto** em auditoria de segurança — ela controla um Chrome de verdade via
protocolo de depuração). O harness contém esse risco com regras absolutas
embutidas no próprio agente, não deixadas para o bom senso do modelo no momento:
- Alvo permitido: `localhost` e staging. Produção nunca.
- Credencial: só usuário de teste sintético. Nunca conta real.
- Execução sempre em worktree isolada do Orca.

### 5. Verificação antes de declarar concluído
Todo agente que escreve carrega a skill `verification-before-completion`. Ela
existe porque o erro mais comum de agente hoje não é escrever código ruim — é
declarar "terminei" sem ter checado se realmente terminou. O `security-reviewer`
trata isso como item de auditoria: se o `qa-validator` aponta `CRITICO` não
resolvido, é `BLOQUEANTE` automático, mesmo que o `dev` diga que está pronto.

### 6. Contexto é efêmero, artefato é durável
Toda tarefa roda em conversa nova, worktree nova e ledger novo. Os subagentes do
Antigravity já nascem sem herdar a janela de conversa do pai — o harness aproveita
isso e adiciona o que falta: um ledger em `.agents/tasks/` que carrega o estado
entre conversas, e o `scout`, que absorve o custo da exploração para o contexto
do orquestrador não saturar. Detalhe completo em `CONTEXTO-ZERO.md`.

Essa é a razão da única expansão de privilégio em relação ao desenho anterior:
o `tech-lead` deixou de ser totalmente read-only e ganhou escrita restrita a
`.agents/tasks/**` e `docs/adr/**`. Sem alguém escrevendo o ledger, zerar
contexto vira perda de informação em vez de higiene.

### 7. Ação irreversível é sempre humana
`git push`, deploy em staging/produção, migração contra banco remoto, alteração
de proteção de branch ou secret do CI: proibido para **todos** os agentes, sem
exceção de papel. O harness não delega o que não pode ser desfeito.

## O que cada agente não pode fazer, por desenho

| Restrição | Vale para |
|---|---|
| Ler `.env*` real | todos |
| `git push` / `--force` / deploy | todos |
| Migração contra banco remoto | todos |
| Editar arquivo fora do próprio escopo | todos |
| Escrever código de produção | `security-reviewer`, `tech-lead`, `scout` |
| Executar qualquer comando | `scout`, `security-reviewer` (bash negado) |
| Aprovar o próprio trabalho | `dev` (precisa do `security-reviewer`) |
| Testar contra produção ou com credencial real | `qa-validator` |
| Alterar segredo/permissão do CI | `ci-cd` |

## Onde o harness ainda depende de você

Nenhum harness de prompt substitui controle de plataforma. Três coisas ficam
fora do arquivo `.md` do agente e precisam existir na infraestrutura real:

1. **Sandbox de terminal ligado** (`enableTerminalSandbox: true` no Antigravity).
   Sem isso, o `commandExecutionPolicy: sandbox` do frontmatter é decorativo.
2. **CI como portão de verdade.** O agente pode errar; o pipeline com lint, teste,
   SAST e scan de segredo como *status check* obrigatório é o que realmente barra
   o merge, independente do que qualquer agente concluiu sobre si mesmo.
3. **Revisão humana em `deploy/`, `.github/` e migrações** via `CODEOWNERS`. O
   `security-reviewer` é gate de agente; isso aqui é o gate humano final.

## Por que 5 subagentes e não mais

Cada subagente adicional aumenta a superfície de coordenação do `tech-lead` e o
custo de auditoria. Cinco é o número onde cada papel ainda mapeia para uma
responsabilidade única e não ambígua: **levantar, implementar, testar, aprovar,
publicar**.

O `scout` foi adicionado por um motivo específico e verificável: sem ele, o
orquestrador precisa ler o código ele mesmo, e o contexto que você quer manter
limpo satura justamente na fase de exploração. Ele é o único papel cujo valor
principal não é o que ele produz, mas o que ele **impede de entrar** no contexto
do orquestrador.

Não adicionei um sexto. As duas candidaturas que considerei e recusei:
- **`scribe`** (manter ledger e ADR): a responsabilidade é do orquestrador, que
  já é o autor do plano. Virou expansão de privilégio no `tech-lead`, não agente novo.
- **`arquiteto de dívida técnica`**: real, mas é trabalho periódico, não por
  tarefa. Vira a skill `improve-codebase-architecture` rodada a cada 2–3 semanas.

Se no futuro `dev` virar gargalo, a divisão natural é separar back/front.
