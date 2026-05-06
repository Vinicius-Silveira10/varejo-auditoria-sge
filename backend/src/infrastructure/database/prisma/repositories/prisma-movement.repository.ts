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
}
