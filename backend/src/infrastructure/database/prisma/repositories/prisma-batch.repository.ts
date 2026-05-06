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

  async updateInventarioStatus(id: number, status: boolean): Promise<Lote> {
    return this.prisma.lote.update({
      where: { id },
      data: { emInventario: status },
    });
  }
}
