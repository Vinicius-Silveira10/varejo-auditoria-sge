import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  ILogCustoRepository,
  LogCusto,
} from '../../../../core/interfaces/repositories/i-log-custo.repository';

import { HashService } from '../../../security/hash.service';

const CHAIN_KEY = 'LogCusto';

@Injectable()
export class PrismaLogCustoRepository implements ILogCustoRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashService: HashService,
  ) {}

  async create(
    log: Omit<LogCusto, 'id' | 'criadoEm' | 'hash' | 'previousHash'>,
  ): Promise<LogCusto> {
    return await this.prisma.$transaction(async (tx) => {
      // BUG-007 FIX: ChainPointer atômico para eliminar race condition
      const pointer = await (tx as any).chainPointer.findUnique({
        where: { tabela: CHAIN_KEY },
      });
      const previousHash = pointer?.lastHash ?? null;
      const hash = this.hashService.generateHash(log, previousHash);

      await (tx as any).chainPointer.upsert({
        where: { tabela: CHAIN_KEY },
        update: { lastHash: hash },
        create: { tabela: CHAIN_KEY, lastHash: hash },
      });

      const created = await (tx as any).logCusto.create({
        data: {
          produtoId: log.produtoId,
          custoAnterior: log.custoAnterior,
          custoNovo: log.custoNovo,
          quantidadeAnterior: log.quantidadeAnterior,
          quantidadeNova: log.quantidadeNova,
          motivo: log.motivo,
          hash,
          previousHash,
        },
      });

      return { ...created, motivo: created.motivo ?? undefined };
    });
  }

  async findByProdutoId(produtoId: number): Promise<LogCusto[]> {
    const logs = await this.prisma.logCusto.findMany({
      where: { produtoId },
      orderBy: { criadoEm: 'desc' },
    });

    return logs.map((log) => ({
      ...log,
      motivo: log.motivo ?? undefined,
    }));
  }

  async findAllOrdered(): Promise<LogCusto[]> {
    const logs = await this.prisma.logCusto.findMany({
      orderBy: { id: 'asc' },
    });

    return logs.map((log) => ({
      ...log,
      motivo: log.motivo ?? undefined,
    }));
  }

  async findPaginatedOrdered(skip: number, take: number): Promise<LogCusto[]> {
    const logs = await this.prisma.logCusto.findMany({
      skip,
      take,
      orderBy: { id: 'asc' },
    });

    return logs.map((log) => ({
      ...log,
      motivo: log.motivo ?? undefined,
    }));
  }

  async countAll(): Promise<number> {
    return this.prisma.logCusto.count();
  }

  async purgeBefore(date: Date): Promise<number> {
    const result = await this.prisma.logCusto.deleteMany({
      where: {
        criadoEm: { lt: date },
      },
    });
    return result.count;
  }
}
