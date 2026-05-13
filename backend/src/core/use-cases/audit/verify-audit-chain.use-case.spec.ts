import { VerifyAuditChainUseCase } from './verify-audit-chain.use-case';
import { HashService } from '../../../infrastructure/security/hash.service';

describe('VerifyAuditChainUseCase', () => {
  let useCase: VerifyAuditChainUseCase;
  let hashService: HashService;

  beforeEach(() => {
    hashService = new HashService();
    useCase = new VerifyAuditChainUseCase(hashService);
  });

  it('deve validar cadeia íntegra (3 registros encadeados)', async () => {
    // Simula a criação de 3 registros encadeados corretamente
    const payload1 = { tipo: 'ENTRADA', loteId: 1, quantidade: 10 };
    const payload2 = { tipo: 'SAIDA', loteId: 1, quantidade: 5 };
    const payload3 = { tipo: 'ENTRADA', loteId: 2, quantidade: 20 };

    const hash1 = hashService.generateHash(payload1, null);
    const hash2 = hashService.generateHash(payload2, hash1);
    const hash3 = hashService.generateHash(payload3, hash2);

    const records = [
      { id: 1, ...payload1, hash: hash1, previousHash: null },
      { id: 2, ...payload2, hash: hash2, previousHash: hash1 },
      { id: 3, ...payload3, hash: hash3, previousHash: hash2 },
    ];

    const mockRepo = {
      countAll: jest.fn().mockResolvedValue(records.length),
      findPaginatedOrdered: jest.fn().mockResolvedValue(records),
    };

    const result = await useCase.verify('Movimentacao', mockRepo as any);

    expect(result.integridadeOk).toBe(true);
    expect(result.falhas).toHaveLength(0);
    expect(result.totalRegistros).toBe(3);
  });

  it('deve detectar adulteração de dados (quantidade alterada no registro 2)', async () => {
    const payload1 = { tipo: 'ENTRADA', loteId: 1, quantidade: 10 };
    const payload2 = { tipo: 'SAIDA', loteId: 1, quantidade: 5 };
    const payload3 = { tipo: 'ENTRADA', loteId: 2, quantidade: 20 };

    const hash1 = hashService.generateHash(payload1, null);
    const hash2 = hashService.generateHash(payload2, hash1);
    const hash3 = hashService.generateHash(payload3, hash2);

    // ADULTERAÇÃO: alguém mudou a quantidade de 5 para 50 no registro 2
    const records = [
      { id: 1, ...payload1, hash: hash1, previousHash: null },
      { id: 2, tipo: 'SAIDA', loteId: 1, quantidade: 50, hash: hash2, previousHash: hash1 },
      { id: 3, ...payload3, hash: hash3, previousHash: hash2 },
    ];

    const mockRepo = {
      countAll: jest.fn().mockResolvedValue(records.length),
      findPaginatedOrdered: jest.fn().mockResolvedValue(records),
    };

    const result = await useCase.verify('Movimentacao', mockRepo as any);

    expect(result.integridadeOk).toBe(false);
    expect(result.falhas.length).toBeGreaterThanOrEqual(1);
    // Registro 2 foi adulterado, então seu hash recalculado não bate
    expect(result.falhas[0].registroId).toBe(2);
  });

  it('deve detectar adulteração do hash do registro anterior (corrente quebrada)', async () => {
    const payload1 = { tipo: 'ENTRADA', loteId: 1, quantidade: 10 };
    const payload2 = { tipo: 'SAIDA', loteId: 1, quantidade: 5 };

    const hash1 = hashService.generateHash(payload1, null);
    const hash2 = hashService.generateHash(payload2, hash1);

    // ADULTERAÇÃO: previousHash do registro 2 foi trocado
    const records = [
      { id: 1, ...payload1, hash: hash1, previousHash: null },
      { id: 2, ...payload2, hash: hash2, previousHash: 'HASH_FALSO_INJETADO' },
    ];

    const mockRepo = {
      countAll: jest.fn().mockResolvedValue(records.length),
      findPaginatedOrdered: jest.fn().mockResolvedValue(records),
    };

    const result = await useCase.verify('Movimentacao', mockRepo as any);

    expect(result.integridadeOk).toBe(false);
    expect(result.falhas.length).toBeGreaterThanOrEqual(1);
    expect(result.falhas[0].registroId).toBe(2);
    expect(result.falhas[0].previousHashArmazenado).toBe('HASH_FALSO_INJETADO');
  });

  it('deve validar cadeia vazia (zero registros)', async () => {
    const mockRepo = {
      countAll: jest.fn().mockResolvedValue(0),
      findPaginatedOrdered: jest.fn().mockResolvedValue([]),
    };

    const result = await useCase.verify('LogCusto', mockRepo as any);

    expect(result.integridadeOk).toBe(true);
    expect(result.totalRegistros).toBe(0);
    expect(result.falhas).toHaveLength(0);
  });

  it('deve validar cadeia com registro único (GENESIS)', async () => {
    const payload = { produtoId: 1, custoAnterior: 10, custoNovo: 12 };
    const hash = hashService.generateHash(payload, null);

    const records = [
      { id: 1, ...payload, hash, previousHash: null },
    ];

    const mockRepo = {
      countAll: jest.fn().mockResolvedValue(records.length),
      findPaginatedOrdered: jest.fn().mockResolvedValue(records),
    };

    const result = await useCase.verify('LogCusto', mockRepo as any);

    expect(result.integridadeOk).toBe(true);
    expect(result.falhas).toHaveLength(0);
  });
});
