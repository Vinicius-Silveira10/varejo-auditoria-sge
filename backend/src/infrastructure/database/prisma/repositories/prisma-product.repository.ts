import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { IProductRepository } from '../../../../core/interfaces/repositories/i-product.repository';
import { Produto } from '@prisma/client';

@Injectable()
export class PrismaProductRepository implements IProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Omit<Produto, 'id' | 'custoMedio' | 'ativo' | 'curvaAbc'>,
  ): Promise<Produto> {
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

  async updateCurvaAbc(id: number, curva: string): Promise<Produto> {
    return this.prisma.produto.update({
      where: { id },
      data: { curvaAbc: curva },
    });
  }

  async disable(id: number): Promise<Produto> {
    return this.prisma.produto.update({
      where: { id },
      data: { ativo: false },
    });
  }

  async findAll(): Promise<Produto[]> {
    return this.prisma.produto.findMany({
      where: { ativo: true },
      orderBy: { sku: 'asc' },
    });
  }

  async getRupturesKpi(): Promise<{
    totalCurvaA: number;
    rupturasCurvaA: number;
    porcentagem: number;
  }> {
    const productsA = await this.prisma.produto.findMany({
      where: {
        curvaAbc: 'A',
        ativo: true,
      },
      include: {
        lotes: {
          where: {
            ativo: true,
            quantidade: { gt: 0 },
          },
        },
      },
    });

    const totalCurvaA = productsA.length;
    if (totalCurvaA === 0) {
      return { totalCurvaA: 0, rupturasCurvaA: 0, porcentagem: 0 };
    }

    const rupturasCurvaA = productsA.filter((p) => p.lotes.length === 0).length;
    const porcentagem = Math.round((rupturasCurvaA / totalCurvaA) * 100);

    return {
      totalCurvaA,
      rupturasCurvaA,
      porcentagem,
    };
  }
}
