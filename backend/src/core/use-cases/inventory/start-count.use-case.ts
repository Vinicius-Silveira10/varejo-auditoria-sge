import { IInventoryCountRepository } from '../../interfaces/repositories/i-inventory-count.repository';
import { IBatchRepository } from '../../interfaces/repositories/i-batch.repository';

export interface StartCountDto {
  loteId: number;
  usuarioId: number;
}

export class StartCountUseCase {
  constructor(
    private readonly inventoryCountRepository: IInventoryCountRepository,
    private readonly batchRepository: IBatchRepository,
  ) {}

  async execute(dto: StartCountDto) {
    const lote = await this.batchRepository.findById(dto.loteId);

    if (!lote) {
      throw new Error('Lote não encontrado.');
    }

    if (!lote.ativo) {
      throw new Error('Não é possível iniciar inventário de um lote desativado.');
    }

    if ((lote as any).emInventario) {
      throw new Error('Este lote já está sob contagem de inventário.');
    }

    // Bloqueia o lote logicamente (RN-INV-006)
    await this.batchRepository.updateInventarioStatus(lote.id, true);

    // Registra a tarefa de contagem
    const contagem = await this.inventoryCountRepository.create({
      loteId: lote.id,
      quantidadeTeorica: lote.quantidade,
      status: 'PENDENTE',
      usuarioId: dto.usuarioId,
    });

    return contagem;
  }
}
