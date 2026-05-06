export interface AjusteEstoque {
  id?: number;
  loteId: number;
  quantidadeDelta: number;
  motivo: string;
  valorDelta: number;
  statusAprovacao: string; // 'PENDENTE', 'APROVADO', 'REJEITADO'
  solicitanteId: number;
  aprovadorId?: number;
  criadoEm?: Date;
  atualizadoEm?: Date;
}

export interface IAdjustmentRepository {
  create(data: Omit<AjusteEstoque, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<AjusteEstoque>;
  findById(id: number): Promise<AjusteEstoque | null>;
  updateStatus(id: number, status: string, aprovadorId: number): Promise<AjusteEstoque>;
}
