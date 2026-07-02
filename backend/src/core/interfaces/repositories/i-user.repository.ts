import { Usuario } from '@prisma/client';

export interface IUserRepository {
  create(data: Omit<Usuario, 'id' | 'ativo' | 'criadoEm' | 'ultimoAcesso'>): Promise<Usuario>;
  findByEmail(email: string): Promise<Usuario | null>;
  findById(id: number): Promise<Usuario | null>;
  updateUltimoAcesso(id: number, date: Date): Promise<Usuario>;
  disable(id: number): Promise<Usuario>;
}
