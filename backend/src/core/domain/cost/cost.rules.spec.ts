import { calcularNovoCustoMedio } from './cost.rules';

/**
 * Testes de caracterização e contrato da função calcularNovoCustoMedio (RN-CST-001).
 *
 * Estes testes documentam e protegem o comportamento EXATO que existia inline em
 * receive-batch.use-case.ts (linhas 140–151) antes da extração para cost.rules.ts.
 *
 * REGRA: nenhuma asserção aqui deve mudar de valor esperado como resultado de refatoração.
 * Se um teste quebrar depois da extração, o bug foi introduzido na extração.
 */
describe('calcularNovoCustoMedio (RN-CST-001)', () => {
  // ─── Casos que existiam implicitamente cobrindo o branch "estoque zerado" ───

  it('deve retornar o custo de entrada quando quantidadeAnterior é 0 (estoque zerado)', () => {
    // Espelha o cenário do teste "deve receber um lote e enfileirar o recalculo de custo medio"
    // mockProduct.custoMedio = 5, mas quantidadeAnterior = 0 (só o novo lote existe)
    // → novoCusto deve ser 10 (custoAquisicao)
    const resultado = calcularNovoCustoMedio(5, 0, 10, 50);
    expect(resultado).toBe(10);
  });

  it('deve arredondar a 6 casas decimais quando quantidadeAnterior é 0', () => {
    const resultado = calcularNovoCustoMedio(0, 0, 1.123456789, 100);
    expect(resultado).toBe(1.123457); // toFixed(6) de 1.123456789
  });

  // ─── Casos de caracterização do branch "CMP real" (quantidadeAnterior > 0) ───
  // Estes casos NÃO eram exercitados pelos testes originais do use case porque
  // o mock de findAvailableByProduct retornava apenas [novoLote], forçando
  // quantidadeAnterior = quantidadeNova - quantidadeEntrada = 0.

  it('deve calcular o CMP ponderado quando há estoque anterior', () => {
    // Estoque anterior: 100 unidades a R$ 5,00
    // Entrada: 50 unidades a R$ 10,00
    // CMP = (5 * 100 + 10 * 50) / 150 = (500 + 500) / 150 = 1000 / 150 ≈ 6.666667
    const resultado = calcularNovoCustoMedio(5, 100, 10, 50);
    expect(resultado).toBe(6.666667);
  });

  it('deve retornar o custo idêntico quando custoEntrada === custoAnterior', () => {
    // Se custo não muda, CMP deve permanecer igual
    const resultado = calcularNovoCustoMedio(8, 200, 8, 100);
    expect(resultado).toBe(8);
  });

  it('deve reduzir o CMP quando entrada tem custo menor que o anterior', () => {
    // Estoque anterior: 100 unidades a R$ 10,00
    // Entrada: 100 unidades a R$ 6,00
    // CMP = (10 * 100 + 6 * 100) / 200 = 1600 / 200 = 8
    const resultado = calcularNovoCustoMedio(10, 100, 6, 100);
    expect(resultado).toBe(8);
  });

  it('deve calcular corretamente com custoAnterior = 0 e quantidadeAnterior > 0 (edge case)', () => {
    // Produto com saldo mas custo médio zerado (inconsistência de dados legados)
    // Comportamento: fórmula produz CMP correto usando o custo de entrada
    // CMP = (0 * 50 + 4 * 25) / 75 = 100 / 75 ≈ 1.333333
    const resultado = calcularNovoCustoMedio(0, 50, 4, 25);
    expect(resultado).toBe(1.333333);
  });

  it('deve arredondar a 6 casas decimais no CMP ponderado', () => {
    // CMP = (3.14159265 * 1 + 2.71828182 * 1) / 2 = 5.85987447 / 2 = 2.929937235
    // toFixed(6) → 2.929937
    const resultado = calcularNovoCustoMedio(3.14159265, 1, 2.71828182, 1);
    expect(resultado).toBe(2.929937);
  });

  it('deve retornar custo com toFixed(6) sem trailing zeros quando resultado é inteiro', () => {
    // (10 * 10 + 10 * 10) / 20 = 10.000000 → Number("10.000000") = 10
    const resultado = calcularNovoCustoMedio(10, 10, 10, 10);
    expect(resultado).toBe(10);
  });
});
