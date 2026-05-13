import { GetOccupationDashboardUseCase } from './get-occupation-dashboard.use-case';
import { IAddressRepository } from '../../interfaces/repositories/i-address.repository';

describe('GetOccupationDashboardUseCase', () => {
  let useCase: GetOccupationDashboardUseCase;
  let mockAddressRepo: jest.Mocked<IAddressRepository>;

  beforeEach(() => {
    mockAddressRepo = {
      aggregateOccupationByZone: jest.fn(),
    } as any;
    useCase = new GetOccupationDashboardUseCase(mockAddressRepo);
  });

  it('deve calcular ocupação por zona corretamente', async () => {
    mockAddressRepo.aggregateOccupationByZone.mockResolvedValue([
      { tipoZona: 'SECO', capacidadeTotal: 200, ocupacaoTotal: 80 },
      { tipoZona: 'REFRIGERADO', capacidadeTotal: 50, ocupacaoTotal: 40 },
    ] as any);

    const result = await useCase.execute();

    // SECO: (50+30) / (100+100) = 80 / 200 = 40%
    const seco = result.porZona.find(z => z.zona === 'SECO');
    expect(seco?.percentual).toBe(40);

    // REFRIGERADO: 40 / 50 = 80%
    const ref = result.porZona.find(z => z.zona === 'REFRIGERADO');
    expect(ref?.percentual).toBe(80);

    // Global: (80 + 40) / (200 + 50) = 120 / 250 = 48%
    expect(result.totalGlobal.percentual).toBe(48);
  });

  it('deve retornar 0 se não houver endereços', async () => {
    mockAddressRepo.aggregateOccupationByZone.mockResolvedValue([]);
    const result = await useCase.execute();
    expect(result.totalGlobal.percentual).toBe(0);
    expect(result.porZona).toHaveLength(0);
  });
});
