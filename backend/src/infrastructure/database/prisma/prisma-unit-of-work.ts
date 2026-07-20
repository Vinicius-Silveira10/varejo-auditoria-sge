import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { IUnitOfWork, UnitOfWorkContext } from '../../../core/interfaces/repositories/i-unit-of-work';
import { PrismaProductRepository } from './repositories/prisma-product.repository';
import { PrismaBatchRepository } from './repositories/prisma-batch.repository';
import { PrismaLogCustoRepository } from './repositories/prisma-log-custo.repository';
import { PrismaAdjustmentRepository } from './repositories/prisma-adjustment.repository';
import { PrismaMovementRepository } from './repositories/prisma-movement.repository';
import { PrismaNotaFiscalRepository } from './repositories/prisma-nota-fiscal.repository';
import { PrismaAddressRepository } from './repositories/prisma-address.repository';
import { PrismaOrderRepository } from './repositories/prisma-order.repository';
import { HashService } from '../../security/hash.service';

@Injectable()
export class PrismaUnitOfWork implements IUnitOfWork {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashService: HashService,
  ) {}

  async execute<T>(work: (ctx: UnitOfWorkContext) => Promise<T>): Promise<T> {
    let originalError: any = null;

    // Timeout estendido se necessário ou default do DB
    return this.prisma.$transaction(async (tx) => {
      // Cast the transaction context to PrismaService so repositories can use it
      const txClient = tx as PrismaService;

      const ctx: UnitOfWorkContext = {
        produtoRepository: new PrismaProductRepository(txClient),
        loteRepository: new PrismaBatchRepository(txClient),
        logCustoRepository: new PrismaLogCustoRepository(txClient, this.hashService),
        adjustmentRepository: new PrismaAdjustmentRepository(txClient),
        movementRepository: new PrismaMovementRepository(txClient, this.hashService),
        notaFiscalRepository: new PrismaNotaFiscalRepository(txClient),
        addressRepository: new PrismaAddressRepository(txClient),
        orderRepository: new PrismaOrderRepository(txClient),

        lockForUpdate: async (entidade: string, id: number) => {
          // Whitelist de tabelas para evitar SQL Injection (já que table name não pode ser parametrizado no SQL)
          const validTables = ['Produto', 'Lote', 'AjusteEstoque', 'Movimentacao', 'NotaFiscal', 'Endereco', 'PedidoExpedicao'];
          if (!validTables.includes(entidade)) {
            throw new Error(`Entidade inválida para lock: ${entidade}`);
          }
          
          // O Prisma usa $1, $2 no queryRawUnsafe para Postgres
          await tx.$queryRawUnsafe(`SELECT id FROM "${entidade}" WHERE id = $1 FOR UPDATE`, id);
        },
      };

      try {
        return await work(ctx);
      } catch (error) {
        originalError = error;
        throw error;
      }
    }).catch((error) => {
      // Prisma's $transaction might wrap or strip the prototype of the error during rollback.
      // If we caught an error inside the work function, we rethrow that exact original instance.
      // NOTE: We must still throw inside the transaction to trigger the rollback, but we intercept it here.
      throw originalError || error;
    });
  }
}
