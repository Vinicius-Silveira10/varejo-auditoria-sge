import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { IInventoryCountRepository, ContagemInventario } from '../../../../core/interfaces/repositories/i-inventory-count.repository';

@Injectable()
export class PrismaInventoryCountRepository implements IInventoryCountRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Omit<ContagemInventario, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<ContagemInventario> {
    const contagem = await this.prisma.contagemInventario.create({
      data: {
        loteId: data.loteId,
        quantidadeFisica: data.quantidadeFisica,
        quantidadeTeorica: data.quantidadeTeorica,
        status: data.status,
        usuarioId: data.usuarioId,
      },
    });

    return this.mapToDomain(contagem);
  }

  async findById(id: number): Promise<ContagemInventario | null> {
    const contagem = await this.prisma.contagemInventario.findUnique({
      where: { id },
    });
    
    if (!contagem) return null;
    return this.mapToDomain(contagem);
  }

  async updateCount(id: number, quantidadeFisica: number, status: string): Promise<ContagemInventario> {
    const contagem = await this.prisma.contagemInventario.update({
      where: { id },
      data: {
        quantidadeFisica,
        status,
      },
    });

    return this.mapToDomain(contagem);
  }

  async updateStatus(id: number, status: string): Promise<ContagemInventario> {
    const contagem = await this.prisma.contagemInventario.update({
      where: { id },
      data: {
        status,
      },
    });

    return this.mapToDomain(contagem);
  }

  private mapToDomain(prismaContagem: any): ContagemInventario {
    return {
      id: prismaContagem.id,
      loteId: prismaContagem.loteId,
      quantidadeFisica: prismaContagem.quantidadeFisica ?? undefined,
      quantidadeTeorica: prismaContagem.quantidadeTeorica,
      status: prismaContagem.status,
      usuarioId: prismaContagem.usuarioId,
      criadoEm: prismaContagem.criadoEm,
      atualizadoEm: prismaContagem.atualizadoEm,
    };
  }
}
