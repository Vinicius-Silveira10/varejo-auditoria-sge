import { PrismaProductRepository } from './prisma-product.repository';
import { PrismaService } from '../prisma.service';
import { Test, TestingModule } from '@nestjs/testing';

describe('PrismaProductRepository', () => {
  let repository: PrismaProductRepository;
  let prismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrismaService = {
      produto: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaProductRepository,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    repository = module.get<PrismaProductRepository>(PrismaProductRepository);
    prismaService = module.get(PrismaService);
  });

  it('deve criar um produto no banco', async () => {
    const data = { sku: 'PROD-01', descricao: 'Teste', categoria: 'Teste', perecivel: false };
    const mockCreated = { id: 1, custoMedio: 0, ativo: true, ...data };
    (prismaService.produto.create as jest.Mock).mockResolvedValue(mockCreated);

    const result = await repository.create(data);

    expect(prismaService.produto.create).toHaveBeenCalledWith({ data });
    expect(result).toEqual(mockCreated);
  });

  it('deve buscar um produto por SKU', async () => {
    const sku = 'PROD-01';
    const mockResult = { id: 1, sku, descricao: 'Teste', categoria: 'Teste', perecivel: false, custoMedio: 0, ativo: true };
    (prismaService.produto.findUnique as jest.Mock).mockResolvedValue(mockResult);

    const result = await repository.findBySku(sku);

    expect(prismaService.produto.findUnique).toHaveBeenCalledWith({ where: { sku } });
    expect(result).toEqual(mockResult);
  });

  it('deve atualizar o custo medio', async () => {
    const id = 1;
    const novoCusto = 15.5;
    const mockResult = { id, sku: 'PROD-01', descricao: 'Teste', categoria: 'Teste', perecivel: false, custoMedio: novoCusto, ativo: true };
    (prismaService.produto.update as jest.Mock).mockResolvedValue(mockResult);

    const result = await repository.updateCustoMedio(id, novoCusto);

    expect(prismaService.produto.update).toHaveBeenCalledWith({
      where: { id },
      data: { custoMedio: novoCusto },
    });
    expect(result).toEqual(mockResult);
  });

  it('deve desativar um produto (soft delete)', async () => {
    const id = 1;
    const mockResult = { id, sku: 'PROD-01', descricao: 'Teste', categoria: 'Teste', perecivel: false, custoMedio: 0, ativo: false };
    (prismaService.produto.update as jest.Mock).mockResolvedValue(mockResult);

    const result = await repository.disable(id);

    expect(prismaService.produto.update).toHaveBeenCalledWith({
      where: { id },
      data: { ativo: false },
    });
    expect(result).toEqual(mockResult);
  });
});
