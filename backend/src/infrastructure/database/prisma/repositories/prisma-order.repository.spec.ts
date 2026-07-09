import { Test, TestingModule } from '@nestjs/testing';
import { PrismaOrderRepository } from './prisma-order.repository';
import { PrismaService } from '../prisma.service';

describe('PrismaOrderRepository', () => {
  let repository: PrismaOrderRepository;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const mockPrismaService = {
      pedidoExpedicao: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaOrderRepository,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    repository = module.get<PrismaOrderRepository>(PrismaOrderRepository);
    prismaService = module.get(PrismaService);
  });

  it('deve criar um pedido com itens no banco', async () => {
    const data = {
      codigoPedido: 'PED-1001',
      itens: [
        {
          produtoId: 1,
          quantidadeSolicitada: 5,
        },
      ],
    };

    const mockResult = {
      id: 1,
      codigoPedido: 'PED-1001',
      status: 'PENDENTE',
      itens: [{ produtoId: 1, quantidadeSolicitada: 5, quantidadeSeparada: 0 }],
    };

    (prismaService.pedidoExpedicao.create as jest.Mock).mockResolvedValue(mockResult);

    const result = await repository.create(data);

    expect(result).toEqual(mockResult);
    expect(prismaService.pedidoExpedicao.create).toHaveBeenCalledWith({
      data: {
        codigoPedido: 'PED-1001',
        valorTotal: undefined,
        itens: {
          create: [{ produtoId: 1, quantidadeSolicitada: 5 }],
        },
      },
      include: { itens: true },
    });
  });

  it('deve buscar um pedido com itens pelo ID', async () => {
    const mockResult = { id: 1, codigoPedido: 'PED-1002', itens: [] };
    (prismaService.pedidoExpedicao.findUnique as jest.Mock).mockResolvedValue(mockResult);

    const result = await repository.findById(1);

    expect(result).toEqual(mockResult);
    expect(prismaService.pedidoExpedicao.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      include: { itens: true },
    });
  });

  it('deve retornar null para ID inexistente', async () => {
    (prismaService.pedidoExpedicao.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await repository.findById(99999);

    expect(result).toBeNull();
  });

  it('deve atualizar o status de um pedido', async () => {
    const mockResult = { id: 1, status: 'SEPARACAO' };
    (prismaService.pedidoExpedicao.update as jest.Mock).mockResolvedValue(mockResult);

    const result = await repository.updateStatus(1, 'SEPARACAO');

    expect(result).toEqual(mockResult);
    expect(prismaService.pedidoExpedicao.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: 'SEPARACAO' },
    });
  });

  it('deve atualizar os conferentes e marcar como CONFERIDO', async () => {
    const mockResult = { id: 1, status: 'CONFERIDO', conferente1Id: 10, conferente2Id: 20 };
    (prismaService.pedidoExpedicao.update as jest.Mock).mockResolvedValue(mockResult);

    const result = await repository.updateConferentes(1, 10, 20);

    expect(result).toEqual(mockResult);
    expect(prismaService.pedidoExpedicao.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        conferente1Id: 10,
        conferente2Id: 20,
        status: 'CONFERIDO',
      },
    });
  });
});
