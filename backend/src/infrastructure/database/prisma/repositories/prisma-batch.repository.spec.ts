import { PrismaBatchRepository } from './prisma-batch.repository';
import { PrismaService } from '../prisma.service';
import { Test, TestingModule } from '@nestjs/testing';

describe('PrismaBatchRepository', () => {
  let repository: PrismaBatchRepository;
  let prismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrismaService = {
      lote: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaBatchRepository,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    repository = module.get<PrismaBatchRepository>(PrismaBatchRepository);
    prismaService = module.get(PrismaService);
  });

  it('deve criar um novo lote no banco', async () => {
    const data = { numeroLote: 'L-01', produtoId: 10, quantidade: 50, validade: null, ativo: true };
    const mockCreated = { id: 1, criadoEm: new Date(), ...data };
    (prismaService.lote.create as jest.Mock).mockResolvedValue(mockCreated);

    const result = await repository.create(data);

    expect(prismaService.lote.create).toHaveBeenCalledWith({ data });
    expect(result).toEqual(mockCreated);
  });

  it('deve buscar um lote por id', async () => {
    const loteId = 1;
    const mockLote = { id: loteId, produtoId: 10, numeroLote: 'L01', quantidade: 50, validade: null, ativo: true };
    (prismaService.lote.findUnique as jest.Mock).mockResolvedValue(mockLote);

    const result = await repository.findById(loteId);

    expect(prismaService.lote.findUnique).toHaveBeenCalledWith({ where: { id: loteId } });
    expect(result).toEqual(mockLote);
  });

  it('deve buscar lotes disponíveis por produto', async () => {
    const produtoId = 10;
    const mockLotes = [
      { id: 1, produtoId, numeroLote: 'L01', quantidade: 50, validade: null, ativo: true },
    ];
    (prismaService.lote.findMany as jest.Mock).mockResolvedValue(mockLotes);

    const result = await repository.findAvailableByProduct(produtoId);

    expect(prismaService.lote.findMany).toHaveBeenCalledWith({
      where: { produtoId, quantidade: { gt: 0 }, ativo: true },
      orderBy: { validade: 'asc' },
    });
    expect(result).toEqual(mockLotes);
  });

  it('deve atualizar a quantidade de um lote', async () => {
    const loteId = 1;
    const novaQuantidade = 100;
    const mockLote = { id: loteId, produtoId: 10, numeroLote: 'L01', quantidade: novaQuantidade, validade: null, ativo: true };
    (prismaService.lote.update as jest.Mock).mockResolvedValue(mockLote);

    const result = await repository.updateQuantidade(loteId, novaQuantidade);

    expect(prismaService.lote.update).toHaveBeenCalledWith({
      where: { id: loteId },
      data: { quantidade: novaQuantidade },
    });
    expect(result).toEqual(mockLote);
  });
});
