import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { IMovementRepository } from '../../../../core/interfaces/repositories/i-movement.repository';
import { Movimentacao } from '@prisma/client';

import { HashService } from '../../../security/hash.service';

@Injectable()
export class PrismaMovementRepository implements IMovementRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashService: HashService
  ) {}

  async create(data: Omit<Movimentacao, 'id' | 'criadoEm' | 'hash' | 'previousHash'>): Promise<Movimentacao> {
    const lastMovement = await this.prisma.movimentacao.findFirst({
      orderBy: { id: 'desc' },
      select: { hash: true },
    });

    const previousHash = lastMovement ? lastMovement.hash : null;
    const hash = this.hashService.generateHash(data, previousHash);

    return this.prisma.movimentacao.create({
      data: {
        ...data,
        hash,
        previousHash,
      },
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
      const loteDb = await tx.lote.update({
        where: { id: params.loteId },
        data: { quantidade: { increment: params.quantidadeDeltaLote } },
      });

      if (loteDb.quantidade < 0) {
        throw new Error('RN-TRV-002: Saldo insuficiente no lote após tentar movimentar.');
      }

      // 2. Atualizar Endereço Origem (se houver)
      if (params.origemId && params.novaOcupacaoOrigem !== undefined) {
        await tx.endereco.update({
          where: { id: params.origemId },
          data: { ocupado: params.novaOcupacaoOrigem },
        });
      }

      // 3. Atualizar Endereço Destino (se houver)
      if (params.destinoId && params.novaOcupacaoDestino !== undefined) {
        await tx.endereco.update({
          where: { id: params.destinoId },
          data: { ocupado: params.novaOcupacaoDestino },
        });
      }

      // 4. Calcular Hash e Criar Movimentação
      const lastMovement = await tx.movimentacao.findFirst({
        orderBy: { id: 'desc' },
        select: { hash: true },
      });

      const previousHash = lastMovement ? lastMovement.hash : null;
      const hash = this.hashService.generateHash(params.movementData, previousHash);

      return tx.movimentacao.create({
        data: {
          ...params.movementData,
          hash,
          previousHash,
        },
      });
    });
  }
}
