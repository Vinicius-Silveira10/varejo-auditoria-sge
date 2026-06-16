import { GetAddressCapacityAlertsUseCase } from './get-address-capacity-alerts.use-case';
import { IAddressRepository } from '../../interfaces/repositories/i-address.repository';

describe('GetAddressCapacityAlertsUseCase', () => {
  let sut: GetAddressCapacityAlertsUseCase;
  let addressRepository: jest.Mocked<IAddressRepository>;

  beforeEach(() => {
    addressRepository = {
      findAll: jest.fn(),
    } as any;
    sut = new GetAddressCapacityAlertsUseCase(addressRepository);
  });

  it('deve retornar endereços que atingiram o limite de ocupação', async () => {
    const mockAddresses = [
      { id: 1, codigo: 'A1-01', capacidade: 100, ocupado: 95, zona: 'PICKING', tipoZona: 'PALLET' },
      { id: 2, codigo: 'A1-02', capacidade: 100, ocupado: 50, zona: 'PICKING', tipoZona: 'PALLET' }
    ];

    addressRepository.findAll.mockResolvedValue(mockAddresses as any);

    const result = await sut.execute(0.9);

    expect(result).toHaveLength(1);
    expect(result[0].codigo).toBe('A1-01');
    expect(result[0].percentualOcupacao).toBe(95);
  });

  it('deve retornar lista vazia se nenhum endereço atingir o limite', async () => {
    addressRepository.findAll.mockResolvedValue([
      { id: 2, codigo: 'A1-02', capacidade: 100, ocupado: 50, zona: 'PICKING', tipoZona: 'PALLET' }
    ] as any);

    const result = await sut.execute(0.9);

    expect(result).toHaveLength(0);
  });
});
