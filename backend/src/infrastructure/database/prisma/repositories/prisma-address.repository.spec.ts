import { PrismaAddressRepository } from './prisma-address.repository';
import { PrismaService } from '../prisma.service';
import { Test, TestingModule } from '@nestjs/testing';

describe('PrismaAddressRepository', () => {
  let repository: PrismaAddressRepository;
  let prismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrismaService = {
      endereco: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaAddressRepository,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    repository = module.get<PrismaAddressRepository>(PrismaAddressRepository);
    prismaService = module.get(PrismaService);
  });

  it('deve criar um endereco no banco', async () => {
    const data = { codigo: 'A-01', zona: 'Seca', capacidade: 100 };
    const mockCreated = { id: 1, ocupado: 0, ativo: true, ...data };
    (prismaService.endereco.create as jest.Mock).mockResolvedValue(mockCreated);

    const result = await repository.create(data);

    expect(prismaService.endereco.create).toHaveBeenCalledWith({ data });
    expect(result).toEqual(mockCreated);
  });

  it('deve buscar um endereco por codigo', async () => {
    const codigo = 'A-01';
    const mockResult = { id: 1, codigo, zona: 'Seca', capacidade: 100, ocupado: 0, ativo: true };
    (prismaService.endereco.findUnique as jest.Mock).mockResolvedValue(mockResult);

    const result = await repository.findByCodigo(codigo);

    expect(prismaService.endereco.findUnique).toHaveBeenCalledWith({ where: { codigo } });
    expect(result).toEqual(mockResult);
  });

  it('deve desativar um endereco', async () => {
    const id = 1;
    const mockResult = { id, codigo: 'A-01', zona: 'Seca', capacidade: 100, ocupado: 0, ativo: false };
    (prismaService.endereco.update as jest.Mock).mockResolvedValue(mockResult);

    const result = await repository.disable(id);

    expect(prismaService.endereco.update).toHaveBeenCalledWith({
      where: { id },
      data: { ativo: false },
    });
    expect(result).toEqual(mockResult);
  });
});
