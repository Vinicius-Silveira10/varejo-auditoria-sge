# ADR 0001: Ajustes de estoque não alteram o Custo Médio Ponderado

## Status

Aceito

## Contexto

Durante a auditoria técnica do projeto SGE Fortal, foi identificada uma divergência
entre a especificação de negócio e a implementação do código:

- **Especificação (RN-AJU-005 / RN-CST-002):** "Ajuste afeta saldo, não custo.
  Não recalcular AVG" / "Inventário/ajuste não mudam CMP".
- **Código anterior:** O `approve-adjustment.use-case.ts` invocava
  `UpdateAverageCostUseCase.execute()` quando `ajuste.quantidadeDelta > 0`,
  recalculando o Custo Médio Ponderado do produto a cada ajuste positivo aprovado.

Além disso, durante a correção anterior (Bloco 2 da auditoria), foi identificado um
bug de ordenação: o recálculo de CMP era executado **após** a atualização do saldo
do lote, fazendo com que a fórmula usasse a quantidade já ajustada como "quantidade
anterior", inflando o resultado. Esse bug matemático foi corrigido invertendo a
ordem das chamadas, porém a chamada em si permaneceu ativa.

A presente decisão resolve a divergência de regra de negócio, removendo
completamente a chamada de recálculo de CMP do fluxo de aprovação de ajuste.

## Decisão

Ajustes de estoque (positivos ou negativos) **não recalculam** o Custo Médio
Ponderado do produto/lote. O CMP só é recalculado em fluxos de **entrada real
de mercadoria** (ex.: recebimento de NF-e via `ReceiveBatchUseCase` → fila
assíncrona → `CostQueueProcessor` → `UpdateAverageCostUseCase`).

### Mudanças aplicadas

| Arquivo | Ação |
|---|---|
| `approve-adjustment.use-case.ts` | Removido import, injeção e chamada de `UpdateAverageCostUseCase` |
| `adjustment.module.ts` | Removida factory e injeção de `UpdateAverageCostUseCase` e `ILogCustoRepository` |
| `approve-adjustment.use-case.spec.ts` | Removido mock de `UpdateAverageCostUseCase`; adicionados 2 testes explícitos validando que ajustes positivos e negativos NÃO alteram o custo médio |

## Justificativa

Um ajuste de estoque corrige uma divergência entre o saldo físico e o saldo de
sistema (contagem, perda, quebra, sobra). Ele **não representa uma nova aquisição
de produto com custo próprio**. Alterar o CMP nesse fluxo distorceria o custo
unitário do produto sem que houvesse uma transação de compra real por trás,
comprometendo:

1. A acurácia dos relatórios financeiros (margem bruta, valoração de estoque).
2. A rastreabilidade contábil (não haveria NF-e ou documento fiscal vinculado
   à alteração de custo).
3. A conformidade com as regras de negócio documentadas.

## Consequências

- O `UpdateAverageCostUseCase` continua existindo e sendo utilizado legitimamente
  no fluxo de recebimento de lotes (via fila BullMQ assíncrona).
- Se no futuro for necessário registrar uma entrada de produto não lançada
  anteriormente (com custo diferente do lote atual) através de um ajuste, essa
  operação deve ser tratada como um **novo tipo de operação** (ex.: "Entrada
  Retroativa" ou "Correção de NF-e"), com custo de aquisição explícito, e não
  misturada com o fluxo padrão de ajuste de contagem.
- Os testes automatizados agora validam explicitamente que `updateCustoMedio` não
  é chamado durante a aprovação de ajuste, servindo como guarda contra regressão.
