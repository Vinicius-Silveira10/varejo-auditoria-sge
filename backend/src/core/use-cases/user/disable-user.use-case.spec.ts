import { DisableUserUseCase } from './disable-user.use-case';
import { IUserRepository } from '../../interfaces/repositories/i-user.repository';

describe('DisableUserUseCase (RN-TRV-003)', () => {
  let useCase: DisableUserUseCase;
  let mockUserRepo: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    mockUserRepo = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
      disable: jest.fn(),
    };
    useCase = new DisableUserUseCase(mockUserRepo);
  });

  it('deve desativar um usuário existente via soft delete', async () => {
    mockUserRepo.findById.mockResolvedValue({ id: 1, nome: 'João', email: 'joao@test.com', senha: 'hash', perfil: 'OPERADOR', ativo: true, criadoEm: new Date() });
    mockUserRepo.disable.mockResolvedValue({ id: 1, nome: 'João', email: 'joao@test.com', senha: 'hash', perfil: 'OPERADOR', ativo: false, criadoEm: new Date() });

    const result = await useCase.execute(1);

    expect(mockUserRepo.disable).toHaveBeenCalledWith(1);
    expect(result.ativo).toBe(false);
  });

  it('deve falhar se o usuário não existir', async () => {
    mockUserRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute(999)).rejects.toThrow('Usuário não encontrado.');
  });

  it('deve falhar se o usuário já estiver desativado', async () => {
    mockUserRepo.findById.mockResolvedValue({ id: 1, nome: 'João', email: 'joao@test.com', senha: 'hash', perfil: 'OPERADOR', ativo: false, criadoEm: new Date() });

    await expect(useCase.execute(1)).rejects.toThrow('Usuário já está desativado.');
  });
});
