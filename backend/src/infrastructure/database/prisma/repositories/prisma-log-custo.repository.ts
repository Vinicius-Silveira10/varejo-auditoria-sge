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
    existingTx?: any,
  ): Promise<LogCusto> {
    const execute = async (tx: any) => {
      // BUG-007 FIX: ChainPointer atômico para eliminar race condition com Lock de Banco (FOR UPDATE)
      const rows = (await tx.$queryRawUnsafe(
        `SELECT "lastHash" FROM "ChainPointer" WHERE tabela = $1 FOR UPDATE`,
        CHAIN_KEY,
      )) as { lastHash: string }[];

      let previousHash: string | null = null;
      if (rows && rows.length > 0) {
        previousHash = rows[0].lastHash;
        const hash = this.hashService.generateHash(log, previousHash);
        await (tx as any).chainPointer.update({
          where: { tabela: CHAIN_KEY },
          data: { lastHash: hash },
        });
        var finalHash = hash; // scoping issue workaround
      } else {
        const hash = this.hashService.generateHash(log, null);
        await (tx as any).chainPointer.upsert({
          where: { tabela: CHAIN_KEY },
          update: { lastHash: hash },
          create: { tabela: CHAIN_KEY, lastHash: hash },
        });
        var finalHash = hash;
      }
      const hash = finalHash;

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
    };

    if (existingTx) return execute(existingTx);
    if (typeof this.prisma.$transaction !== 'function') return execute(this.prisma);
    return this.prisma.$transaction(execute);
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
