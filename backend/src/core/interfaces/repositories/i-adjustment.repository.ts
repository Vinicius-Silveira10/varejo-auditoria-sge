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

/**
 * Versão enriquecida do AjusteEstoque com dados de Lote e Produto,
 * usada pelo endpoint GET /adjustments/pending para evitar N+1 queries.
 */
export interface AjusteEstoqueWithDetails extends AjusteEstoque {
  lote: {
    numeroLote: string;
    produto: {
      sku: string;
      descricao: string;
    };
  };
}

export interface IAdjustmentRepository {
  create(
    data: Omit<AjusteEstoque, 'id' | 'criadoEm' | 'atualizadoEm'>,
  ): Promise<AjusteEstoque>;
  findById(id: number): Promise<AjusteEstoque | null>;
  updateStatus(
    id: number,
    status: string,
    aprovadorId: number,
  ): Promise<AjusteEstoque>;
  sumFinancialLosses(): Promise<number>;

  /**
   * Retorna ajustes filtrados por status, ordenados por criadoEm ASC
   * (mais antigo primeiro, relevante para SLA de 2h).
   * Default: 'PENDENTE'.
   */
  findPending(status?: string): Promise<AjusteEstoqueWithDetails[]>;
}
