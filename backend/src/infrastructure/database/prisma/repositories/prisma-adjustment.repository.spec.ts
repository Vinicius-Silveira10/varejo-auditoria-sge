import { Test, TestingModule } from '@nestjs/testing';
import { PrismaAdjustmentRepository } from './prisma-adjustment.repository';
import { PrismaService } from '../prisma.service';

describe('PrismaAdjustmentRepository', () => {
  let repository: PrismaAdjustmentRepository;
  let prismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrismaService = {
      ajusteEstoque: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        aggregate: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaAdjustmentRepository,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    repository = module.get<PrismaAdjustmentRepository>(PrismaAdjustmentRepository);
    prismaService = module.get(PrismaService);
  });

  it('deve criar um ajuste de estoque com sucesso', async () => {
    const input = {
      loteId: 10,
      quantidadeDelta: -5,
      motivo: 'Avaria',
      valorDelta: -50,
      saldoTeorico: 100,
      statusAprovacao: 'PENDENTE',
      solicitanteId: 2,
    };

    const prismaCreated = {
      id: 1,
      ...input,
      aprovadorId: null,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    };

    (prismaService.ajusteEstoque.create as jest.Mock).mockResolvedValue(prismaCreated);

    const result = await repository.create(input);

    expect(prismaService.ajusteEstoque.create).toHaveBeenCalledWith({
      data: {
        loteId: 10,
        quantidadeDelta: -5,
        motivo: 'Avaria',
        valorDelta: -50,
        saldoTeorico: 100,
        statusAprovacao: 'PENDENTE',
        solicitanteId: 2,
        aprovadorId: undefined,
      },
    });

    expect(result).toEqual({
      id: 1,
      loteId: 10,
      quantidadeDelta: -5,
      motivo: 'Avaria',
      valorDelta: -50,
      saldoTeorico: 100,
      statusAprovacao: 'PENDENTE',
      solicitanteId: 2,
      aprovadorId: undefined,
      criadoEm: prismaCreated.criadoEm,
      atualizadoEm: prismaCreated.atualizadoEm,
    });
  });

  it('deve buscar ajuste por id e mapear para o domínio', async () => {
    const prismaRecord = {
      id: 5,
      loteId: 10,
      quantidadeDelta: 3,
      motivo: 'Sobra',
      valorDelta: 30,
      saldoTeorico: 50,
      statusAprovacao: 'PENDENTE',
      solicitanteId: 2,
      aprovadorId: null,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    };

    (prismaService.ajusteEstoque.findUnique as jest.Mock).mockResolvedValue(prismaRecord);

    const result = await repository.findById(5);

    expect(prismaService.ajusteEstoque.findUnique).toHaveBeenCalledWith({ where: { id: 5 } });
    expect(result).toEqual({
      id: 5,
      loteId: 10,
      quantidadeDelta: 3,
      motivo: 'Sobra',
      valorDelta: 30,
      saldoTeorico: 50,
      statusAprovacao: 'PENDENTE',
      solicitanteId: 2,
      aprovadorId: undefined,
      criadoEm: prismaRecord.criadoEm,
      atualizadoEm: prismaRecord.atualizadoEm,
    });
  });

  it('deve retornar null se ajuste não for encontrado', async () => {
    (prismaService.ajusteEstoque.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await repository.findById(999);

    expect(result).toBeNull();
  });

  it('deve atualizar status e aprovadorId no banco', async () => {
    const prismaUpdated = {
      id: 1,
      loteId: 10,
      quantidadeDelta: -2,
      motivo: 'Quebra',
      valorDelta: -20,
      saldoTeorico: 100,
      statusAprovacao: 'APROVADO',
      solicitanteId: 2,
      aprovadorId: 3,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    };

    (prismaService.ajusteEstoque.update as jest.Mock).mockResolvedValue(prismaUpdated);

    const result = await repository.updateStatus(1, 'APROVADO', 3);

    expect(prismaService.ajusteEstoque.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        statusAprovacao: 'APROVADO',
        aprovadorId: 3,
      },
    });

    expect(result.statusAprovacao).toBe('APROVADO');
    expect(result.aprovadorId).toBe(3);
  });

  it('deve calcular soma das perdas financeiras (ajustes negativos aprovados)', async () => {
    (prismaService.ajusteEstoque.aggregate as jest.Mock).mockResolvedValue({
      _sum: { valorDelta: -450.75 },
    });

    const result = await repository.sumFinancialLosses();

    expect(prismaService.ajusteEstoque.aggregate).toHaveBeenCalledWith({
      where: {
        statusAprovacao: 'APROVADO',
        quantidadeDelta: { lt: 0 },
      },
      _sum: {
        valorDelta: true,
      },
    });

    expect(result).toBe(450.75);
  });

  it('deve retornar 0 quando não houver perdas financeiras', async () => {
    (prismaService.ajusteEstoque.aggregate as jest.Mock).mockResolvedValue({
      _sum: { valorDelta: null },
    });

    const result = await repository.sumFinancialLosses();

    expect(result).toBe(0);
  });

  it('deve listar ajustes pendentes enriquecidos com detalhes do lote e nível de aprovação', async () => {
    const prismaRows = [
      {
        id: 1,
        loteId: 10,
        quantidadeDelta: -1,
        motivo: 'Ajuste pequeno',
        valorDelta: -10,
        saldoTeorico: 100,
        statusAprovacao: 'PENDENTE',
        solicitanteId: 2,
        aprovadorId: null,
        criadoEm: new Date('2026-01-01T10:00:00Z'),
        atualizadoEm: new Date('2026-01-01T10:00:00Z'),
        lote: {
          numeroLote: 'L-001',
          produto: {
            sku: 'SKU-001',
            descricao: 'Produto Teste 1',
          },
        },
      },
      {
        id: 2,
        loteId: 20,
        quantidadeDelta: -50,
        motivo: 'Ajuste grande',
        valorDelta: -1500,
        saldoTeorico: 100,
        statusAprovacao: 'PENDENTE',
        solicitanteId: 2,
        aprovadorId: null,
        criadoEm: new Date('2026-01-01T11:00:00Z'),
        atualizadoEm: new Date('2026-01-01T11:00:00Z'),
        lote: {
          numeroLote: 'L-002',
          produto: {
            sku: 'SKU-002',
            descricao: 'Produto Teste 2',
          },
        },
      },
    ];

    (prismaService.ajusteEstoque.findMany as jest.Mock).mockResolvedValue(prismaRows);

    const result = await repository.findPending();

    expect(prismaService.ajusteEstoque.findMany).toHaveBeenCalledWith({
      where: { statusAprovacao: 'PENDENTE' },
      include: {
        lote: {
          include: {
            produto: true,
          },
        },
      },
      orderBy: { criadoEm: 'asc' },
    });

    expect(result).toHaveLength(2);
    // 1% e R$10 -> GESTOR
    expect(result[0].nivelAprovacaoExigido).toBe('GESTOR');
    expect(result[0].lote.numeroLote).toBe('L-001');
    expect(result[0].lote.produto.sku).toBe('SKU-001');

    // 50% e R$1500 -> GESTOR_CONTROLADORIA
    expect(result[1].nivelAprovacaoExigido).toBe('GESTOR_CONTROLADORIA');
    expect(result[1].lote.numeroLote).toBe('L-002');
  });
});
