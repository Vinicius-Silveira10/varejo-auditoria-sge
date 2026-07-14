import { IProductRepository } from './i-product.repository';
import { IBatchRepository } from './i-batch.repository';
import { ILogCustoRepository } from './i-log-custo.repository';
import { IAdjustmentRepository } from './i-adjustment.repository';
import { IMovementRepository } from './i-movement.repository';
import { INotaFiscalRepository } from './i-nota-fiscal.repository';
import { IAddressRepository } from './i-address.repository';
import { IOrderRepository } from './i-order.repository';

export interface UnitOfWorkContext {
  produtoRepository: IProductRepository;
  loteRepository: IBatchRepository;
  logCustoRepository: ILogCustoRepository;
  adjustmentRepository: IAdjustmentRepository;
  movementRepository: IMovementRepository;
  notaFiscalRepository: INotaFiscalRepository;
  addressRepository: IAddressRepository;
  orderRepository: IOrderRepository;

  /**
   * Executa um lock pessimista na linha da tabela especificada.
   * Utilizar para evitar concorrência destrutiva (ex: cálculo de CMP).
   * Traduzido para SELECT ... FOR UPDATE na infraestrutura.
   */
  lockForUpdate(entidade: string, id: number): Promise<void>;
}

export interface IUnitOfWork {
  /**
   * Envolve as operações de repositórios em uma única transação atômica.
   * O contexto passado injeta as instâncias dos repositórios que compartilham a mesma transação.
   */
  execute<T>(work: (ctx: UnitOfWorkContext) => Promise<T>): Promise<T>;
}
