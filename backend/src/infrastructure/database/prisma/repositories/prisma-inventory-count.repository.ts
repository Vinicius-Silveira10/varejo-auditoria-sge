import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { IInventoryCountRepository, ContagemInventario } from '../../../../core/interfaces/repositories/i-inventory-count.repository';

@Injectable()
export class PrismaInventoryCountRepository implements IInventoryCountRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Omit<ContagemInventario, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<ContagemInventario> {
    const contagem = await this.prisma.contagemInventario.create({
      data: {
        loteId: data.loteId,
        quantidadeFisica: data.quantidadeFisica,
        quantidadeTeorica: data.quantidadeTeorica,
        status: data.status,
        usuarioId: data.usuarioId,
      },
    });

    return this.mapToDomain(contagem);
  }

  async findById(id: number): Promise<ContagemInventario | null> {
    const contagem = await this.prisma.contagemInventario.findUnique({
      where: { id },
    });
    
    if (!contagem) return null;
    return this.mapToDomain(contagem);
  }

  async updateCount(id: number, quantidadeFisica: number, status: string): Promise<ContagemInventario> {
    const contagem = await this.prisma.contagemInventario.update({
      where: { id },
      data: {
        quantidadeFisica,
        status,
      },
    });

    return this.mapToDomain(contagem);
  }

  async updateStatus(id: number, status: string): Promise<ContagemInventario> {
    const contagem = await this.prisma.contagemInventario.update({
      where: { id },
      data: {
        status,
      },
    });

    return this.mapToDomain(contagem);
  }

  async findAllFinished(): Promise<ContagemInventario[]> {
    const contagens = await this.prisma.contagemInventario.findMany({
      where: {
        status: { not: 'PENDENTE' },
      },
      include: {
        lote: {
          include: {
            produto: true,
          },
        },
      },
    });

    return contagens.map((c) => this.mapToDomain(c));
  }

  async aggregateAccuracyMetrics(): Promise<{
    totalTeorico: number;
    totalFisico: number;
    totalDivergenciaAbsoluta: number;
    perdaFinanceiraTotal: number;
    totalContagens: number;
  }> {
    const result: any[] = await this.prisma.$queryRaw`
      SELECT 
        COUNT(*) as "totalContagens",
        COALESCE(SUM("quantidadeTeorica"), 0) as "totalTeorico",
        COALESCE(SUM("quantidadeFisica"), 0) as "totalFisico",
        COALESCE(SUM(ABS("quantidadeTeorica" - COALESCE("quantidadeFisica", 0))), 0) as "totalDivergenciaAbsoluta",
        COALESCE(SUM(("quantidadeTeorica" - COALESCE("quantidadeFisica", 0)) * p."custoMedio"), 0) as "perdaFinanceiraTotal"
      FROM "ContagemInventario" c
      JOIN "Lote" l ON c."loteId" = l.id
      JOIN "Produto" p ON l."produtoId" = p.id
      WHERE c.status != 'PENDENTE'
    `;

    return {
      totalContagens: Number(result[0].totalContagens),
      totalTeorico: Number(result[0].totalTeorico),
      totalFisico: Number(result[0].totalFisico),
      totalDivergenciaAbsoluta: Number(result[0].totalDivergenciaAbsoluta),
      perdaFinanceiraTotal: Number(result[0].perdaFinanceiraTotal),
    };
  }

  private mapToDomain(prismaContagem: any): ContagemInventario {
    return {
      id: prismaContagem.id,
      loteId: prismaContagem.loteId,
      quantidadeFisica: prismaContagem.quantidadeFisica ?? undefined,
      quantidadeTeorica: prismaContagem.quantidadeTeorica,
      status: prismaContagem.status,
      usuarioId: prismaContagem.usuarioId,
      criadoEm: prismaContagem.criadoEm,
      atualizadoEm: prismaContagem.atualizadoEm,
    };
  }
}
