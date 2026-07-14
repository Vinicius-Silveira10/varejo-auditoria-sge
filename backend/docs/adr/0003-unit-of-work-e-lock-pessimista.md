# ADR 0003: Adoção de Unit of Work e Lock Pessimista para Cálculo de Custos

## Status
Aceito

## Contexto
O cálculo de Custo Médio Ponderado (CMP) estava sendo enfileirado para processamento assíncrono (GAP-009 Original) para não bloquear o thread principal do recebimento. No entanto, o sistema permite múltiplos recebimentos concorrentes para o mesmo produto (ex: múltiplas docas bipando ao mesmo tempo). O processamento assíncrono via filas (BullMQ) gerava race conditions, pois duas threads poderiam ler o saldo antigo simultaneamente e sobrescrever o cálculo um do outro, resultando em distorção do CMP e dos registros de LogCusto.

Além disso, identificou-se que o sistema possuía transações fragmentadas e métodos *ad-hoc* de transação (ex: `executeMovementTransaction`) que violavam a Clean Architecture por acoplar os casos de uso diretamente a detalhes do Prisma.

## Decisão
1. **Padrão Unit of Work**: Implementou-se formalmente a interface `IUnitOfWork` (e sua implementação `PrismaUnitOfWork`), centralizando todas as transações atômicas do sistema. Casos de uso como Ajuste, Movimentação, Expedição e Recebimento foram refatorados para consumir o `IUnitOfWork` via injeção de dependências.
2. **Lock Pessimista para Custo**: O cálculo do CMP foi trazido de volta para o processamento síncrono no `ReceiveBatchUseCase` dentro do callback do Unit of Work. Utilizou-se lock pessimista explícito (`SELECT ... FOR UPDATE`) no Produto, forçando que requisições concorrentes aguardem o término do recálculo antes de iniciarem, preservando a consistência do custo médio e de lote.
3. **Remoção de Infraestrutura Órfã**: O worker `CostQueueProcessor` e o `QueueModule` foram completamente removidos, já que o recálculo voltou a ser integrado no ciclo de vida transacional.

## Consequências
* **Positivas**:
  * Consistência garantida: testado com concorrência real (`Promise.all`), confirmando a atomicidade das inserções e precisão do CMP.
  * Código limpo e abstraído: Repositórios pararam de expor dependências de ORM para métodos transacionais complexos.
  * Menos pontos de falha: Remoção de mensageria para uma tarefa que demandava forte acoplamento ACID.
* **Negativas**:
  * O recebimento de lotes ficará levemente mais lento se o mesmo produto estiver recebendo alta carga simultânea, já que os processos ficarão retidos na fila do banco aguardando liberação do row-lock. Para o cenário operacional de um supermercado, esse custo é irrelevante frente ao ganho de precisão contábil.
