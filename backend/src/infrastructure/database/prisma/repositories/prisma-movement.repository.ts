import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { IMovementRepository, LoteAddressAllocation } from '../../../../core/interfaces/repositories/i-movement.repository';
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
    tx: Omit<
      PrismaService,
      '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
    >,
    newHash: string,
  ): Promise<string | null> {
    // Obtém o ponteiro atual com lock explícito FOR UPDATE no banco de dados.
    // Isso garante que apenas uma transação por vez em todo o pool de conexões do Postgres
    // possa ler e atualizar o ChainPointer desta tabela, eliminando a corrupção do hash.
    const rows = await tx.$queryRawUnsafe<{ lastHash: string }[]>(
      `SELECT "lastHash" FROM "ChainPointer" WHERE tabela = $1 FOR UPDATE`,
      CHAIN_KEY,
    );

    let previousHash: string | null = null;
    
    if (rows && rows.length > 0) {
      previousHash = rows[0].lastHash;
      // Como a linha já existe e está lockada, podemos apenas atualizar via prisma
      await (tx as any).chainPointer.update({
        where: { tabela: CHAIN_KEY },
        data: { lastHash: newHash },
      });
    } else {
      // Cenário do "Bloco Gênese" (primeiro registro). 
      // Se duas transações chegarem aqui no início, o upsert resolve eventuais concorrências
      // forçando um retry interno no Prisma ou falhando por constraint, mas a cadeia não bifurca.
      await (tx as any).chainPointer.upsert({
        where: { tabela: CHAIN_KEY },
        update: { lastHash: newHash },
        create: { tabela: CHAIN_KEY, lastHash: newHash },
      });
    }

    return previousHash;
  }

  async create(
    data: Omit<Movimentacao, 'id' | 'criadoEm' | 'hash' | 'previousHash'>,
    existingTx?: any,
  ): Promise<Movimentacao> {
    const execute = async (tx: any) => {
      // Gera hash temporário para reservar o slot; será sobrescrito logo abaixo
      const tempHash = this.hashService.generateHash(data, 'TEMP');
      const previousHash = await this.atomicGetAndSetHash(tx, tempHash);
      const hash = this.hashService.generateHash(data, previousHash);

      // Atualiza o ChainPointer com o hash real
      await (tx as any).chainPointer.update({
        where: { tabela: CHAIN_KEY },
        data: { lastHash: hash },
      });

      return (tx as any).movimentacao.create({
        data: { ...data, hash, previousHash },
      });
    };

    if (existingTx) return execute(existingTx);
    if (typeof this.prisma.$transaction !== 'function') return execute(this.prisma);
    return this.prisma.$transaction(execute);
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

  async findPaginatedOrdered(
    skip: number,
    take: number,
  ): Promise<Movimentacao[]> {
    return this.prisma.movimentacao.findMany({
      skip,
      take,
      orderBy: { id: 'asc' },
    });
  }

  async countAll(): Promise<number> {
    return this.prisma.movimentacao.count();
  }



  async getMovementQuantitiesByProduct(
    dias: number,
  ): Promise<Array<{ produtoId: number; quantidadeTotal: number }>> {
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

  /**
   * ADR-001: Calcula a posição física atual de um lote por endereço.
   *
   * Fórmula:
   *   Alocado(lote, endereço) = SUM(ARMAZENAGEM onde enderecoDestinoId = endereço)
   *                            - SUM(EXPEDICAO onde enderecoOrigemId = endereço)
   *
   * Apenas endereços com alocação positiva são retornados (já esvaziados são excluídos).
   * Retorno ordenado por quantidadeAlocada DESC para que o PickOrderUseCase
   * esvazie endereços na ordem de maior alocação primeiro (menos fragmentação).
   */
  async findAllocationByLote(loteId: number): Promise<LoteAddressAllocation[]> {
    const rows: Array<{ enderecoId: bigint; quantidadeAlocada: bigint }> =
      await this.prisma.$queryRaw`
        SELECT
          "enderecoId",
          SUM(quantidade) AS "quantidadeAlocada"
        FROM (
          SELECT "enderecoDestinoId" AS "enderecoId", quantidade
          FROM "Movimentacao"
          WHERE "loteId" = ${loteId} AND tipo = 'ARMAZENAGEM' AND "enderecoDestinoId" IS NOT NULL

          UNION ALL

          SELECT "enderecoOrigemId" AS "enderecoId", -quantidade
          FROM "Movimentacao"
          WHERE "loteId" = ${loteId} AND tipo = 'EXPEDICAO' AND "enderecoOrigemId" IS NOT NULL
        ) movs
        GROUP BY "enderecoId"
        HAVING SUM(quantidade) > 0
        ORDER BY SUM(quantidade) DESC
      `;

    return rows.map((r) => ({
      enderecoId: Number(r.enderecoId),
      quantidadeAlocada: Number(r.quantidadeAlocada),
    }));
  }
}
