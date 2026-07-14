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
