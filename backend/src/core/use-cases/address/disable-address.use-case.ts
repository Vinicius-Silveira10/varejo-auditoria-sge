import { IAddressRepository } from '../../interfaces/repositories/i-address.repository';
import { Endereco } from '@prisma/client';

export class DisableAddressUseCase {
  constructor(private readonly addressRepository: IAddressRepository) {}

  async execute(id: number): Promise<Endereco> {
    const existingAddress = await this.addressRepository.findById(id);
    
    if (!existingAddress) {
      throw new Error(`RN-ARM-002: Endereço com ID ${id} não encontrado`);
    }

    if (!existingAddress.ativo) {
      throw new Error(`RN-ARM-003: O endereço com ID ${id} já está desativado`);
    }

    return this.addressRepository.disable(id);
  }
}
