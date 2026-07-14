import type { IBatchRepository } from '../../interfaces/repositories/i-batch.repository';
import type { IAddressRepository } from '../../interfaces/repositories/i-address.repository';
import type { IProductRepository } from '../../interfaces/repositories/i-product.repository';
import type { IUnitOfWork } from '../../interfaces/repositories/i-unit-of-work';
import { DomainException, NotFoundException } from '../../exceptions/domain.exception';
import { Movimentacao } from '@prisma/client';
import { Injectable } from '@nestjs/common';

export interface ExecutePutawayRequest {
  loteId: number;
  enderecoDestinoId: number;
  quantidade: number;
  usuarioId: number;
}

@Injectable()
export class ExecutePutawayUseCase {
  constructor(
    private readonly batchRepository: IBatchRepository,
    private readonly addressRepository: IAddressRepository,
    private readonly productRepository: IProductRepository,
    private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(request: ExecutePutawayRequest): Promise<Movimentacao> {
    if (request.quantidade <= 0) {
      throw new DomainException('A quantidade a armazenar deve ser maior que zero.');
    }

    const lote = await this.batchRepository.findById(request.loteId);

    if (!lote) {
      throw new NotFoundException('Lote não encontrado.');
    }

    if (!lote.ativo) {
      throw new DomainException('Não é possível movimentar um lote inativo.');
    }

    // Calcula quantidade pendente de armazenagem
    const movimentacoes = (lote as any).movimentacoes || [];
    const armazenado = movimentacoes
      .filter((m: any) => m.tipo === 'ARMAZENAGEM')
      .reduce((sum: number, m: any) => sum + m.quantidade, 0);

    const pendente = lote.quantidade - armazenado;

    if (request.quantidade > pendente) {
      throw new DomainException(
        `Quantidade excede o saldo pendente de armazenagem. Pendente: ${pendente}, Solicitado: ${request.quantidade}.`,
      );
    }

    const endereco = await this.addressRepository.findById(request.enderecoDestinoId);
    if (!endereco) {
      throw new NotFoundException('Endereço de destino não encontrado.');
    }

    if ((endereco as any).bloqueado) {
      throw new DomainException(
        'RN-INV-006: Endereço bloqueado para contagem de inventário.',
      );
    }

    if (endereco.ocupado + request.quantidade > endereco.capacidade) {
      throw new DomainException(
        `RN-ARM-001: Capacidade excedida. Endereço suporta ${endereco.capacidade}, ocupação atual: ${endereco.ocupado}, tentativa: +${request.quantidade}.`,
      );
    }

    const produto = await this.productRepository.findById(lote.produtoId);
    if (produto && (produto as any).tipoZonaRequerida !== (endereco as any).tipoZona) {
      throw new DomainException(
        `RN-ARM-003: Incompatibilidade térmica. Produto requer zona ${(produto as any).tipoZonaRequerida}, mas o endereço é ${(endereco as any).tipoZona}.`,
      );
    }

    return await this.unitOfWork.execute(async (ctx) => {
      // FIX: Prevenção de Deadlock (ADR-005) - Adquirir lock de domínio antes do ChainPointer
      await ctx.lockForUpdate('Lote', lote.id);
      await ctx.lockForUpdate('Endereco', endereco.id);

      const novaOcupacao = endereco.ocupado + request.quantidade;
      await ctx.addressRepository.updateOcupacao(endereco.id, novaOcupacao);

      // Tipos Conhecidos (Documentação):
      // - ENTRADA: Geração de saldo via Recebimento/Avulso
      // - SAIDA: Perda/Roubo/Baixa avulsa
      // - EXPEDICAO: Saída via separação de pedido (PickOrder)
      // - AJUSTE: Ajuste de divergência de inventário (pos/neg)
      // - INVENTARIO: Resultado de contagem
      // - ARMAZENAGEM: Movimentação física de um lote para um endereço (não altera saldo)
      return await ctx.movementRepository.create({
        tipo: 'ARMAZENAGEM',
        loteId: lote.id,
        quantidade: request.quantidade,
        motivo: 'Putaway / Armazenagem',
        enderecoOrigemId: null,
        enderecoDestinoId: endereco.id,
        usuarioId: request.usuarioId,
      });
    });
  }
}
