import { AuthenticateUserUseCase } from './authenticate-user.use-case';
import { IUserRepository } from '../../interfaces/repositories/i-user.repository';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

jest.mock('bcrypt');

describe('AuthenticateUserUseCase', () => {
  let useCase: AuthenticateUserUseCase;
  let mockRepository: jest.Mocked<IUserRepository>;
  let mockJwtService: jest.Mocked<JwtService>;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
    };
    mockJwtService = {
      sign: jest.fn().mockReturnValue('mocked-jwt-token'),
    } as any;

    useCase = new AuthenticateUserUseCase(mockRepository, mockJwtService);
    jest.clearAllMocks();
  });

  it('deve autenticar um usuario com sucesso e retornar o token', async () => {
    const request = { email: 'admin@test.com', senhaBruta: '123456' };
    const mockUser = { id: 1, nome: 'Admin', email: request.email, senha: 'hashed-password', perfil: 'ADMIN', ativo: true, criadoEm: new Date() };

    mockRepository.findByEmail.mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await useCase.execute(request);

    expect(mockRepository.findByEmail).toHaveBeenCalledWith(request.email);
    expect(bcrypt.compare).toHaveBeenCalledWith(request.senhaBruta, mockUser.senha);
    expect(mockJwtService.sign).toHaveBeenCalledWith({ sub: mockUser.id, email: mockUser.email, perfil: mockUser.perfil });
    expect(result.accessToken).toBe('mocked-jwt-token');
    expect(result.user.email).toBe(request.email);
  });

  it('deve falhar se o email nao existir', async () => {
    const request = { email: 'wrong@test.com', senhaBruta: '123456' };
    mockRepository.findByEmail.mockResolvedValue(null);

    await expect(useCase.execute(request)).rejects.toThrow('RN-USR-002: Credenciais inválidas');
  });

  it('deve falhar se a senha estiver incorreta', async () => {
    const request = { email: 'admin@test.com', senhaBruta: 'wrongpassword' };
    const mockUser = { id: 1, nome: 'Admin', email: request.email, senha: 'hashed-password', perfil: 'ADMIN', ativo: true, criadoEm: new Date() };

    mockRepository.findByEmail.mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(useCase.execute(request)).rejects.toThrow('RN-USR-002: Credenciais inválidas');
  });

  it('deve falhar se o usuario estiver inativo', async () => {
    const request = { email: 'admin@test.com', senhaBruta: '123456' };
    const mockUser = { id: 1, nome: 'Admin', email: request.email, senha: 'hashed-password', perfil: 'ADMIN', ativo: false, criadoEm: new Date() };

    mockRepository.findByEmail.mockResolvedValue(mockUser);

    await expect(useCase.execute(request)).rejects.toThrow('RN-USR-003: Usuário inativo ou bloqueado');
  });
});
