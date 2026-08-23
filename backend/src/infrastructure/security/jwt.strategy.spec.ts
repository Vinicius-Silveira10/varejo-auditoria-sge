import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../database/prisma/prisma.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let mockPrisma: any;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    mockPrisma = {
      usuario: {
        findUnique: jest.fn(),
      },
    };
    strategy = new JwtStrategy(mockPrisma as PrismaService);
  });

  it('deve retornar JwtUser se usuario estiver ativo e com a versao de token correta', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue({
      ativo: true,
      tokenVersion: 1,
      perfil: 'OPERADOR',
      email: 'test@fortal.com',
    });

    const payload = { sub: 1, email: 'test@fortal.com', perfil: 'OPERADOR', tokenVersion: 1 };
    const result = await strategy.validate(payload);

    expect(result).toEqual({ userId: 1, email: 'test@fortal.com', perfil: 'OPERADOR' });
  });

  it('deve rejeitar se usuario não existir', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(null);

    const payload = { sub: 1, email: 'test@fortal.com', perfil: 'OPERADOR', tokenVersion: 1 };
    await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
  });

  it('deve rejeitar se usuario estiver inativo', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue({
      ativo: false,
      tokenVersion: 1,
      perfil: 'OPERADOR',
      email: 'test@fortal.com',
    });

    const payload = { sub: 1, email: 'test@fortal.com', perfil: 'OPERADOR', tokenVersion: 1 };
    await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
  });

  it('deve rejeitar se a versao do token não bater (Sessao invalidada)', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue({
      ativo: true,
      tokenVersion: 2, // Diferente do JWT
      perfil: 'OPERADOR',
      email: 'test@fortal.com',
    });

    const payload = { sub: 1, email: 'test@fortal.com', perfil: 'OPERADOR', tokenVersion: 1 };
    await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
  });
});
