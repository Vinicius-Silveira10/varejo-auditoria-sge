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

    // BUG-004 FIX — RN-INV-006: Bloqueio absoluto de inventário para TODOS os tipos.
    // Antes havia exceção para tipo 'AJUSTE', permitindo adulteração durante contagem.
    if ((lote as any).emInventario) {
      throw new Error('RN-INV-006: Lote bloqueado para contagem de inventário. Todas as movimentações estão suspensas.');
    }

    // RN-MOV-001: Validação de Rastreabilidade (Origem/Destino Obrigatórios)
    if ((data.tipo === 'SAIDA' || data.tipo === 'EXPEDICAO') && !data.enderecoOrigemId) {
      throw new Error('RN-MOV-001: Movimentação de saída exige um endereço de origem válido.');
    }

    if (data.tipo === 'ENTRADA' && !data.enderecoDestinoId) {
      throw new Error('RN-MOV-001: Movimentação de entrada exige um endereço de destino válido.');
    }

    // RN-ARM-001 & RN-ARM-003: Validar endereço destino
    if (data.enderecoDestinoId) {
      const enderecoDestino = await this.addressRepository.findById(data.enderecoDestinoId);

      if (!enderecoDestino) {
        throw new Error('Endereço de destino não encontrado.');
      }

      // Verificar se endereço está bloqueado por inventário em andamento (GAP-007)
      if ((enderecoDestino as any).bloqueado) {
        throw new Error('RN-INV-006: Endereço bloqueado para contagem de inventário. Movimentações de entrada suspensas neste endereço.');
      }

      // RN-ARM-001: Capacidade física do endereço
      if (enderecoDestino.ocupado + data.quantidade > enderecoDestino.capacidade) {
        throw new Error(
          `RN-ARM-001: Capacidade excedida. Endereço ${enderecoDestino.codigo} suporta ${enderecoDestino.capacidade}, ocupação atual: ${enderecoDestino.ocupado}, tentativa: +${data.quantidade}.`,
        );
      }

      // RN-ARM-003: Zonas térmicas (compatibilidade)
      const produto = await this.productRepository.findById(lote.produtoId);
      if (produto && (produto as any).tipoZonaRequerida !== (enderecoDestino as any).tipoZona) {
        throw new Error(
          `RN-ARM-003: Incompatibilidade térmica. Produto requer zona ${(produto as any).tipoZonaRequerida}, mas o endereço é ${(enderecoDestino as any).tipoZona}.`,
        );
      }
    }

    if (data.enderecoOrigemId) {
      const enderecoOrigem = await this.addressRepository.findById(data.enderecoOrigemId);
      if (enderecoOrigem && (enderecoOrigem as any).bloqueado) {
        throw new Error('RN-INV-006: Endereço de origem bloqueado para contagem de inventário. Movimentações de saída suspensas neste endereço.');
      }
    }

    // --- Fluxos por tipo de movimentação ---

    if (data.tipo === 'SAIDA' || data.tipo === 'EXPEDICAO') {
      if (lote.quantidade < data.quantidade) {
        throw new Error('RN-TRV-002: Saldo insuficiente para a movimentação.');
      }

      if (data.tipo === 'EXPEDICAO') {
        const lotesDisponiveis = await this.batchRepository.findAvailableByProduct(lote.produtoId);

        // RN-EXP-001 FIX: Lotes sem validade têm prioridade MÍNIMA (saem por último)
        // Lote corrente deve ser o mais urgente entre os COM validade, se existir algum com validade
        const olderBatch = lotesDisponiveis.find((l) => {
          if (l.id === lote.id) return false;
          // Se lote candidato tem validade e o atual não → candidato é mais urgente
          if (l.validade && !lote.validade) return true;
          // Se ambos têm validade → compara datas
          if (l.validade && lote.validade) return l.validade.getTime() < lote.validade.getTime();
          // Se candidato não tem validade → não é mais urgente
          return false;
        });

        if (olderBatch) {
          throw new Error('RN-EXP-001: Violação de FEFO. Existe um lote com validade mais próxima a expirar.');
        }
      }

      let novaOcupacaoOrigem: number | undefined;
      if (data.enderecoOrigemId) {
        const enderecoOrigem = await this.addressRepository.findById(data.enderecoOrigemId);
        if (enderecoOrigem) {
          novaOcupacaoOrigem = Math.max(0, enderecoOrigem.ocupado - data.quantidade);
        }
      }

      return await this.movementRepository.executeMovementTransaction({
        movementData: data,
        loteId: lote.id,
        quantidadeDeltaLote: -data.quantidade,
        origemId: data.enderecoOrigemId ?? undefined,
        novaOcupacaoOrigem,
      });

    } else if (data.tipo === 'ENTRADA') {
      let novaOcupacaoDestino: number | undefined;
      if (data.enderecoDestinoId) {
        const enderecoDestino = await this.addressRepository.findById(data.enderecoDestinoId);
        if (enderecoDestino) {
          novaOcupacaoDestino = enderecoDestino.ocupado + data.quantidade;
        }
      }

      return await this.movementRepository.executeMovementTransaction({
        movementData: data,
        loteId: lote.id,
        quantidadeDeltaLote: data.quantidade,
        destinoId: data.enderecoDestinoId ?? undefined,
        novaOcupacaoDestino,
      });

    } else if (data.tipo === 'INVENTARIO' || data.tipo === 'AJUSTE') {
      // BUG-003 FIX: Tipos INVENTARIO e AJUSTE também atualizam saldo do lote atomicamente.
      // O delta é positivo para adições e negativo para subtrações.
      // Para INVENTARIO, data.quantidade pode ser positiva (sobra) ou negativa (falta);
      // convenciona-se que o caller passa o delta já com o sinal correto.
      return await this.movementRepository.executeMovementTransaction({
        movementData: data,
        loteId: lote.id,
        quantidadeDeltaLote: data.quantidade, // delta com sinal: positivo = entrada, negativo = saída
      });
    }

    // Fallback para tipos não mapeados (registro sem efeito no saldo — apenas auditoria)
    return await this.movementRepository.create(data);
  }
}
