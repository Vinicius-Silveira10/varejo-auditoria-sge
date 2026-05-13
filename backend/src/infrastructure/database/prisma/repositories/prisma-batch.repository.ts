import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { IBatchRepository } from '../../../../core/interfaces/repositories/i-batch.repository';
import { Lote } from '@prisma/client';

@Injectable()
export class PrismaBatchRepository implements IBatchRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Omit<Lote, 'id' | 'criadoEm'>): Promise<Lote> {
    return this.prisma.lote.create({
      data,
    });
  }

  async findById(id: number): Promise<Lote | null> {
    return this.prisma.lote.findUnique({
      where: { id },
    });
  }

  async findAvailableByProduct(produtoId: number): Promise<Lote[]> {
    return this.prisma.lote.findMany({
      where: {
        produtoId,
        quantidade: { gt: 0 },
        ativo: true,
      },
      orderBy: { validade: 'asc' }, // FEFO base ordering
    });
  }

  async updateQuantidade(id: number, novaQuantidade: number): Promise<Lote> {
    return this.prisma.lote.update({
      where: { id },
      data: { quantidade: novaQuantidade },
    });
  }

  async updateQuantidadeDelta(id: number, delta: number): Promise<Lote> {
    const loteDb = await this.prisma.lote.update({
      where: { id },
      data: { quantidade: { increment: delta } },
    });
    if (loteDb.quantidade < 0) {
      throw new Error('RN-TRV-002: Saldo insuficiente no lote.');
    }
    return loteDb;
  }

  async updateInventarioStatus(id: number, status: boolean): Promise<Lote> {
    return this.prisma.lote.update({
      where: { id },
      data: { emInventario: status },
    });
  }

  async countByNotaFiscal(notaFiscalId: number): Promise<number> {
    return this.prisma.lote.count({
      where: { notaFiscalId },
    });
  }

  async findExpiring(days: number): Promise<Lote[]> {
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() + days);

    return this.prisma.lote.findMany({
      where: {
        quantidade: { gt: 0 },
        ativo: true,
        validade: {
          lte: limitDate,
          gte: new Date(), // Apenas os que não venceram ainda ou vencem hoje
        },
      },
      orderBy: { validade: 'asc' },
      include: {
        produto: true,
      } as any,
    });
  }
}
