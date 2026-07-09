import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  IAdjustmentRepository,
  AjusteEstoque,
} from '../../../../core/interfaces/repositories/i-adjustment.repository';
import { StatusAprovacao } from '@prisma/client';

@Injectable()
export class PrismaAdjustmentRepository implements IAdjustmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Omit<AjusteEstoque, 'id' | 'criadoEm' | 'atualizadoEm'>,
  ): Promise<AjusteEstoque> {
    const ajuste = await this.prisma.ajusteEstoque.create({
      data: {
        loteId: data.loteId,
        quantidadeDelta: data.quantidadeDelta,
        motivo: data.motivo,
        valorDelta: data.valorDelta,
        statusAprovacao: data.statusAprovacao as StatusAprovacao,
        solicitanteId: data.solicitanteId,
        aprovadorId: data.aprovadorId,
      },
    });

    return this.mapToDomain(ajuste);
  }

  async findById(id: number): Promise<AjusteEstoque | null> {
    const ajuste = await this.prisma.ajusteEstoque.findUnique({
      where: { id },
    });

    if (!ajuste) return null;
    return this.mapToDomain(ajuste);
  }

  async updateStatus(
    id: number,
    status: string,
    aprovadorId: number,
  ): Promise<AjusteEstoque> {
    const ajuste = await this.prisma.ajusteEstoque.update({
      where: { id },
      data: {
        statusAprovacao: status as StatusAprovacao,
        aprovadorId,
      },
    });

    return this.mapToDomain(ajuste);
  }

  async sumFinancialLosses(): Promise<number> {
    const result = await this.prisma.ajusteEstoque.aggregate({
      where: {
        statusAprovacao: 'APROVADO',
        quantidadeDelta: { lt: 0 },
      },
      _sum: {
        valorDelta: true,
      },
    });
    return Math.abs(result._sum.valorDelta || 0);
  }

  async executeApprovalTransaction(params: {
    ajusteId: number;
    aprovadorId: number;
    loteId: number;
    novaQuantidade: number;
  }): Promise<AjusteEstoque> {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Atualizar Saldo do Lote
      await (tx as any).lote.update({
        where: { id: params.loteId },
        data: { quantidade: params.novaQuantidade },
      });

      // 2. Atualizar Status do Ajuste
      const ajuste = await (tx as any).ajusteEstoque.update({
        where: { id: params.ajusteId },
        data: {
          statusAprovacao: 'APROVADO',
          aprovadorId: params.aprovadorId,
        },
      });

      return this.mapToDomain(ajuste);
    });
  }

  private mapToDomain(prismaAjuste: any): AjusteEstoque {
    return {
      id: prismaAjuste.id,
      loteId: prismaAjuste.loteId,
      quantidadeDelta: prismaAjuste.quantidadeDelta,
      motivo: prismaAjuste.motivo,
      valorDelta: prismaAjuste.valorDelta,
      statusAprovacao: prismaAjuste.statusAprovacao,
      solicitanteId: prismaAjuste.solicitanteId,
      aprovadorId: prismaAjuste.aprovadorId ?? undefined,
      criadoEm: prismaAjuste.criadoEm,
      atualizadoEm: prismaAjuste.atualizadoEm,
    };
  }
}
