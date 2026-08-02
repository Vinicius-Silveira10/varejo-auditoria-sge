import { Injectable, NotFoundException } from '@nestjs/common';
import type { IBatchRepository } from '../../interfaces/repositories/i-batch.repository';
import { Lote } from '@prisma/client';

@Injectable()
export class GetBatchByNumberUseCase {
  constructor(private readonly batchRepository: IBatchRepository) {}

  async execute(numeroLote: string): Promise<Lote> {
    const lote = await this.batchRepository.findByNumeroLote(numeroLote);

    if (!lote) {
      throw new NotFoundException(`Lote com número ${numeroLote} não encontrado.`);
    }

    return lote;
  }
}
