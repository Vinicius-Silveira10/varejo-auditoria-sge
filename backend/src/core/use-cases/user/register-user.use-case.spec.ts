import { RegisterUserUseCase } from './register-user.use-case';
import { IUserRepository } from '../../interfaces/repositories/i-user.repository';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('RegisterUserUseCase', () => {
  let useCase: RegisterUserUseCase;
  let mockRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
    };
    useCase = new RegisterUserUseCase(mockRepository);
    jest.clearAllMocks();
  });

  it('deve registrar um novo usuario criptografando a senha', async () => {
    const request = { nome: 'Admin', email: 'admin@test.com', senhaBruta: '123456', perfil: 'ADMIN' };
    const mockHashedPassword = 'hashed-password-123';
    const mockCreated = { id: 1, nome: request.nome, email: request.email, senha: mockHashedPassword, perfil: request.perfil, ativo: true, criadoEm: new Date() };

    mockRepository.findByEmail.mockResolvedValue(null);
    (bcrypt.hash as jest.Mock).mockResolvedValue(mockHashedPassword);
    mockRepository.create.mockResolvedValue(mockCreated);

    const result = await useCase.execute(request);

    expect(mockRepository.findByEmail).toHaveBeenCalledWith(request.email);
    expect(bcrypt.hash).toHaveBeenCalledWith(request.senhaBruta, 10);
    expect(mockRepository.create).toHaveBeenCalledWith({
      nome: request.nome,
      email: request.email,
      senha: mockHashedPassword,
      perfil: request.perfil,
    });
    
    expect((result as any).senha).toBeUndefined(); // Senha nao deve ser retornada
    expect(result.email).toBe(request.email);
  });

  it('deve falhar se o email ja estiver em uso (RN-USR-001)', async () => {
    const request = { nome: 'Admin', email: 'admin@test.com', senhaBruta: '123456', perfil: 'ADMIN' };
    mockRepository.findByEmail.mockResolvedValue({ id: 1 } as any);

    await expect(useCase.execute(request)).rejects.toThrow('RN-USR-001: Email admin@test.com já está em uso');
    expect(mockRepository.create).not.toHaveBeenCalled();
  });
});
