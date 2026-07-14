# ADR-005: Estratégia de Locking e Prevenção de Deadlock (ChainPointer)

## Contexto
O SGE Fortal possui uma trilha de auditoria encadeada via hash, onde cada novo registro de `Movimentacao` ou `LogCusto` aponta para o hash do registro anterior (`previousHash`). A obtenção deste `previousHash` é feita através da tabela de controle singleton `ChainPointer`.

Durante testes de concorrência real, identificamos duas categorias graves de vulnerabilidade na camada de banco de dados:

1. **Race Condition (Corrupção da Cadeia):** Transações não relacionadas liam o mesmo `lastHash` do `ChainPointer` simultaneamente (`READ COMMITTED`), causando a criação de "forks" na cadeia (dois registros apontando para o mesmo `previousHash`).
2. **Deadlock Estrutural (PG Error `40P01`):** Transações adquiriam locks em ordens diferentes. Durante testes práticos, flagramos um deadlock irreversível entre a expedição e movimentação avulsa. O cenário real provado:
   - **Transação A (PickOrder):** Atualizava o Lote A, adquiria o lock do `ChainPointer` (ao criar Movimentacao), e depois tentava atualizar o Lote B.
   - **Transação B (RegisterMovement):** Iniciava paralelamente, atualizava o Lote B, e depois tentava adquirir o lock do `ChainPointer`.
   - **Resultado:** A bloqueia B (ChainPointer), B bloqueia A (Lote B). O Postgres detecta a anomalia (Error Code `40P01`) e aborta uma das transações violentamente.

A prova criptográfica de regressão deste deadlock foi incorporada no teste automatizado `test/picking-deadlock.e2e-spec.ts`.

## Decisão
Foi adotada uma estratégia dupla de proteção na infraestrutura transacional do SGE:

### 1. Atomicidade de Escrita (Pessimistic Lock)
Uso de `SELECT ... FOR UPDATE` explícito na leitura do `ChainPointer` imediatamente antes do registro ser inserido, impedindo que transações concorrentes leiam versões obsoletas.

### 2. Convenção de Ordem de Aquisição de Locks
Para prevenir Deadlocks (Lock Ordering), estabeleceu-se uma convenção restrita de que os locks devem ser adquiridos **Sempre da Entidade Mais Alta para a Mais Baixa (Infraestrutura)**:

1. **Recursos de Domínio Primários**: Entidades amplas (`Produto`).
2. **Recursos de Domínio Secundários**: Entidades filhas (`Lote`).
3. **Recursos de Domínio Locacionais**: Entidades de armazenamento (`Endereco`).
4. **Ponteiro de Auditoria (ChainPointer)**: O recurso final de infraestrutura. **SEMPRE O ÚLTIMO LOCK ADQUIRIDO NA TRANSAÇÃO**.

Quando múltiplos itens do mesmo recurso precisarem de lock, eles devem ser adquiridos em ordem estritamente crescente (ID). Exemplo da técnica de mitigação aplicada no `PickOrderUseCase`:
```typescript
const uniqueLoteIds = [...new Set(pickSources.map((s) => s.loteId))].sort((a, b) => a - b);
for (const loteId of uniqueLoteIds) {
  await ctx.lockForUpdate('Lote', loteId);
}
```

### Mapa Exato de Lock Ordering nos Use Cases (Estado Atual)
Todos os fluxos que tocam no `ChainPointer` (que criam Movimentação) devem obedecer este mapa validado:
1. **`approve-adjustment`**: `Lote` → `ChainPointer`
2. **`reject-adjustment`**: `Lote` → `ChainPointer`
3. **`register-movement`**: `Lote` → `Endereco` (se presente, via update) → `ChainPointer`
4. **`pick-order`**: `Lote` (múltiplos ordenados ASC) → `Endereco` (via update) → `ChainPointer`
5. **`execute-putaway`**: `Lote` → `Endereco` → `ChainPointer`
6. **`receive-batch` (Recebimento Avulso)**: `Produto` → `ChainPointer` (Gera Movimentação de ENTRADA na doca, sem Endereço)
7. **`process-nfe` (Recebimento via NF-e)**: `Produto` → `ChainPointer` (Invoca o mesmo fluxo de receive-batch para gerar ENTRADA)

---

## ⚠️ INSTRUÇÃO CRÍTICA PARA DESENVOLVIMENTO FUTURO ⚠️
**QUALQUER NOVO USE CASE que crie `Movimentacao` ou toque no `ChainPointer` DEVE adquirir todos os locks de domínio (`Lote`/`Produto`/`Endereco`) explicitamente no início da transação (usando `unitOfWork.lockForUpdate`), em ordem alfabética/determinística quando múltiplos recursos do mesmo tipo estiverem envolvidos, ANTES de invocar o `movementRepository.create()`.**

---

## Consequências
- **Positivas:** 
  - Fim absoluto dos Forks Criptográficos na cadeia de hash.
  - Eliminação de falhas catastróficas (Deadlock `40P01`) causadas por disputa reversa de locks.
- **Negativas:** 
  - Aumenta a rigidez do código. Desenvolvedores devem estar sempre cientes da necessidade explícita de `ctx.lockForUpdate(...)` no topo de transações complexas, caso contrário os deadlocks voltarão.

## Status
Aceito e Implementado. Validado via Teste de Estresse E2E (concorrência paralela maciça em ChainPointer) e Teste Determinístico de Deadlock no Picking.
