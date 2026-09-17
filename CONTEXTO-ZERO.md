# CONTEXTO-ZERO.md — protocolo de contexto por tarefa

O problema que isto resolve: quanto mais longa a conversa, mais o agente
deriva. Ele começa a misturar decisões de tarefas anteriores, repete passos já
feitos, contradiz o que ele mesmo definiu 40 mensagens atrás. A causa não é o
modelo ser ruim — é a janela de contexto acumulando ruído (saída de teste, log,
trecho de arquivo, tentativa abandonada).

A solução não é "lembrar melhor". É **lembrar em arquivo, esquecer em contexto**.

---

## Princípio

> Contexto é efêmero. Artefato é durável.
> Se a informação precisa sobreviver ao fim da conversa, ela mora em arquivo.

Zerar contexto sem artefato durável é amnésia. Zerar contexto **com** artefato
durável é higiene.

---

## Metade do trabalho já está feita

Isto é importante e pouca gente sabe: **no Antigravity, o subagente já nasce com
contexto limpo.** A documentação é explícita — o subagente executa com o modelo
especificado mas *não herda a janela de conversa do pai*, começando do zero.

Consequência prática para o seu time: toda vez que o `tech-lead` invoca `dev`,
`qa-validator`, `scout`, `security-reviewer` ou `ci-cd`, aquele subagente já
está sem nenhuma contaminação da conversa anterior. Você não precisa fazer nada
para isso acontecer — é o comportamento nativo.

O que falta é o outro lado: **o contexto do orquestrador**, que é o único que
persiste ao longo da tarefa. É nele que a deriva acontece.

---

## As 5 regras do protocolo

### 1. Uma tarefa = uma conversa = uma worktree

Nunca reaproveite uma conversa do `agy` para uma tarefa nova. Nunca.
No Antigravity cada conversa é um armazenamento separado — conversa nova é
contexto limpo de verdade, não uma limpeza cosmética.

```
tarefa nova → worktree nova no Orca → conversa nova no agy → ledger novo
```

No OpenCode, sessão nova. E `subagent_depth: 1` garante que a árvore não cresça.

### 2. O ledger é a memória

`.agents/tasks/<YYYY-MM-DD>-<slug>.md`, criado pelo `tech-lead` a partir do
template. É a única coisa que sobrevive ao fim da conversa. O `tech-lead`
atualiza **a cada rodada de delegação**, não no final — se o contexto morrer no
meio, o que estiver escrito é tudo que resta.

Essa é a razão pela qual dei ao `tech-lead` escrita em `.agents/tasks/**`
(antes ele era totalmente read-only). Sem isso, o protocolo não funciona.

### 3. O `scout` carrega o peso da leitura

O orquestrador não lê a árvore de arquivos. Ele pergunta ao `scout`, que lê
muito, devolve ~40 linhas de briefing, e tem o próprio contexto descartado.

Isso é *context offloading*: o custo da exploração fica no subagente
descartável, não no orquestrador que precisa durar a tarefa inteira.

### 4. Evidência pesada vai para arquivo, não para o contexto

Relatório do `qa-validator` com screenshots → `reports/`. Para o orquestrador
volta só o resumo classificado. Log de build de 400 linhas → arquivo, não
colado na conversa.

### 5. Sinais de deriva = parar e zerar

Pare imediatamente se notar qualquer um destes:

- o agente repete um passo que já foi feito;
- contradiz uma decisão registrada no ledger;
- "esquece" uma restrição do `AGENTS.md`;
- começa a pedir confirmação de coisas já confirmadas;
- as respostas ficam genéricas, longas e pouco específicas ao projeto.

Não tente corrigir com mais prompt — isso só adiciona ruído. Rode o handoff,
feche a conversa, abra outra.

---

## O comando de virada: `handoff`

A skill `handoff` (mattpocock/skills, auditada Safe / 0 alertas / risco baixo)
faz exatamente o que este protocolo precisa: comprime a conversa atual em um
documento de passagem para que um agente novo continue o trabalho.

Detalhes que a tornam adequada aqui: ela instrui a **não duplicar** conteúdo já
capturado em specs, planos, ADRs, issues, commits ou diffs — referencia por
caminho em vez de copiar. E instrui a **redigir informação sensível** (chave,
senha, PII) fora do documento.

```bash
npx skills add https://github.com/mattpocock/skills --skill handoff
```

Uso: `/handoff` (ou peça "gere o handoff desta tarefa") → o doc é gerado →
você abre conversa nova → cola o doc + aponta o ledger → segue o trabalho.

---

## Fluxo completo de uma tarefa

```
1. Orca: criar worktree da tarefa
2. agy: conversa NOVA
3. tech-lead: criar .agents/tasks/<data>-<slug>.md a partir do template
4. tech-lead → scout: "levante o terreno de X"        [contexto do scout descartado]
5. tech-lead: escrever objetivo/contrato/aceite no ledger
6. tech-lead → dev: implementar                        [dev nasce limpo]
7. tech-lead: atualizar ledger
8. tech-lead → qa-validator: testar                    [nasce limpo, evidência em reports/]
9. tech-lead: atualizar ledger
10. tech-lead → security-reviewer: aprovar             [nasce limpo, julga sem narrativa]
11. REPROVADO? volta ao passo 6. APROVADO? passo 12.
12. tech-lead: fechar ledger com estado final
13. Humano: ler o diff inteiro, fazer o merge
14. Encerrar a conversa. Não reutilizar.
```

Se em qualquer ponto a conversa ficar longa demais: `handoff` → conversa nova →
retomar do ledger. O fluxo não perde nada, porque nada importante estava só no
contexto.

---

## Tarefas grandes demais para uma sessão

Existe uma skill específica para isso: `wayfinder`. Ela planeja trabalho que não
cabe numa sessão só, transformando em um mapa de tickets de decisão no issue
tracker, resolvidos um por vez. Cada ticket é dimensionado para caber numa
sessão — que é precisamente o problema que você está tentando resolver.

Instale só quando chegar nesse porte de tarefa. Antes disso, é complexidade sem
retorno.

```bash
npx skills add https://github.com/mattpocock/skills --skill wayfinder
```

---

## O que este protocolo não resolve

Contexto limpo reduz deriva; não elimina erro. Um agente com contexto perfeito
ainda escreve código errado. Por isso o protocolo não substitui nenhum dos
controles do `HARNESS.md` — ele se soma a eles. O `security-reviewer` continua
sendo o gate, e o CI continua sendo o portão real.
