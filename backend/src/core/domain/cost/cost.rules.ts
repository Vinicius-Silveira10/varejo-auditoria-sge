/**
 * cost.rules.ts
 *
 * Funções puras de regras de domínio para cálculo de custo de estoque (RN-CST-001).
 *
 * Filosofia: estas funções não têm dependências de I/O e são testáveis em isolamento
 * sem mocks de repositórios ou do NestJS container.
 */

/**
 * Calcula o novo Custo Médio Ponderado (CMP) após uma entrada de mercadoria.
 *
 * Fórmula:
 *   - Se quantidadeAnterior === 0 (estoque zerado): novoCusto = custoEntrada
 *   - Caso contrário: novoCusto = (custoAnterior × qtdAnterior + custoEntrada × qtdEntrada) / qtdNova
 *
 * O resultado é arredondado para 6 casas decimais para garantir consistência monetária.
 *
 * @param custoAnterior    Custo médio atual do produto antes da entrada (pode ser 0 se estoque zerado)
 * @param quantidadeAnterior  Saldo do produto antes da entrada (deve ser >= 0)
 * @param custoEntrada     Custo unitário de aquisição do novo lote (>= 0)
 * @param quantidadeEntrada   Quantidade recebida no novo lote (> 0, já validado pelo use case)
 * @returns Novo custo médio ponderado, arredondado a 6 casas decimais
 */
export function calcularNovoCustoMedio(
  custoAnterior: number,
  quantidadeAnterior: number,
  custoEntrada: number,
  quantidadeEntrada: number,
): number {
  if (quantidadeAnterior === 0) {
    return Number(custoEntrada.toFixed(6));
  }

  const quantidadeNova = quantidadeAnterior + quantidadeEntrada;
  const novoCusto =
    (custoAnterior * quantidadeAnterior + custoEntrada * quantidadeEntrada) /
    quantidadeNova;

  return Number(novoCusto.toFixed(6));
}
