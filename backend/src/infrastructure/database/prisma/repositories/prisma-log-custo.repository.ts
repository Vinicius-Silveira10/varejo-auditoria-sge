import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ILogCustoRepository, LogCusto } from '../../../../core/interfaces/repositories/i-log-custo.repository';

import { HashService } from '../../../security/hash.service';

@Injectable()
export class PrismaLogCustoRepository implements ILogCustoRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashService: HashService
  ) {}

  async create(log: Omit<LogCusto, 'id' | 'criadoEm' | 'hash' | 'previousHash'>): Promise<LogCusto> {
    const lastLog = await this.prisma.logCusto.findFirst({
      orderBy: { id: 'desc' },
      select: { hash: true },
    });

    const previousHash = lastLog ? lastLog.hash : null;
    const hash = this.hashService.generateHash(log, previousHash);

    const created = await this.prisma.logCusto.create({
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

    return {
      ...created,
      motivo: created.motivo ?? undefined,
    };
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
}
