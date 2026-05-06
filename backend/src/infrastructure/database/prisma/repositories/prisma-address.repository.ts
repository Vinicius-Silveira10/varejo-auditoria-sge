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

  async updateOcupacao(id: number, novaOcupacao: number): Promise<Endereco> {
    return this.prisma.endereco.update({
      where: { id },
      data: { ocupado: novaOcupacao },
    });
  }
}
