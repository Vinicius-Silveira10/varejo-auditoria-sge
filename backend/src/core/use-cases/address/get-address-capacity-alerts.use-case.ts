import { IAddressRepository } from '../../interfaces/repositories/i-address.repository';

export class GetAddressCapacityAlertsUseCase {
  constructor(private readonly addressRepository: IAddressRepository) {}

  async execute(threshold: number = 0.9) {
    const addresses = await this.addressRepository.findAll();
    
    return addresses
      .filter(addr => (addr.ocupado / addr.capacidade) >= threshold)
      .map(addr => ({
        id: addr.id,
        codigo: addr.codigo,
        zona: addr.zona,
        tipoZona: addr.tipoZona,
        capacidade: addr.capacidade,
        ocupado: addr.ocupado,
        percentualOcupacao: Math.round((addr.ocupado / addr.capacidade) * 100)
      }));
  }
}
