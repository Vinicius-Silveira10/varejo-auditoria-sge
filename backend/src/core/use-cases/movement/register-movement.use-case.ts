import { IBatchRepository } from '../../interfaces/repositories/i-batch.repository';
import { IMovementRepository } from '../../interfaces/repositories/i-movement.repository';
import { IAddressRepository } from '../../interfaces/repositories/i-address.repository';
import { IProductRepository } from '../../interfaces/repositories/i-product.repository';
import { Movimentacao } from '@prisma/client';

export class RegisterMovementUseCase {
  constructor(
    private readonly batchRepository: IBatchRepository,
    private readonly movementRepository: IMovementRepository,
    private readonly addressRepository: IAddressRepository,
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(data: Omit<Movimentacao, 'id' | 'criadoEm' | 'hash' | 'previousHash'>): Promise<Movimentacao> {
    const lote = await this.batchRepository.findById(data.loteId);
    
    if (!lote) {
      throw new Error('Lote não encontrado.');
    }

    if ((lote as any).emInventario && data.tipo !== 'AJUSTE') {
      throw new Error('RN-INV-006: Lote bloqueado para contagem de inventário. Movimentações suspensas.');
    }

    // RN-ARM-001 & RN-ARM-003: Validar endereço destino
    if (data.enderecoDestinoId) {
      const enderecoDestino = await this.addressRepository.findById(data.enderecoDestinoId);

      if (!enderecoDestino) {
        throw new Error('Endereço de destino não encontrado.');
      }

      // RN-ARM-001: Capacidade física do endereço
      if (enderecoDestino.ocupado + data.quantidade > enderecoDestino.capacidade) {
        throw new Error(
          `RN-ARM-001: Capacidade excedida. Endereço ${enderecoDestino.codigo} suporta ${enderecoDestino.capacidade}, ocupação atual: ${enderecoDestino.ocupado}, tentativa: +${data.quantidade}.`,
        );
      }

      // RN-ARM-003: Zonas térmicas (perecíveis)
      const produto = await this.productRepository.findById(lote.produtoId);
      if (produto && produto.perecivel && (enderecoDestino as any).tipoZona === 'SECO') {
        throw new Error(
          'RN-ARM-003: Produto perecível não pode ser armazenado em zona SECO. Utilize zona REFRIGERADO ou CONGELADO.',
        );
      }
    }

    if (data.tipo === 'SAIDA' || data.tipo === 'EXPEDICAO') {
      if (lote.quantidade < data.quantidade) {
        throw new Error('RN-TRV-002: Saldo insuficiente para a movimentação.');
      }
      
      if (data.tipo === 'EXPEDICAO') {
        const lotesDisponiveis = await this.batchRepository.findAvailableByProduct(lote.produtoId);
        
        const olderBatch = lotesDisponiveis.find(l => {
          if (!l.validade || !lote.validade) return false;
          if (l.id === lote.id) return false;
          return l.validade.getTime() < lote.validade.getTime();
        });

        if (olderBatch) {
           throw new Error('RN-EXP-001: Violação de FEFO. Existe um lote com validade mais próxima a expirar.');
        }
      }
      
      await this.batchRepository.updateQuantidade(lote.id, lote.quantidade - data.quantidade);

      // Liberar ocupação no endereço de origem
      if (data.enderecoOrigemId) {
        const enderecoOrigem = await this.addressRepository.findById(data.enderecoOrigemId);
        if (enderecoOrigem) {
          const novaOcupacao = Math.max(0, enderecoOrigem.ocupado - data.quantidade);
          await this.addressRepository.updateOcupacao(enderecoOrigem.id, novaOcupacao);
        }
      }
    } else if (data.tipo === 'ENTRADA') {
      await this.batchRepository.updateQuantidade(lote.id, lote.quantidade + data.quantidade);

      // Incrementar ocupação no endereço destino
      if (data.enderecoDestinoId) {
        const enderecoDestino = await this.addressRepository.findById(data.enderecoDestinoId);
        if (enderecoDestino) {
          await this.addressRepository.updateOcupacao(enderecoDestino.id, enderecoDestino.ocupado + data.quantidade);
        }
      }
    }

    return await this.movementRepository.create(data);
  }
}
