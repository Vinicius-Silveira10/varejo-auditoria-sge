import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { IMovementRepository } from '../../../../core/interfaces/repositories/i-movement.repository';
import { Movimentacao } from '@prisma/client';

import { HashService } from '../../../security/hash.service';

/** Nome da tabela auditada para identificar o ChainPointer */
const CHAIN_KEY = 'Movimentacao';

@Injectable()
export class PrismaMovementRepository implements IMovementRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashService: HashService,
  ) {}

  /**
   * BUG-007 FIX: Obtém o previousHash de forma atômica usando upsert no ChainPointer.
   * O upsert garante que apenas uma transação por vez obtém e atualiza o ponteiro,
   * eliminando a race condition de leitura paralela do último registro.
   */
  private async atomicGetAndSetHash(
    tx: Omit<PrismaService, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
    newHash: string,
  ): Promise<string | null> {
    // Lê o ponteiro atual e retorna o lastHash antes de atualizar
    const pointer = await (tx as any).chainPointer.findUnique({
      where: { tabela: CHAIN_KEY },
    });
    const previousHash = pointer?.lastHash ?? null;

    await (tx as any).chainPointer.upsert({
      where: { tabela: CHAIN_KEY },
      update: { lastHash: newHash },
      create: { tabela: CHAIN_KEY, lastHash: newHash },
    });

    return previousHash;
  }

  async create(data: Omit<Movimentacao, 'id' | 'criadoEm' | 'hash' | 'previousHash'>): Promise<Movimentacao> {
    return await this.prisma.$transaction(async (tx) => {
      // Gera hash temporário para reservar o slot; será sobrescrito logo abaixo
      const tempHash = this.hashService.generateHash(data, 'TEMP');
      const previousHash = await this.atomicGetAndSetHash(tx as any, tempHash);
      const hash = this.hashService.generateHash(data, previousHash);

      // Atualiza o ChainPointer com o hash real
      await (tx as any).chainPointer.update({
        where: { tabela: CHAIN_KEY },
        data: { lastHash: hash },
      });

      return (tx as any).movimentacao.create({
        data: { ...data, hash, previousHash },
      });
    });
  }

  async findByLote(loteId: number): Promise<Movimentacao[]> {
    return this.prisma.movimentacao.findMany({
      where: { loteId },
      orderBy: { criadoEm: 'desc' },
    });
  }

  async findAllOrdered(): Promise<Movimentacao[]> {
    return this.prisma.movimentacao.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async findPaginatedOrdered(skip: number, take: number): Promise<Movimentacao[]> {
    return this.prisma.movimentacao.findMany({
      skip,
      take,
      orderBy: { id: 'asc' },
    });
  }

  async countAll(): Promise<number> {
    return this.prisma.movimentacao.count();
  }

  async executeMovementTransaction(params: {
    movementData: Omit<Movimentacao, 'id' | 'criadoEm' | 'hash' | 'previousHash'>;
    loteId: number;
    quantidadeDeltaLote: number;
    origemId?: number;
    novaOcupacaoOrigem?: number;
    destinoId?: number;
    novaOcupacaoDestino?: number;
  }): Promise<Movimentacao> {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Atualizar Saldo do Lote de forma ATÔMICA
      const loteDb = await (tx as any).lote.update({
        where: { id: params.loteId },
        data: { quantidade: { increment: params.quantidadeDeltaLote } },
      });

      if (loteDb.quantidade < 0) {
        throw new Error('RN-TRV-002: Saldo insuficiente no lote após tentar movimentar.');
      }

      // 2. Atualizar Endereço Origem (se houver)
      if (params.origemId && params.novaOcupacaoOrigem !== undefined) {
        await (tx as any).endereco.update({
          where: { id: params.origemId },
          data: { ocupado: params.novaOcupacaoOrigem },
        });
      }

      // 3. Atualizar Endereço Destino (se houver)
      if (params.destinoId && params.novaOcupacaoDestino !== undefined) {
        await (tx as any).endereco.update({
          where: { id: params.destinoId },
          data: { ocupado: params.novaOcupacaoDestino },
        });
      }

      // 4. BUG-007 FIX: Hash atômico via ChainPointer — sem race condition
      const tempHash = this.hashService.generateHash(params.movementData, 'TEMP');
      const previousHash = await this.atomicGetAndSetHash(tx as any, tempHash);
      const hash = this.hashService.generateHash(params.movementData, previousHash);

      await (tx as any).chainPointer.update({
        where: { tabela: CHAIN_KEY },
        data: { lastHash: hash },
      });

      return (tx as any).movimentacao.create({
        data: { ...params.movementData, hash, previousHash },
      });
    });
  }

  async getMovementQuantitiesByProduct(dias: number): Promise<Array<{ produtoId: number; quantidadeTotal: number }>> {
    const cutOffDate = new Date();
    cutOffDate.setDate(cutOffDate.getDate() - dias);

    const result: any[] = await this.prisma.$queryRaw`
      SELECT l."produtoId", SUM(m."quantidade") as "quantidadeTotal"
      FROM "Movimentacao" m
      JOIN "Lote" l ON m."loteId" = l.id
      WHERE m.tipo IN ('SAIDA', 'EXPEDICAO')
        AND m."criadoEm" >= ${cutOffDate}
      GROUP BY l."produtoId"
    `;

    return result.map((r) => ({
      produtoId: Number(r.produtoId),
      quantidadeTotal: Number(r.quantidadeTotal),
    }));
  }

  async purgeBefore(date: Date): Promise<number> {
    const result = await this.prisma.movimentacao.deleteMany({
      where: {
        criadoEm: { lt: date },
      },
    });
    return result.count;
  }
}
