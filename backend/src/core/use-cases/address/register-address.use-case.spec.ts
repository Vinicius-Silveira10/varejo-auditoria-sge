import { RegisterAddressUseCase } from './register-address.use-case';
import { IAddressRepository } from '../../interfaces/repositories/i-address.repository';

describe('RegisterAddressUseCase', () => {
  let useCase: RegisterAddressUseCase;
  let mockRepository: jest.Mocked<IAddressRepository>;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByCodigo: jest.fn(),
      disable: jest.fn(),
      updateOcupacao: jest.fn(),
    };
    useCase = new RegisterAddressUseCase(mockRepository);
  });

  it('deve registrar um novo endereco com sucesso', async () => {
    const request = { codigo: 'A-01', zona: 'Seca', capacidade: 100 };
    const mockCreated = { id: 1, ocupado: 0, ativo: true, ...request };

    mockRepository.findByCodigo.mockResolvedValue(null);
    mockRepository.create.mockResolvedValue(mockCreated);

    const result = await useCase.execute(request);

    expect(mockRepository.findByCodigo).toHaveBeenCalledWith('A-01');
    expect(mockRepository.create).toHaveBeenCalledWith({ ...request, tipoZona: 'SECO' });
    expect(result).toEqual(mockCreated);
  });

  it('deve bloquear se o codigo ja existir (RN-ARM-001)', async () => {
    const request = { codigo: 'A-01', zona: 'Seca', capacidade: 100 };
    mockRepository.findByCodigo.mockResolvedValue({ id: 1, ocupado: 0, ativo: true, ...request });

    await expect(useCase.execute(request)).rejects.toThrow('RN-ARM-001: Já existe um endereço cadastrado com o código A-01');
    expect(mockRepository.create).not.toHaveBeenCalled();
  });
});
