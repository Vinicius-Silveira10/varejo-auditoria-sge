import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { IOrderRepository, PedidoExpedicaoWithItems } from '../../../../core/interfaces/repositories/i-order.repository';
import { PedidoExpedicao } from '@prisma/client';

@Injectable()
export class PrismaOrderRepository implements IOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    codigoPedido: string;
    valorTotal?: number;
    itens: Array<{
      produtoId: number;
      quantidadeSolicitada: number;
    }>;
  }): Promise<PedidoExpedicaoWithItems> {
    return this.prisma.pedidoExpedicao.create({
      data: {
        codigoPedido: data.codigoPedido,
        status: 'PENDENTE',
        valorTotal: data.valorTotal || 0.0,
        itens: {
          create: data.itens.map((item) => ({
            produtoId: item.produtoId,
            quantidadeSolicitada: item.quantidadeSolicitada,
            quantidadeSeparada: 0,
          })),
        },
      },
      include: {
        itens: true,
      },
    });
  }

  async findById(id: number): Promise<PedidoExpedicaoWithItems | null> {
    return this.prisma.pedidoExpedicao.findUnique({
      where: { id },
      include: {
        itens: true,
      },
    });
  }

  async updateStatus(id: number, status: string): Promise<PedidoExpedicao> {
    return this.prisma.pedidoExpedicao.update({
      where: { id },
      data: { status },
    });
  }

  async updateConferentes(id: number, conferente1Id: number, conferente2Id?: number): Promise<PedidoExpedicao> {
    return this.prisma.pedidoExpedicao.update({
      where: { id },
      data: {
        conferente1Id,
        conferente2Id: conferente2Id || null,
        status: 'CONFERIDO',
      },
    });
  }

  async findAll(): Promise<PedidoExpedicaoWithItems[]> {
    return this.prisma.pedidoExpedicao.findMany({
      include: {
        itens: true,
      },
    });
  }
}
