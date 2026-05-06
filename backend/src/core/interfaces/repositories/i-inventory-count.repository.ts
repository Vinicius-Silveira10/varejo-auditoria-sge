export interface ContagemInventario {
  id?: number;
  loteId: number;
  quantidadeFisica?: number;
  quantidadeTeorica: number;
  status: string; // 'PENDENTE', 'CONCLUIDO', 'DIVERGENTE', 'AJUSTADO'
  usuarioId: number;
  criadoEm?: Date;
  atualizadoEm?: Date;
}

export interface IInventoryCountRepository {
  create(data: Omit<ContagemInventario, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<ContagemInventario>;
  findById(id: number): Promise<ContagemInventario | null>;
  updateCount(id: number, quantidadeFisica: number, status: string): Promise<ContagemInventario>;
  updateStatus(id: number, status: string): Promise<ContagemInventario>;
}
