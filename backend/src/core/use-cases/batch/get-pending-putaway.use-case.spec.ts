import { GetPendingPutawayBatchesUseCase } from './get-pending-putaway.use-case';
import { IBatchRepository } from '../../interfaces/repositories/i-batch.repository';

/**
 * Helper para construir um lote com movimentos pre-configurados.
 * Simula o que findActiveWithBalance retorna (lote + movimentacoes filtradas).
 */
function buildLote(overrides: {
  id?: number;
  quantidade: number;
  movimentacoes?: Array<{ tipo: string; quantidade: number; enderecoOrigemId?: number | null }>;
}) {
  return {
    id: overrides.id ?? 1,
    numeroLote: `L-${overrides.id ?? 1}`,
    produtoId: 10,
    quantidade: overrides.quantidade,
    ativo: true,
    validade: null,
    movimentacoes: overrides.movimentacoes ?? [],
    produto: { sku: 'SKU-001', descricao: 'Produto Teste' },
  };
}

describe('GetPendingPutawayBatchesUseCase — Fórmula ADR-001', () => {
  let batchRepo: jest.Mocked<IBatchRepository>;
  let useCase: GetPendingPutawayBatchesUseCase;

  beforeEach(() => {
    batchRepo = {
      findActiveWithBalance: jest.fn(),
    } as unknown as jest.Mocked<IBatchRepository>;

    useCase = new GetPendingPutawayBatchesUseCase(batchRepo);
  });

  // =========================================================================
  // T0 — Lote recém-recebido: zero putaway, zero pick
  // Mais comum do sistema — 100% pendente
  // =========================================================================
  it('T0: lote recém-recebido (zero arm., zero pick) → Pendente = Lote.quantidade', async () => {
    batchRepo.findActiveWithBalance.mockResolvedValue([
      buildLote({ id: 1, quantidade: 100, movimentacoes: [] }),
    ] as any);

    const result = await useCase.execute();

    expect(result).toHaveLength(1);
    // Fórmula: 100 - 0 + 0 = 100
    expect(result[0].quantidadePendente).toBe(100);
    expect(result[0].quantidadeTotal).toBe(100);
  });

  // =========================================================================
  // T1 — 100% armazenado, sem pick → Pendente = 0
  // =========================================================================
  it('T1: lote 100% armazenado, sem pick → Pendente = 0', async () => {
    batchRepo.findActiveWithBalance.mockResolvedValue([
      buildLote({
        id: 2,
        quantidade: 100,
        movimentacoes: [
          { tipo: 'ARMAZENAGEM', quantidade: 100, enderecoOrigemId: null },
        ],
      }),
    ] as any);

    const result = await useCase.execute();

    // Fórmula: 100 - 100 + 0 = 0 → não deve aparecer na lista
    expect(result).toHaveLength(0);
  });

  // =========================================================================
  // T2 — Parcialmente armazenado (60 de 100), sem pick → Pendente = 40
  // =========================================================================
  it('T2: parcialmente armazenado (60 de 100) → Pendente = 40', async () => {
    batchRepo.findActiveWithBalance.mockResolvedValue([
      buildLote({
        id: 3,
        quantidade: 100,
        movimentacoes: [
          { tipo: 'ARMAZENAGEM', quantidade: 60, enderecoOrigemId: null },
        ],
      }),
    ] as any);

    const result = await useCase.execute();

    expect(result).toHaveLength(1);
    // Fórmula: 100 - 60 + 0 = 40
    expect(result[0].quantidadePendente).toBe(40);
  });

  // =========================================================================
  // T3 — 100% armazenado, 30 expedidos de endereço → Pendente = 0
  // =========================================================================
  it('T3: 100 armazenados, 30 expedidos de endereço → Pendente = 0', async () => {
    // Lote.quantidade já está em 70 após o pick
    batchRepo.findActiveWithBalance.mockResolvedValue([
      buildLote({
        id: 4,
        quantidade: 70,
        movimentacoes: [
          { tipo: 'ARMAZENAGEM', quantidade: 100, enderecoOrigemId: null },
          { tipo: 'EXPEDICAO', quantidade: 30, enderecoOrigemId: 5 }, // saiu de endereço
        ],
      }),
    ] as any);

    const result = await useCase.execute();

    // Fórmula: 70 - 100 + 30 = 0 → não deve aparecer
    expect(result).toHaveLength(0);
  });

  // =========================================================================
  // T4 — Cross-docking: 100 recebidos, 30 expedidos sem endereço → Pendente = 70
  // =========================================================================
  it('T4: cross-docking (30 expedidos sem passar por endereço) → Pendente = 70', async () => {
    batchRepo.findActiveWithBalance.mockResolvedValue([
      buildLote({
        id: 5,
        quantidade: 70, // Lote.quantidade já reflete o pick
        movimentacoes: [
          // EXPEDICAO com enderecoOrigemId = null (cross-docking) NÃO entra na fórmula
          { tipo: 'EXPEDICAO', quantidade: 30, enderecoOrigemId: null },
        ],
      }),
    ] as any);

    const result = await useCase.execute();

    expect(result).toHaveLength(1);
    // Fórmula: 70 - 0 + 0 = 70
    expect(result[0].quantidadePendente).toBe(70);
  });

  // =========================================================================
  // T5 — Misto: 60 armazenados, pick de 30 (20 de endereço + 10 cross-docking)
  // =========================================================================
  it('T5: misto — 60 arm., pick 30 (20 de endereço, 10 cross-dock) → Pendente = 30', async () => {
    // Lote.quantidade após pick: 100 - 30 = 70
    batchRepo.findActiveWithBalance.mockResolvedValue([
      buildLote({
        id: 6,
        quantidade: 70,
        movimentacoes: [
          { tipo: 'ARMAZENAGEM', quantidade: 60, enderecoOrigemId: null },
          { tipo: 'EXPEDICAO', quantidade: 20, enderecoOrigemId: 7 },  // saiu de endereço
          { tipo: 'EXPEDICAO', quantidade: 10, enderecoOrigemId: null }, // cross-docking (não conta)
        ],
      }),
    ] as any);

    const result = await useCase.execute();

    expect(result).toHaveLength(1);
    // Fórmula: 70 - 60 + 20 = 30
    expect(result[0].quantidadePendente).toBe(30);
  });

  // =========================================================================
  // T6 — 2 endereços (40 em A, 30 em B), pick de 50 (40 de A + 10 de B)
  // Pendente final = 30
  // =========================================================================
  it('T6: 2 endereços (40A+30B=70 arm.), pick de 50 (40A+10B) → Pendente = 30', async () => {
    const ENDERECO_A = 20;
    const ENDERECO_B = 21;

    // Lote.quantidade após pick: 100 - 50 = 50
    batchRepo.findActiveWithBalance.mockResolvedValue([
      buildLote({
        id: 7,
        quantidade: 50,
        movimentacoes: [
          { tipo: 'ARMAZENAGEM', quantidade: 40, enderecoOrigemId: null },  // put em A
          { tipo: 'ARMAZENAGEM', quantidade: 30, enderecoOrigemId: null },  // put em B
          { tipo: 'EXPEDICAO', quantidade: 40, enderecoOrigemId: ENDERECO_A }, // 40 saíram de A
          { tipo: 'EXPEDICAO', quantidade: 10, enderecoOrigemId: ENDERECO_B }, // 10 saíram de B
        ],
      }),
    ] as any);

    const result = await useCase.execute();

    expect(result).toHaveLength(1);
    // Fórmula: 50 - 70 + 50 = 30
    // (SUM_ARM = 40+30 = 70; SUM_EXP_c_origem = 40+10 = 50)
    expect(result[0].quantidadePendente).toBe(30);

    // Validação cruzada: Endereço A tem 40-40=0, Endereço B tem 30-10=20 → 20 em endereços.
    // Lote.quantidade = 50. Pendente = 50 - 20 = 30. Bate. ✅
    const emEnderecos = (40 - 40) + (30 - 10);
    expect(result[0].quantidadePendente).toBe(result[0].quantidadeTotal - emEnderecos);
  });

  // =========================================================================
  // Garantia: lotes com pendente <= 0 não aparecem na lista
  // =========================================================================
  it('deve omitir lotes com pendente <= 0 (ex.: 100% armazenados)', async () => {
    batchRepo.findActiveWithBalance.mockResolvedValue([
      buildLote({
        id: 10,
        quantidade: 100,
        movimentacoes: [
          { tipo: 'ARMAZENAGEM', quantidade: 100, enderecoOrigemId: null },
        ],
      }),
      buildLote({
        id: 11,
        quantidade: 50,
        movimentacoes: [], // pendente = 50
      }),
    ] as any);

    const result = await useCase.execute();

    // Lote 10: 100 - 100 + 0 = 0 → excluído
    // Lote 11: 50 - 0 + 0 = 50 → incluído
    expect(result).toHaveLength(1);
    expect(result[0].loteId).toBe(11);
  });
});
