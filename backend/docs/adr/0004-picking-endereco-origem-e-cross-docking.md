# ADR-004: Distinção entre Estoque Armazenado e Estoque em Cross-Docking no Picking

**Data:** 2026-07-12
**Status:** ACEITO
**Autores:** Equipe Backend SGE Fortal
**Referências:** Bug Report — PickOrderUseCase não decrementava `ocupado` do Endereço

---

## Contexto

O sistema SGE Fortal modela duas grandezas distintas para cada `Lote`:

1. **Saldo Contábil** (`Lote.quantidade`): quantas unidades do lote existem no estoque
   geral. Criado no Recebimento, decrementado em toda expedição independentemente da
   posição física.

2. **Posição Física** (derivada de `Movimentacao`): em qual(is) `Endereco`(s) do armazém
   aquelas unidades estão fisicamente alocadas — ou se ainda não foram alocadas (cais
   de recebimento / cross-docking).

Antes desta ADR, o `PickOrderUseCase` tratava as duas grandezas como equivalentes:
debitava o saldo contábil corretamente, mas nunca atualizava a posição física. O resultado
era:

- `Endereco.ocupado` nunca decrementado após expedir → inflação permanente de ocupação.
- `suggest-putaway` sugerindo endereços como "cheios" quando já haviam sido liberados.
- Cálculo de "lotes pendentes de putaway" incorreto para lotes armazenados e depois expedidos.

---

## Decisão

### 1. Separar Cross-Docking de Picking com Origem Física

Um pick pode resultar em dois tipos de `Movimentacao` de `EXPEDICAO`:

| Tipo de expedição | `enderecoOrigemId` | Efeito em `Endereco.ocupado` |
|------------------|--------------------|------------------------------|
| **Armazenado → expedido** | Preenchido com o ID do endereço | Decrementado atomicamente |
| **Cross-docking** (nunca armazenado) | `null` | Nenhum efeito |

O `PickOrderUseCase` determina qual caso se aplica consultando
`IMovementRepository.findAllocationByLote(loteId)` antes de executar a transação.

### 2. Algoritmo de Seleção de Endereços no Pick

Quando um lote está distribuído em múltiplos endereços:

1. Consultar `findAllocationByLote` → retorna `[{ enderecoId, quantidadeAlocada }]`
   ordenados por **maior alocação primeiro** (estratégia "esvaziar antes de fragmentar").
2. Consumir cada endereço até satisfazer a quantidade do pick.
3. Se a quantidade total alocada em endereços for menor que a quantidade do pick,
   o restante é tratado como cross-docking (`enderecoOrigemId: null`).

**Exemplo T6** (validado nos testes):
- 40 unidades no Endereço A, 30 no Endereço B, pick de 50.
- Resultado: retira 40 de A (esvazia), retira 10 de B.
- `Endereco A.ocupado`: 40 → 0. `Endereco B.ocupado`: 30 → 20.

### 3. Fórmula de Estoque Pendente de Putaway (ADR-001)

```
Pendente(lote) = Lote.quantidade − SUM(ARMAZENAGEM) + SUM(EXPEDICAO com enderecoOrigemId IS NOT NULL)
```

**Raciocínio completo:**
- `Lote.quantidade`: saldo contábil atual (já descontadas todas as expedições).
- `−SUM(ARMAZENAGEM)`: desconta o que foi fisicamente colocado em endereços (histórico
  imutável de auditoria — registros de ARMAZENAGEM nunca são excluídos).
- `+SUM(EXPEDICAO com origemId)`: compensa o fato de que quando um item é expedido
  *de um endereço físico*, a ARMAZENAGEM original permanece no histórico mas o item
  não está mais lá. Sem essa compensação, o cálculo ficaria negativo.

**Tabela de validação:**

| Cenário | `Lote.qtd` | `−SUM_ARM` | `+SUM_EXP_c_origem` | `Pendente` |
|---------|-----------|-----------|---------------------|-----------|
| T0: Recém-recebido | 100 | 0 | 0 | **100** |
| T1: 100% armazenado | 100 | 100 | 0 | **0** |
| T2: 60% armazenado | 100 | 60 | 0 | **40** |
| T3: 100% arm. + 30 expedidos de endereço | 70 | 100 | 30 | **0** |
| T4: 30 cross-docking (sem endereço) | 70 | 0 | 0 | **70** |
| T5: 60 arm. + pick misto (20 end. + 10 cross) | 70 | 60 | 20 | **30** |
| T6: 70 arm. (40A+30B) + pick 50 (40A+10B) | 50 | 70 | 50 | **30** |

### 4. `findAllocationByLote` — Novo Método de Repositório

Implementado em `PrismaMovementRepository` via `$queryRaw`:

```sql
SELECT enderecoId, SUM(quantidade) AS quantidadeAlocada
FROM (
  SELECT enderecoDestinoId AS enderecoId, quantidade
  FROM Movimentacao
  WHERE loteId = $loteId AND tipo = 'ARMAZENAGEM' AND enderecoDestinoId IS NOT NULL

  UNION ALL

  SELECT enderecoOrigemId AS enderecoId, -quantidade
  FROM Movimentacao
  WHERE loteId = $loteId AND tipo = 'EXPEDICAO' AND enderecoOrigemId IS NOT NULL
) movs
GROUP BY enderecoId
HAVING SUM(quantidade) > 0
ORDER BY SUM(quantidade) DESC
```

---

## Consequências

### Positivas
- `Endereco.ocupado` agora reflete fielmente o estado físico do armazém.
- `suggest-putaway` passa a receber dados precisos de capacidade disponível.
- `get-pending-putaway` usa uma fórmula matematicamente correta e documentada.
- Cross-docking é suportado nativamente sem flags especiais ou estados adicionais.

### Neutras
- A busca de alocação por lote adiciona uma query por lote no estágio de seleção
  do pick (antes da transação). Em volumes altos, isso pode ser otimizado com um
  `GROUP BY` único para todos os lotes do pedido — registrado como débito técnico futuro.

### Restrições para desenvolvimento futuro
- **Toda** movimentação que retira fisicamente um item de um endereço deve preencher
  `enderecoOrigemId`. Qualquer novo caso de uso de saída física (transferência entre
  endereços, devolução, etc.) deve seguir este contrato.
- **Nunca** deletar ou editar registros de `Movimentacao` — a cadeia de auditoria
  e a fórmula de posição física dependem da imutabilidade do histórico.

---

## Tipos de Movimentação Conhecidos

| Tipo | Altera `Lote.quantidade` | Altera `Endereco.ocupado` | `enderecoOrigemId` | `enderecoDestinoId` |
|------|--------------------------|---------------------------|--------------------|--------------------|
| `ENTRADA` | +N | — | null | null |
| `ARMAZENAGEM` | **Não** | +N em destino | null | obrigatório |
| `EXPEDICAO` (com endereço) | −N | −N em origem | obrigatório | null |
| `EXPEDICAO` (cross-docking) | −N | — | null | null |
| `SAIDA` | −N | — | null | null |
| `AJUSTE` | ±N | — | null | null |
| `INVENTARIO` | ±N | — | null | null |
