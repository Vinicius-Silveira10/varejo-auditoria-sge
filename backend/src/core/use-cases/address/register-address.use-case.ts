import { IAddressRepository } from '../../interfaces/repositories/i-address.repository';
import { Endereco } from '@prisma/client';
import { ConflictException } from '../../exceptions/domain.exception';

export interface RegisterAddressRequest {
  codigo: string;
  zona: string;
  tipoZona?: string; // 'SECO' | 'REFRIGERADO' | 'CONGELADO'
  capacidade: number;
}

export class RegisterAddressUseCase {
  constructor(private readonly addressRepository: IAddressRepository) {}

  async execute(request: RegisterAddressRequest): Promise<Endereco> {
    const existingAddress = await this.addressRepository.findByCodigo(
      request.codigo,
    );

    if (existingAddress) {
      throw new ConflictException(
        `RN-ARM-001: Já existe um endereço cadastrado com o código ${request.codigo}`,
      );
    }

    return this.addressRepository.create({
      ...request,
      tipoZona: request.tipoZona || 'SECO',
    });
  }
}
