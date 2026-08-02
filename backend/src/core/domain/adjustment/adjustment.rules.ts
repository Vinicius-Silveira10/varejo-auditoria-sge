export type NivelAprovacao = 'GESTOR' | 'GESTOR_CONTROLADORIA';

/**
 * Calcula o nível de aprovação exigido para um ajuste de estoque (RN-AJU-004).
 *
 * Regra:
 * Se o impacto percentual do ajuste sobre o saldo teórico for maior que 2%
 * (positivo ou negativo) OU se o impacto financeiro (quantidade * custo médio)
 * for maior que R$ 1000 (positivo ou negativo), o ajuste exige a alçada de
 * GESTOR_CONTROLADORIA (ADMIN). Caso contrário, exige apenas GESTOR.
 *
 * Fórmula percentual: quantidadeDelta / saldoTeorico
 * - O resultado é avaliado via Math.abs() na comparação (>0.02).
 * - Se saldoTeorico <= 0 (saldo zerado ou inconsistente), deltaPercent assume 1
 *   (100%), garantindo escalonamento para GESTOR_CONTROLADORIA — é sempre
 *   mais seguro exigir alçada maior quando o saldo base é desconhecido.
 *
 * IMPORTANTE: o parâmetro `valorDelta` deve ser o valor já calculado e
 * persistido no momento da solicitação (quantidadeDelta × custoMedio na
 * criação), NÃO recalculado com o custoMedio atual — isso garante que o
 * nível exibido na listagem seja sempre idêntico ao nível enforcement na
 * aprovação, mesmo que o custo médio do produto mude entre os dois momentos.
 *
 * @param quantidadeDelta Quantidade a ser ajustada (positiva ou negativa)
 * @param valorDelta Impacto financeiro já calculado e persistido do ajuste (quantidadeDelta × custoMedioNaMomentoSolicitacao)
 * @param saldoTeorico Saldo do lote no momento do cálculo
 * @returns 'GESTOR_CONTROLADORIA' se exceder os limites, senão 'GESTOR'
 */
export function calcularNivelAprovacaoExigido(
  quantidadeDelta: number,
  valorDelta: number,
  saldoTeorico: number,
): NivelAprovacao {
  const deltaPercent = saldoTeorico > 0 ? quantidadeDelta / saldoTeorico : 1;

  if (Math.abs(deltaPercent) > 0.02 || Math.abs(valorDelta) > 1000) {
    return 'GESTOR_CONTROLADORIA';
  }

  return 'GESTOR';
}
