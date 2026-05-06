import { Usuario } from '@prisma/client';

export interface IUserRepository {
  create(data: Omit<Usuario, 'id' | 'ativo' | 'criadoEm'>): Promise<Usuario>;
  findByEmail(email: string): Promise<Usuario | null>;
  findById(id: number): Promise<Usuario | null>;
  disable(id: number): Promise<Usuario>;
}
