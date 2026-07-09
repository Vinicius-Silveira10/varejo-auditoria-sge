import { ExportAuditCsvUseCase } from './export-audit-csv.use-case';
import { IMovementRepository } from '../../interfaces/repositories/i-movement.repository';
import { ILogCustoRepository } from '../../interfaces/repositories/i-log-custo.repository';
import * as crypto from 'crypto';

describe('ExportAuditCsvUseCase (LGPD & Security)', () => {
  let useCase: ExportAuditCsvUseCase;
  let mockMovementRepo: jest.Mocked<IMovementRepository>;
  let mockLogCustoRepo: jest.Mocked<ILogCustoRepository>;

  beforeEach(() => {
    mockMovementRepo = {
      findAllOrdered: jest.fn().mockResolvedValue([
        {
          id: 1,
          tipo: 'ENTRADA',
          loteId: 10,
          quantidade: 50,
          usuarioId: 100,
          criadoEm: new Date('2026-07-01T10:00:00Z'),
          hash: 'mov-hash-1',
          previousHash: null,
          usuario: { email: 'operator@nexus.com', nome: 'Operador' },
        },
      ]),
      create: jest.fn(),
      findByLote: jest.fn(),
      findPaginatedOrdered: jest.fn(),
      countAll: jest.fn(),
      executeMovementTransaction: jest.fn(),
      getMovementQuantitiesByProduct: jest.fn(),
      purgeBefore: jest.fn(),
    };

    mockLogCustoRepo = {
      findAllOrdered: jest.fn().mockResolvedValue([
        {
          id: 1,
          produtoId: 2,
          custoAnterior: 10,
          custoNovo: 12,
          quantidadeAnterior: 100,
          quantidadeNova: 150,
          motivo: 'Recebimento',
          criadoEm: new Date('2026-07-01T11:00:00Z'),
          hash: 'cost-hash-1',
          previousHash: 'prev-cost-hash',
        },
      ]),
      create: jest.fn(),
      findByProdutoId: jest.fn(),
      findPaginatedOrdered: jest.fn(),
      countAll: jest.fn(),
      purgeBefore: jest.fn(),
    };

    useCase = new ExportAuditCsvUseCase(mockMovementRepo, mockLogCustoRepo);
  });

  it('deve exportar logs de auditoria formatados em CSV com pseudonimização do usuário (LGPD)', async () => {
    const csvContent = await useCase.execute();

    expect(mockMovementRepo.findAllOrdered).toHaveBeenCalled();
    expect(mockLogCustoRepo.findAllOrdered).toHaveBeenCalled();

    const lines = csvContent.split('\n');
    expect(lines[0]).toBe(
      'TipoLog,Data,TargetId,Quantidade,CustoMedio,UsuarioAnonimizado,Hash,HashAnterior',
    );

    // Linha de movimentação pseudonimizada
    const movLine = lines[1];
    expect(movLine).toContain('MOVIMENTACAO_ENTRADA');
    expect(movLine).toContain('Lote 10');
    expect(movLine).toContain('50');

    // Valida que o email puro do usuário NÃO está no CSV
    expect(movLine).not.toContain('operator@nexus.com');
    expect(movLine).not.toContain('Operador');

    // Valida que o hash SHA-256 (do email + salt) está presente (comprimento de 16 caracteres substring)
    const salt = 'SGE_SALT_LGPD_2026';
    const expectedHash = crypto
      .createHash('sha256')
      .update('operator@nexus.com' + salt)
      .digest('hex')
      .substring(0, 16);
    expect(movLine).toContain(expectedHash);

    // Linha de log de custo
    const costLine = lines[2];
    expect(costLine).toContain('CUSTO_UPDATE');
    expect(costLine).toContain('Produto 2');
    expect(costLine).toContain('12');
    expect(costLine).toContain('SISTEMA');
    expect(costLine).toContain('cost-hash-1');
    expect(costLine).toContain('prev-cost-hash');
  });
});
