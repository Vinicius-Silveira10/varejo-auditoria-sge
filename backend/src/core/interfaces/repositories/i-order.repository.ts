import { PedidoExpedicao, ItemPedido } from '@prisma/client';

// Representação de um Pedido completo com seus itens
export type PedidoExpedicaoWithItems = PedidoExpedicao & {
  itens: ItemPedido[];
};

export interface IOrderRepository {
  create(data: {
    codigoPedido: string;
    valorTotal?: number;
    itens: Array<{
      produtoId: number;
      quantidadeSolicitada: number;
    }>;
  }): Promise<PedidoExpedicaoWithItems>;
  
  findById(id: number): Promise<PedidoExpedicaoWithItems | null>;
  
  updateStatus(id: number, status: string): Promise<PedidoExpedicao>;

  updateConferentes(id: number, conferente1Id: number, conferente2Id?: number): Promise<PedidoExpedicao>;
  findAll(): Promise<PedidoExpedicaoWithItems[]>;
}
