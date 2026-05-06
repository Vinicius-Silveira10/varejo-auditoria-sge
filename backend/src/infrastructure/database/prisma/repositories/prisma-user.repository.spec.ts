import { PrismaUserRepository } from './prisma-user.repository';
import { PrismaService } from '../prisma.service';
import { Test, TestingModule } from '@nestjs/testing';

describe('PrismaUserRepository', () => {
  let repository: PrismaUserRepository;
  let prismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrismaService = {
      usuario: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaUserRepository,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    repository = module.get<PrismaUserRepository>(PrismaUserRepository);
    prismaService = module.get(PrismaService);
  });

  it('deve criar um usuario', async () => {
    const data = { nome: 'Admin', email: 'admin@test.com', senha: 'hashed', perfil: 'ADMIN' };
    const mockCreated = { id: 1, ativo: true, criadoEm: new Date(), ...data };
    (prismaService.usuario.create as jest.Mock).mockResolvedValue(mockCreated);

    const result = await repository.create(data);
    expect(prismaService.usuario.create).toHaveBeenCalledWith({ data });
    expect(result).toEqual(mockCreated);
  });
});
