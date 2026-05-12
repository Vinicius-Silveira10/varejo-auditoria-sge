import { NotaFiscal, ItemNfe } from '@prisma/client';

export interface CreateNotaFiscalData {
  chaveAcesso: string;
  numero: string;
  serie: string;
  cnpjEmitente: string;
  dataEmissao: Date;
  valorTotal: number;
  xmlOriginal: string;
  status: string;
  divergencias?: string;
  itensNfe: {
    produtoSku: string;
    descricaoNfe: string;
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
  }[];
}

export interface INotaFiscalRepository {
  create(data: CreateNotaFiscalData): Promise<NotaFiscal & { itensNfe: ItemNfe[] }>;
  findByChaveAcesso(chaveAcesso: string): Promise<NotaFiscal | null>;
  updateStatus(id: number, status: string, divergencias?: string): Promise<NotaFiscal>;
}
