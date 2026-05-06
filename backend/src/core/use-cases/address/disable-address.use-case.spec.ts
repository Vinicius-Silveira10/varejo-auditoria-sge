import { DisableAddressUseCase } from './disable-address.use-case';
import { IAddressRepository } from '../../interfaces/repositories/i-address.repository';

describe('DisableAddressUseCase', () => {
  let useCase: DisableAddressUseCase;
  let mockRepository: jest.Mocked<IAddressRepository>;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByCodigo: jest.fn(),
      disable: jest.fn(),
    };
    useCase = new DisableAddressUseCase(mockRepository);
  });

  it('deve desativar um endereco existente', async () => {
    const mockAddress = { id: 1, codigo: 'A-01', zona: 'Seca', capacidade: 100, ocupado: 0, ativo: true };
    const mockDisabled = { ...mockAddress, ativo: false };

    mockRepository.findById.mockResolvedValue(mockAddress);
    mockRepository.disable.mockResolvedValue(mockDisabled);

    const result = await useCase.execute(1);

    expect(mockRepository.findById).toHaveBeenCalledWith(1);
    expect(mockRepository.disable).toHaveBeenCalledWith(1);
    expect(result.ativo).toBe(false);
  });

  it('deve falhar se o endereco nao for encontrado', async () => {
    mockRepository.findById.mockResolvedValue(null);
    await expect(useCase.execute(99)).rejects.toThrow('RN-ARM-002: Endereço com ID 99 não encontrado');
  });

  it('deve falhar se o endereco ja estiver desativado', async () => {
    const mockAddress = { id: 1, codigo: 'A-01', zona: 'Seca', capacidade: 100, ocupado: 0, ativo: false };
    mockRepository.findById.mockResolvedValue(mockAddress);
    
    await expect(useCase.execute(1)).rejects.toThrow('RN-ARM-003: O endereço com ID 1 já está desativado');
  });
});
