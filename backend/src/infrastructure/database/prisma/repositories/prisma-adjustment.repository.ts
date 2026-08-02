import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  IAdjustmentRepository,
  AjusteEstoque,
  AjusteEstoqueWithDetails,
} from '../../../../core/interfaces/repositories/i-adjustment.repository';
import { StatusAprovacao } from '@prisma/client';
import { calcularNivelAprovacaoExigido } from '../../../../core/domain/adjustment/adjustment.rules';

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
        saldoTeorico: data.saldoTeorico,
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

  async findPending(status?: string): Promise<AjusteEstoqueWithDetails[]> {
    const ajustes = await this.prisma.ajusteEstoque.findMany({
      where: { statusAprovacao: (status as StatusAprovacao) ?? 'PENDENTE' },
      include: {
        lote: {
          include: {
            produto: true,
          },
        },
      },
      orderBy: { criadoEm: 'asc' },
    });

    return ajustes.map((ajuste) => {
      return {
        ...this.mapToDomain(ajuste),
        lote: {
          numeroLote: ajuste.lote.numeroLote,
          produto: {
            sku: ajuste.lote.produto.sku,
            descricao: ajuste.lote.produto.descricao,
          },
        },
        // RN-AJU-004: usa valorDelta E saldoTeorico JÁ persistidos (congelados no momento da solicitação)
        // garantindo consistência completa com o enforcement em approve-adjustment.use-case.ts
        nivelAprovacaoExigido: calcularNivelAprovacaoExigido(
          ajuste.quantidadeDelta,
          ajuste.valorDelta,
          ajuste.saldoTeorico,
        ),
      };
    });
  }

  private mapToDomain(prismaAjuste: any): AjusteEstoque {
    return {
      id: prismaAjuste.id,
      loteId: prismaAjuste.loteId,
      quantidadeDelta: prismaAjuste.quantidadeDelta,
      motivo: prismaAjuste.motivo,
      valorDelta: prismaAjuste.valorDelta,
      saldoTeorico: prismaAjuste.saldoTeorico,
      statusAprovacao: prismaAjuste.statusAprovacao,
      solicitanteId: prismaAjuste.solicitanteId,
      aprovadorId: prismaAjuste.aprovadorId ?? undefined,
      criadoEm: prismaAjuste.criadoEm,
      atualizadoEm: prismaAjuste.atualizadoEm,
    };
  }
}
