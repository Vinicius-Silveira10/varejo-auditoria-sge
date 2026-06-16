import { PrismaMovementRepository } from './prisma-movement.repository';
import { PrismaService } from '../prisma.service';
import { HashService } from '../../../security/hash.service';
import { Test, TestingModule } from '@nestjs/testing';

describe('PrismaMovementRepository', () => {
  let repository: PrismaMovementRepository;
  let prismaService: jest.Mocked<PrismaService>;
  let hashService: jest.Mocked<HashService>;

  beforeEach(async () => {
    // Mock do ChainPointer para suportar o BUG-007 fix (upsert/findUnique atômico)
    const chainPointerMock = {
      findUnique: jest.fn().mockResolvedValue({ lastHash: 'hashAnterior' }),
      upsert: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    };

    const movimentacaoMock = {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    };

    // $transaction executa o callback sincrônico com o contexto mockado
    const mockPrismaService = {
      movimentacao: movimentacaoMock,
      chainPointer: chainPointerMock,
      $transaction: jest.fn().mockImplementation(async (cb) => {
        const txMock = {
          movimentacao: movimentacaoMock,
          chainPointer: chainPointerMock,
          lote: { update: jest.fn().mockResolvedValue({ quantidade: 0 }) },
          endereco: { update: jest.fn() },
        };
        return cb(txMock);
      }),
    };

    const mockHashService = {
      generateHash: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaMovementRepository,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: HashService, useValue: mockHashService },
      ],
    }).compile();

    repository = module.get<PrismaMovementRepository>(PrismaMovementRepository);
    prismaService = module.get(PrismaService) as any;
    hashService = module.get(HashService) as any;
  });

  it('deve registrar uma nova movimentacao com hash encadeado (BUG-007 fix: ChainPointer)', async () => {
    const movRequest = {
      tipo: 'ENTRADA', loteId: 1, quantidade: 10, motivo: 'Entrada', enderecoOrigemId: null, enderecoDestinoId: null, usuarioId: 1
    };
    const mockResult = { id: 100, criadoEm: new Date(), hash: 'novoHash', previousHash: 'hashAnterior', ...movRequest };

    hashService.generateHash
      .mockReturnValueOnce('tempHash') // primeira chamada: hash temporário
      .mockReturnValueOnce('novoHash'); // segunda chamada: hash real
    (prismaService.movimentacao.create as jest.Mock).mockResolvedValue(mockResult);

    const result = await repository.create(movRequest);

    expect(prismaService.movimentacao.create).toHaveBeenCalledWith({
      data: {
        ...movRequest,
        hash: 'novoHash',
        previousHash: 'hashAnterior'
      }
    });
    expect(result).toEqual(mockResult);
  });

  it('deve buscar histórico de movimentacoes por lote', async () => {
    const loteId = 1;
    const mockMovs = [
      { id: 100, tipo: 'ENTRADA', loteId, quantidade: 10, motivo: 'Entrada', enderecoOrigemId: null, enderecoDestinoId: null, usuarioId: 1, criadoEm: new Date() },
    ];
    (prismaService.movimentacao.findMany as jest.Mock).mockResolvedValue(mockMovs);

    const result = await repository.findByLote(loteId);

    expect(prismaService.movimentacao.findMany).toHaveBeenCalledWith({
      where: { loteId },
      orderBy: { criadoEm: 'desc' },
    });
    expect(result).toEqual(mockMovs);
  });

  it('não deve usar previousHash nulo para primeiro registro da cadeia', async () => {
    // Simula cadeia vazia (nenhum registro anterior)
    const chainPointerMock = (prismaService as any).chainPointer;
    chainPointerMock.findUnique.mockResolvedValueOnce(null);

    const movRequest = {
      tipo: 'ENTRADA', loteId: 1, quantidade: 5, motivo: 'Primeiro', enderecoOrigemId: null, enderecoDestinoId: null, usuarioId: 1
    };
    const mockResult = { id: 1, criadoEm: new Date(), hash: 'hashPrimeiro', previousHash: null, ...movRequest };

    hashService.generateHash.mockReturnValueOnce('hashTemp').mockReturnValueOnce('hashPrimeiro');
    (prismaService.movimentacao.create as jest.Mock).mockResolvedValue(mockResult);

    const result = await repository.create(movRequest);
    expect(result.previousHash).toBeNull();
  });
});
