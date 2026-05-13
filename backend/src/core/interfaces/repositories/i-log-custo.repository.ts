export interface LogCusto {
  id?: number;
  produtoId: number;
  custoAnterior: number;
  custoNovo: number;
  quantidadeAnterior: number;
  quantidadeNova: number;
  motivo?: string;
  criadoEm?: Date;
  hash?: string;
  previousHash?: string | null;
}

export interface ILogCustoRepository {
  create(log: Omit<LogCusto, 'id' | 'criadoEm' | 'hash' | 'previousHash'>): Promise<LogCusto>;
  findByProdutoId(produtoId: number): Promise<LogCusto[]>;
  findAllOrdered(): Promise<LogCusto[]>;
  findPaginatedOrdered(skip: number, take: number): Promise<LogCusto[]>;
  countAll(): Promise<number>;
}
