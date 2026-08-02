# ADR 0006: Extração da Regra de Alçada RN-AJU-004 para Função Pura do Domínio

## Status

Aceito

## Contexto

A regra de alçada de aprovação de ajustes de estoque (RN-AJU-004) define dois
limiares que determinam quem pode aprovar um ajuste:

- **GESTOR** → para ajustes cujo impacto seja ≤ 2% do saldo teórico do lote E
  valor absoluto ≤ R$ 1.000
- **GESTOR_CONTROLADORIA (ADMIN)** → para ajustes com impacto > 2% OU valor
  absoluto > R$ 1.000

Antes desta ADR, essa lógica estava **triplicada e implementada de forma
independente** em três lugares:

1. `request-adjustment.use-case.ts` — calculava `deltaPercent` e `valorDelta`
   com `if`s manuais para definir `nivelAprovacao` na criação.
2. `approve-adjustment.use-case.ts` — recalculava `deltaPercent` com `if`s
   manuais para decidir se o aprovador tinha alçada suficiente (enforcement).
3. `prisma-adjustment.repository.ts` → `findPending()` — recalculava
   `deltaPercent` e `valorDelta` (a partir do `custoMedio` **atual**) para
   exibir o nível na listagem de ajustes pendentes (display).

Os problemas identificados na duplicação:

- **Divergência possível entre Display e Enforcement**: o repositório usava
  `custoMedio` atual para calcular `valorDelta`, enquanto o use case de aprovação
  usava `ajuste.valorDelta` já persistido. Se o custo médio do produto mudasse
  entre a criação e a listagem, a tag exibida ao gestor poderia indicar um nível
  diferente do que o backend aplicaria ao tentar aprovar — gerando fricção de UX
  e confusão operacional.
- **Risco de regressão silenciosa**: qualquer alteração nos limiares (ex.: mudar
  de 2% para 5%) precisaria ser replicada nos três lugares, com alto risco de um
  deles ficar desatualizado.
- **Dificuldade de teste isolado**: nenhum teste unitário cobria a lógica em si
  de forma isolada — os testes dos use cases testavam comportamentos completos,
  mas não provavam que os três lugares convergiam.

## Decisão

Extrair a regra RN-AJU-004 para uma **função pura** no core do domínio:

```
src/core/domain/adjustment/adjustment.rules.ts
```

```typescript
export type NivelAprovacao = 'GESTOR' | 'GESTOR_CONTROLADORIA';

export function calcularNivelAprovacaoExigido(
  quantidadeDelta: number,
  valorDelta: number,       // valorDelta JÁ persistido — não recalcular com custoMedio atual
  saldoTeorico: number,     // saldoTeorico JÁ persistido — fotografia do saldo no instante da solicitação
): NivelAprovacao
```

**Mudança de assinatura relevante**: Os parâmetros da função usam `valorDelta` (o valor financeiro já calculado) e `saldoTeorico` (a fotografia do saldo) persistidos no banco no momento da criação do ajuste. Isso garante que o display e o enforcement sempre usem a mesma fotografia temporal, independentemente de variações futuras no custo médio do produto (impactando R$) ou no saldo atual do lote (impactando %).

Os três consumidores foram atualizados para importar e chamar essa função
exclusiva, removendo toda lógica inline.

## Prova de Consistência Estrutural

Um arquivo de testes dedicado foi criado para provar que Display e Enforcement
**nunca podem divergir**:

```
src/core/use-cases/adjustment/adjustment-level-consistency.spec.ts
```

A suíte contém **44 testes** em dois grupos:

### Grupo 4.3 — Cenários variados (42 testes)

14 cenários programáticos com deltas variados (abaixo do limiar, no limiar
exato, acima por percentual, acima por valor, saldo zero/negativo, gatilho
duplo) × 3 asserções cada:

1. O Display (`calcularNivelAprovacaoExigido`) retorna o nível esperado.
2. O Enforcement (`ApproveAdjustmentUseCase`) bloqueia GESTOR quando o nível
   for `GESTOR_CONTROLADORIA`, e libera quando for `GESTOR`.
3. Display e Enforcement concordam (são a mesma função).

### Grupo 4.4 — Prova estrutural com spy invertido (2 testes)

Usa `jest.spyOn` para **inverter** o retorno da função:

- **Teste 1**: dados pequenos (1%, R$10) → função mockada retorna
  `GESTOR_CONTROLADORIA` → UseCase **bloqueia** o GESTOR. Prova que o use case
  não tem `if` residual com dados brutos que deixaria passar.
- **Teste 2**: dados grandes (50%, R$5.000) → função mockada retorna `GESTOR`
  → UseCase **libera** o GESTOR. Prova que o use case não tem `if` residual com
  dados brutos que bloquearia mesmo com a função dizendo GESTOR.

Estes dois testes provam que a decisão de bloqueio é **100% delegada** à função
pura — tornando estruturalmente impossível que Display e Enforcement divirjam
enquanto os testes passarem.

## Consequências

**Positivas:**
- Um único ponto de manutenção para alterar os limiares da RN-AJU-004.
- Display e Enforcement garantidamente consistentes por teste estrutural.
- Função pura testável isoladamente, sem dependências de banco ou framework.
- Clareza de intenção: a comparação de nível no use case passou de
  `Math.abs(deltaPercent) > 0.02` para `nivelExigido === 'GESTOR_CONTROLADORIA'`
  — semântica de domínio explícita.

**Negativas / Compensações:**
- A infra (`prisma-adjustment.repository.ts`) importa diretamente do core domain.
  Em Clean Architecture estrita, o fluxo de dependência é Core → Infra; aqui
  a Infra importa do Core (core/domain), o que é **permitido pela arquitetura**
  (a infra pode depender do core, não o inverso).

## Arquivos Modificados

| Arquivo | Tipo de mudança |
|---|---|
| `src/core/domain/adjustment/adjustment.rules.ts` | CRIADO — função pura |
| `src/core/use-cases/adjustment/request-adjustment.use-case.ts` | MODIFICADO — removido cálculo inline |
| `src/core/use-cases/adjustment/approve-adjustment.use-case.ts` | MODIFICADO — removido cálculo inline |
| `src/infrastructure/database/prisma/repositories/prisma-adjustment.repository.ts` | MODIFICADO — removido cálculo inline, usa `valorDelta` persistido |
| `src/core/use-cases/adjustment/adjustment-level-consistency.spec.ts` | CRIADO — 44 testes de consistência |

## Adendo: Mitigação Avançada de Domain Drift (29/07/2026)

Após a extração primária, notou-se que embora o `valorDelta` (R$) estivesse protegido contra anacronismo (mudança no Custo Médio), o **percentual** (quantidadeDelta / lote.quantidade) continuava vulnerável a "Domain Drift". O saldo atual do lote (`lote.quantidade`) variava com a operação (ex: separação de pedidos) entre o momento da solicitação e o da aprovação.

Para que a severidade da alçada audite rigorosamente o estado do mundo no instante da falha:
- Foi adicionada a coluna `saldoTeorico` (Int, NOT NULL) à tabela `AjusteEstoque`.
- Os testes em `approve-adjustment.use-case.spec.ts` receberam cenários rigorosos de regressão de drift provando que, caso o saldo dispare ou despenque, o Nível de Aprovação permanece congelado, garantindo governança total e imutabilidade de decisão.
