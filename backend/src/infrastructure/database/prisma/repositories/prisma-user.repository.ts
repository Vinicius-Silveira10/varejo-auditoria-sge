import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { IUserRepository } from '../../../../core/interfaces/repositories/i-user.repository';
import { Usuario } from '@prisma/client';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Omit<Usuario, 'id' | 'ativo' | 'criadoEm'>): Promise<Usuario> {
    return this.prisma.usuario.create({
      data,
    });
  }

  async findByEmail(email: string): Promise<Usuario | null> {
    return this.prisma.usuario.findUnique({
      where: { email },
    });
  }

  async findById(id: number): Promise<Usuario | null> {
    return this.prisma.usuario.findUnique({
      where: { id },
    });
  }

  async disable(id: number): Promise<Usuario> {
    return this.prisma.usuario.update({
      where: { id },
      data: { ativo: false },
    });
  }
}
