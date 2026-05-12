import { Endereco } from '@prisma/client';

export interface IAddressRepository {
  create(data: Omit<Endereco, 'id' | 'ocupado' | 'ativo'>): Promise<Endereco>;
  findById(id: number): Promise<Endereco | null>;
  findByCodigo(codigo: string): Promise<Endereco | null>;
  findAvailableByZona(tipoZona: string): Promise<Endereco[]>;
  disable(id: number): Promise<Endereco>;
  updateOcupacao(id: number, novaOcupacao: number): Promise<Endereco>;
}

