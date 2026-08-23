import { Usuario } from '@prisma/client';

export interface IUserRepository {
  create(
    data: Omit<Usuario, 'id' | 'ativo' | 'criadoEm' | 'ultimoAcesso' | 'tokenVersion'>,
  ): Promise<Usuario>;
  findByEmail(email: string): Promise<Usuario | null>;
  findById(id: number): Promise<Usuario | null>;
  updateUltimoAcesso(id: number, date: Date): Promise<Usuario>;
  disable(id: number): Promise<Usuario>;
  updatePassword(id: number, novaSenhaHash: string): Promise<Usuario>;
}
