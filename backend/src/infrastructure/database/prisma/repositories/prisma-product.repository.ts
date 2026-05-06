import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { IProductRepository } from '../../../../core/interfaces/repositories/i-product.repository';
import { Produto } from '@prisma/client';

@Injectable()
export class PrismaProductRepository implements IProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Omit<Produto, 'id' | 'custoMedio' | 'ativo'>): Promise<Produto> {
    return this.prisma.produto.create({
      data,
    });
  }

  async findById(id: number): Promise<Produto | null> {
    return this.prisma.produto.findUnique({
      where: { id },
    });
  }

  async findBySku(sku: string): Promise<Produto | null> {
    return this.prisma.produto.findUnique({
      where: { sku },
    });
  }

  async updateCustoMedio(id: number, novoCusto: number): Promise<Produto> {
    return this.prisma.produto.update({
      where: { id },
      data: { custoMedio: novoCusto },
    });
  }

  async disable(id: number): Promise<Produto> {
    return this.prisma.produto.update({
      where: { id },
      data: { ativo: false },
    });
  }
}
