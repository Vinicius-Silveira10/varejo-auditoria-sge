import { INotaFiscalRepository } from '../../interfaces/repositories/i-nota-fiscal.repository';
import { IProductRepository } from '../../interfaces/repositories/i-product.repository';
import { ParseNfeXmlService, ParsedNfe, ParsedNfeItem } from './parse-nfe-xml.service';
import { ReceiveBatchUseCase } from '../batch/receive-batch.use-case';
import { NotaFiscal, ItemNfe } from '@prisma/client';

export interface NfeDivergencia {
  sku: string;
  descricaoNfe: string;
  tipo: 'SKU_NAO_ENCONTRADO' | 'QUANTIDADE_DIVERGENTE' | 'PERECIVEL_SEM_VALIDADE';
  detalhe: string;
  quantidadeNfe: number;
  deltaPercent?: number;
}

export interface ProcessNfeResult {
  notaFiscal: NotaFiscal & { itensNfe: ItemNfe[] };
  status: 'CONFERIDO' | 'DIVERGENTE';
  divergencias: NfeDivergencia[];
  lotesGerados: number;
}

export class ProcessNfeUseCase {
  constructor(
    private readonly notaFiscalRepository: INotaFiscalRepository,
    private readonly productRepository: IProductRepository,
    private readonly parseNfeXmlService: ParseNfeXmlService,
    private readonly receiveBatchUseCase: ReceiveBatchUseCase,
  ) {}

  async execute(xmlContent: string): Promise<ProcessNfeResult> {
    // 1. Parse do XML
    const parsedNfe: ParsedNfe = this.parseNfeXmlService.parse(xmlContent);

    // 2. RN-REC-002: Bloqueio de NF-e duplicada
    const existente = await this.notaFiscalRepository.findByChaveAcesso(parsedNfe.chaveAcesso);
    if (existente) {
      throw new Error('RN-REC-002: NF-e já registrada. Chave de acesso duplicada.');
    }

    // 3. RN-REC-001: Conferência automática — validar cada item
    const divergencias: NfeDivergencia[] = [];

    for (const item of parsedNfe.itens) {
      const produto = await this.productRepository.findBySku(item.sku);

      if (!produto) {
        divergencias.push({
          sku: item.sku,
          descricaoNfe: item.descricao,
          tipo: 'SKU_NAO_ENCONTRADO',
          detalhe: `Produto com SKU "${item.sku}" não encontrado no sistema.`,
          quantidadeNfe: item.quantidade,
        });
        continue;
      }

      if (!produto.ativo) {
        divergencias.push({
          sku: item.sku,
          descricaoNfe: item.descricao,
          tipo: 'SKU_NAO_ENCONTRADO',
          detalhe: `Produto com SKU "${item.sku}" está desativado.`,
          quantidadeNfe: item.quantidade,
        });
        continue;
      }
    }

    // 4. Determinar status
    const status = divergencias.length > 0 ? 'DIVERGENTE' : 'CONFERIDO';

    // 5. Salvar NF-e no banco
    const notaFiscal = await this.notaFiscalRepository.create({
      chaveAcesso: parsedNfe.chaveAcesso,
      numero: parsedNfe.numero,
      serie: parsedNfe.serie,
      cnpjEmitente: parsedNfe.cnpjEmitente,
      dataEmissao: parsedNfe.dataEmissao,
      valorTotal: parsedNfe.valorTotal,
      xmlOriginal: xmlContent,
      status,
      divergencias: divergencias.length > 0 ? JSON.stringify(divergencias) : undefined,
      itensNfe: parsedNfe.itens.map((item) => ({
        produtoSku: item.sku,
        descricaoNfe: item.descricao,
        quantidade: item.quantidade,
        valorUnitario: item.valorUnitario,
        valorTotal: item.valorTotal,
      })),
    });

    // 6. Se CONFERIDO, criar lotes automaticamente via ReceiveBatchUseCase
    let lotesGerados = 0;

    if (status === 'CONFERIDO') {
      for (const item of parsedNfe.itens) {
        const produto = await this.productRepository.findBySku(item.sku);

        if (produto) {
          await this.receiveBatchUseCase.execute({
            numeroLote: `NF-${parsedNfe.numero}-${item.sku}`,
            produtoId: produto.id,
            quantidade: item.quantidade,
            custoAquisicao: item.valorUnitario,
          });
          lotesGerados++;
        }
      }
    }

    return {
      notaFiscal,
      status,
      divergencias,
      lotesGerados,
    };
  }
}
