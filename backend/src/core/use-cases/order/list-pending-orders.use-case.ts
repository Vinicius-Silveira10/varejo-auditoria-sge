import { IOrderRepository, PedidoExpedicaoWithItems } from '../../interfaces/repositories/i-order.repository';
import { DomainException } from '../../exceptions/domain.exception';

const VALID_STATUSES = ['PENDENTE', 'SEPARACAO', 'CONFERIDO', 'EXPEDIDO'];

export interface ListPendingOrdersInput {
  status?: string;
  page?: number;
  limit?: number;
}

export interface ListPendingOrdersMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListPendingOrdersResult {
  data: PedidoExpedicaoWithItems[];
  meta: ListPendingOrdersMeta;
}

export class ListPendingOrdersUseCase {
  constructor(private readonly orderRepository: IOrderRepository) {}

  async execute(input: ListPendingOrdersInput): Promise<ListPendingOrdersResult> {
    const status = input.status ?? 'PENDENTE';
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;

    if (!VALID_STATUSES.includes(status)) {
      throw new DomainException(
        `Status invalido: "${status}". Use: ${VALID_STATUSES.join(', ')}.`,
      );
    }

    const { data, total } = await this.orderRepository.findByStatus(status, page, limit);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      data,
      meta: { total, page, limit, totalPages },
    };
  }
}
