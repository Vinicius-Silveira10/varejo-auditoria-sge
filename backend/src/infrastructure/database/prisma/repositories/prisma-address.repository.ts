import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { IAddressRepository } from '../../../../core/interfaces/repositories/i-address.repository';
import { Endereco } from '@prisma/client';

@Injectable()
export class PrismaAddressRepository implements IAddressRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Omit<Endereco, 'id' | 'ocupado' | 'ativo'>): Promise<Endereco> {
    return this.prisma.endereco.create({
      data,
    });
  }

  async findById(id: number): Promise<Endereco | null> {
    return this.prisma.endereco.findUnique({
      where: { id },
    });
  }

  async findByCodigo(codigo: string): Promise<Endereco | null> {
    return this.prisma.endereco.findUnique({
      where: { codigo },
    });
  }

  async disable(id: number): Promise<Endereco> {
    return this.prisma.endereco.update({
      where: { id },
      data: { ativo: false },
    });
  }

  async findAvailableByZona(tipoZona: string): Promise<Endereco[]> {
    return this.prisma.endereco.findMany({
      where: {
        tipoZona,
        ativo: true,
      },
      orderBy: { ocupado: 'asc' }, // Menos ocupado primeiro (mais espaço disponível)
    });
  }

  async updateOcupacao(id: number, novaOcupacao: number): Promise<Endereco> {
    return this.prisma.endereco.update({
      where: { id },
      data: { ocupado: novaOcupacao },
    });
  }

  async findAll(): Promise<Endereco[]> {
    return this.prisma.endereco.findMany({
      where: { ativo: true },
    });
  }

  async aggregateOccupationByZone(): Promise<Array<{
    tipoZona: string;
    capacidadeTotal: number;
    ocupacaoTotal: number;
  }>> {
    const aggregations = await this.prisma.endereco.groupBy({
      by: ['tipoZona'],
      where: { ativo: true },
      _sum: {
        capacidade: true,
        ocupado: true,
      },
    });

    return aggregations.map(agg => ({
      tipoZona: agg.tipoZona,
      capacidadeTotal: agg._sum.capacidade || 0,
      ocupacaoTotal: agg._sum.ocupado || 0,
    }));
  }
}
