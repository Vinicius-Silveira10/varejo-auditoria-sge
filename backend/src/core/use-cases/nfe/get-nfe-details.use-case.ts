import { INotaFiscalRepository } from '../../interfaces/repositories/i-nota-fiscal.repository';
import { NotaFiscal, ItemNfe } from '@prisma/client';
import { NotFoundException } from '../../exceptions/domain.exception';

export class GetNotaFiscalDetailsUseCase {
  constructor(private readonly nfeRepository: INotaFiscalRepository) {}

  async execute(id: number): Promise<NotaFiscal & { itensNfe: ItemNfe[] }> {
    const nfe = await this.nfeRepository.findById(id);

    if (!nfe) {
      throw new NotFoundException(`Nota Fiscal com ID ${id} não encontrada.`);
    }

    return nfe;
  }
}
