import { XMLParser } from 'fast-xml-parser';

export interface ParsedNfeItem {
  sku: string;       // cProd (código do produto)
  descricao: string; // xProd (descrição)
  quantidade: number; // qCom (quantidade comercial)
  valorUnitario: number; // vUnCom (valor unitário)
  valorTotal: number; // vProd (valor total do item)
}

export interface ParsedNfe {
  chaveAcesso: string; // chNFe (44 dígitos)
  numero: string;      // nNF
  serie: string;       // serie
  cnpjEmitente: string; // CNPJ do emit
  dataEmissao: Date;   // dhEmi
  valorTotal: number;  // vNF (valor total da NF)
  itens: ParsedNfeItem[];
}

export class ParseNfeXmlService {
  private readonly parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      removeNSPrefix: true, // Remove namespaces (ex: nfe:, ns:)
    });
  }

  parse(xmlContent: string): ParsedNfe {
    if (!xmlContent || xmlContent.trim().length === 0) {
      throw new Error('XML da NF-e está vazio ou inválido.');
    }

    let parsed: any;
    try {
      parsed = this.parser.parse(xmlContent);
    } catch (error) {
      throw new Error('Falha ao interpretar o XML da NF-e. Verifique o formato.');
    }

    // Navegar na estrutura do XML da NF-e (padrão SEFAZ)
    const nfeProc = parsed.nfeProc || parsed;
    const nfe = nfeProc.NFe || nfeProc;
    const infNFe = nfe.infNFe || nfe;

    if (!infNFe) {
      throw new Error('Estrutura XML inválida: elemento infNFe não encontrado.');
    }

    // Extrair chave de acesso
    const chaveAcesso = infNFe['@_Id']?.replace('NFe', '') || 
                         nfeProc.protNFe?.infProt?.chNFe || '';

    if (!chaveAcesso || chaveAcesso.length !== 44) {
      throw new Error('Chave de acesso da NF-e inválida ou não encontrada.');
    }

    // Dados da identificação
    const ide = infNFe.ide || {};
    const numero = String(ide.nNF || '');
    const serie = String(ide.serie || '');
    const dataEmissao = new Date(ide.dhEmi || ide.dEmi || new Date());

    // Emitente
    const emit = infNFe.emit || {};
    const cnpjEmitente = String(emit.CNPJ || '');

    // Valor total
    const total = infNFe.total?.ICMSTot || {};
    const valorTotal = parseFloat(total.vNF || '0');

    // Itens (det pode ser array ou objeto único)
    const detArray = Array.isArray(infNFe.det) ? infNFe.det : [infNFe.det].filter(Boolean);

    const itens: ParsedNfeItem[] = detArray.map((det: any) => {
      const prod = det.prod || {};
      return {
        sku: String(prod.cProd || ''),
        descricao: String(prod.xProd || ''),
        quantidade: parseInt(String(prod.qCom || '0'), 10),
        valorUnitario: parseFloat(String(prod.vUnCom || '0')),
        valorTotal: parseFloat(String(prod.vProd || '0')),
      };
    });

    if (itens.length === 0) {
      throw new Error('NF-e não contém itens (det).');
    }

    return {
      chaveAcesso,
      numero,
      serie,
      cnpjEmitente,
      dataEmissao,
      valorTotal,
      itens,
    };
  }
}
