import { INotaFiscalRepository } from '../../interfaces/repositories/i-nota-fiscal.repository';
import { NotaFiscal, ItemNfe } from '@prisma/client';

export class GetNotaFiscalDetailsUseCase {
  constructor(private readonly nfeRepository: INotaFiscalRepository) {}

  async execute(id: number): Promise<NotaFiscal & { itensNfe: ItemNfe[] }> {
    const nfe = await this.nfeRepository.findById(id);

    if (!nfe) {
      throw new Error(`Nota Fiscal com ID ${id} não encontrada.`);
    }

    return nfe;
  }
}
