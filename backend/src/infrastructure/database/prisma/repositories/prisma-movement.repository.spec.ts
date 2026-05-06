import { PrismaMovementRepository } from './prisma-movement.repository';
import { PrismaService } from '../prisma.service';
import { HashService } from '../../../security/hash.service';
import { Test, TestingModule } from '@nestjs/testing';

describe('PrismaMovementRepository', () => {
  let repository: PrismaMovementRepository;
  let prismaService: jest.Mocked<PrismaService>;
  let hashService: jest.Mocked<HashService>;

  beforeEach(async () => {
    const mockPrismaService = {
      movimentacao: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
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

  it('deve registrar uma nova movimentacao com hash encadeado', async () => {
    const movRequest = {
      tipo: 'ENTRADA', loteId: 1, quantidade: 10, motivo: 'Entrada', enderecoOrigemId: null, enderecoDestinoId: null, usuarioId: 1
    };
    const mockResult = { id: 100, criadoEm: new Date(), hash: 'novoHash', previousHash: 'hashAnterior', ...movRequest };
    
    (prismaService.movimentacao.findFirst as jest.Mock).mockResolvedValue({ hash: 'hashAnterior' });
    hashService.generateHash.mockReturnValue('novoHash');
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
});
