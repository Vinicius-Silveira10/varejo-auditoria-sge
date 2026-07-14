import { IInventoryCountRepository } from '../../interfaces/repositories/i-inventory-count.repository';
import { IBatchRepository } from '../../interfaces/repositories/i-batch.repository';
import { IAddressRepository } from '../../interfaces/repositories/i-address.repository';
import { IMovementRepository } from '../../interfaces/repositories/i-movement.repository';
import { IProductRepository } from '../../interfaces/repositories/i-product.repository';
import { ConflictException, DomainException, NotFoundException } from '../../exceptions/domain.exception';

export interface StartCountDto {
  loteId: number;
  usuarioId: number;
}

export class StartCountUseCase {
  constructor(
    private readonly inventoryCountRepository: IInventoryCountRepository,
    private readonly batchRepository: IBatchRepository,
    private readonly addressRepository: IAddressRepository,
    private readonly movementRepository: IMovementRepository,
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(dto: StartCountDto) {
    const lote = await this.batchRepository.findById(dto.loteId);

    if (!lote) {
      throw new NotFoundException('Lote não encontrado.');
    }

    if (!lote.ativo) {
      throw new DomainException(
        'Não é possível iniciar inventário de um lote desativado.',
      );
    }

    if ((lote as any).emInventario) {
      throw new ConflictException('Este lote já está sob contagem de inventário.');
    }

    // Verificar frequência de contagem para classes B/C (GAP-008 / RN-INV-004)
    const produto = await this.productRepository.findById(lote.produtoId);
    if (!produto) {
      throw new NotFoundException('Produto não encontrado.');
    }

    const curva = (produto as any).curvaAbc || 'C';
    if (curva === 'B' || curva === 'C') {
      const latestCount =
        await this.inventoryCountRepository.findLatestFinishedByProduct(
          produto.id,
        );
      if (latestCount && latestCount.criadoEm) {
        const diffMs = Date.now() - latestCount.criadoEm.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        const minDays = curva === 'B' ? 15 : 30;
        if (diffDays < minDays) {
          throw new DomainException(
            `RN-INV-004: Frequência de inventário para produtos de classe ${curva} não respeitada (mínimo ${minDays} dias).`,
          );
        }
      }
    }

    // Identificar o endereço associado ao lote (via movimentos) e bloqueá-lo
    const movements = await this.movementRepository.findByLote(dto.loteId);
    const lastMov = movements.find(
      (m) => m.enderecoDestinoId || m.enderecoOrigemId,
    );
    const enderecoId = lastMov?.enderecoDestinoId || lastMov?.enderecoOrigemId;
    if (enderecoId) {
      await this.addressRepository.bloquear(enderecoId);
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
