import { IOrderRepository } from '../../interfaces/repositories/i-order.repository';

export interface OtifDashboard {
  totalPedidos: number;
  pedidosCompletos: number;
  pedidosDivergentes: number;
  otifRate: number;
}

export class GetOtifDashboardUseCase {
  constructor(private readonly orderRepo: IOrderRepository) {}

  async execute(): Promise<OtifDashboard> {
    const pedidos = await this.orderRepo.findAll();

    if (pedidos.length === 0) {
      return {
        totalPedidos: 0,
        pedidosCompletos: 0,
        pedidosDivergentes: 0,
        otifRate: 100,
      };
    }

    let pedidosCompletos = 0;
    let pedidosDivergentes = 0;

    for (const pedido of pedidos) {
      let divergente = false;
      
      for (const item of pedido.itens) {
        if (item.quantidadeSolicitada !== item.quantidadeSeparada) {
          divergente = true;
          break;
        }
      }

      if (divergente) {
        pedidosDivergentes++;
      } else {
        pedidosCompletos++;
      }
    }

    const otifRate = Math.round((pedidosCompletos / pedidos.length) * 100);

    return {
      totalPedidos: pedidos.length,
      pedidosCompletos,
      pedidosDivergentes,
      otifRate,
    };
  }
}
