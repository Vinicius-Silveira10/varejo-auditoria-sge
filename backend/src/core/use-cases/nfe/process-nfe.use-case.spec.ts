import { ProcessNfeUseCase } from './process-nfe.use-case';
import { INotaFiscalRepository } from '../../interfaces/repositories/i-nota-fiscal.repository';
import { IProductRepository } from '../../interfaces/repositories/i-product.repository';
import { ParseNfeXmlService } from './parse-nfe-xml.service';
import { ReceiveBatchUseCase } from '../batch/receive-batch.use-case';

// XML de exemplo válido (padrão SEFAZ simplificado)
const VALID_XML = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc>
  <NFe>
    <infNFe Id="NFe35210504380000010155001000000001112345678901">
      <ide>
        <nNF>1</nNF>
        <serie>1</serie>
        <dhEmi>2025-05-01T10:00:00-03:00</dhEmi>
      </ide>
      <emit>
        <CNPJ>04380000010155</CNPJ>
      </emit>
      <det>
        <prod>
          <cProd>SKU-001</cProd>
          <xProd>Arroz Tipo 1 5kg</xProd>
          <qCom>100</qCom>
          <vUnCom>12.50</vUnCom>
          <vProd>1250.00</vProd>
        </prod>
      </det>
      <det>
        <prod>
          <cProd>SKU-002</cProd>
          <xProd>Feijao Carioca 1kg</xProd>
          <qCom>200</qCom>
          <vUnCom>8.00</vUnCom>
          <vProd>1600.00</vProd>
        </prod>
      </det>
      <total>
        <ICMSTot>
          <vNF>2850.00</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
  <protNFe>
    <infProt>
      <chNFe>35210504380000010155001000000001112345678901</chNFe>
    </infProt>
  </protNFe>
</nfeProc>`;

const XML_SKU_DESCONHECIDO = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc>
  <NFe>
    <infNFe Id="NFe35210504380000010155001000000002109876543210">
      <ide>
        <nNF>2</nNF>
        <serie>1</serie>
        <dhEmi>2025-05-02T10:00:00-03:00</dhEmi>
      </ide>
      <emit>
        <CNPJ>04380000010155</CNPJ>
      </emit>
      <det>
        <prod>
          <cProd>SKU-INEXISTENTE</cProd>
          <xProd>Produto Fantasma</xProd>
          <qCom>50</qCom>
          <vUnCom>5.00</vUnCom>
          <vProd>250.00</vProd>
        </prod>
      </det>
      <total>
        <ICMSTot>
          <vNF>250.00</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
  <protNFe>
    <infProt>
      <chNFe>35210504380000010155001000000002109876543210</chNFe>
    </infProt>
  </protNFe>
</nfeProc>`;

describe('ProcessNfeUseCase', () => {
  let useCase: ProcessNfeUseCase;
  let mockNfRepo: jest.Mocked<INotaFiscalRepository>;
  let mockProductRepo: jest.Mocked<IProductRepository>;
  let parseService: ParseNfeXmlService;
  let mockReceiveBatchUseCase: jest.Mocked<ReceiveBatchUseCase>;

  beforeEach(() => {
    mockNfRepo = {
      create: jest.fn(),
      findByChaveAcesso: jest.fn(),
      updateStatus: jest.fn(),
    };

    mockProductRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findBySku: jest.fn(),
      updateCustoMedio: jest.fn(),
      disable: jest.fn(),
    };

    parseService = new ParseNfeXmlService();

    mockReceiveBatchUseCase = {
      execute: jest.fn(),
    } as any;

    useCase = new ProcessNfeUseCase(
      mockNfRepo,
      mockProductRepo,
      parseService,
      mockReceiveBatchUseCase,
    );
  });

  it('deve processar NF-e válida com status CONFERIDO e gerar lotes (RN-REC-001)', async () => {
    mockNfRepo.findByChaveAcesso.mockResolvedValue(null);
    mockProductRepo.findBySku
      .mockResolvedValueOnce({ id: 1, sku: 'SKU-001', descricao: 'Arroz', categoria: 'Grãos', perecivel: false, custoMedio: 10, ativo: true } as any)
      .mockResolvedValueOnce({ id: 2, sku: 'SKU-002', descricao: 'Feijão', categoria: 'Grãos', perecivel: false, custoMedio: 7, ativo: true } as any)
      // Second round for batch creation
      .mockResolvedValueOnce({ id: 1, sku: 'SKU-001', descricao: 'Arroz', categoria: 'Grãos', perecivel: false, custoMedio: 10, ativo: true } as any)
      .mockResolvedValueOnce({ id: 2, sku: 'SKU-002', descricao: 'Feijão', categoria: 'Grãos', perecivel: false, custoMedio: 7, ativo: true } as any);

    mockNfRepo.create.mockResolvedValue({
      id: 1, chaveAcesso: '35210504380000010155001000000001112345678901',
      numero: '1', serie: '1', cnpjEmitente: '04380000010155',
      dataEmissao: new Date(), valorTotal: 2850, xmlOriginal: VALID_XML,
      status: 'CONFERIDO', divergencias: null, criadoEm: new Date(),
      itensNfe: [],
    } as any);

    mockReceiveBatchUseCase.execute.mockResolvedValue({} as any);

    const result = await useCase.execute(VALID_XML);

    expect(result.status).toBe('CONFERIDO');
    expect(result.divergencias).toHaveLength(0);
    expect(result.lotesGerados).toBe(2);
    expect(mockReceiveBatchUseCase.execute).toHaveBeenCalledTimes(2);
    expect(mockNfRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'CONFERIDO' }),
    );
  });

  it('deve rejeitar NF-e duplicada com erro RN-REC-002', async () => {
    mockNfRepo.findByChaveAcesso.mockResolvedValue({ id: 1 } as any);

    await expect(useCase.execute(VALID_XML)).rejects.toThrow('RN-REC-002');
    expect(mockNfRepo.create).not.toHaveBeenCalled();
  });

  it('deve marcar como DIVERGENTE se SKU não encontrado no sistema (RN-REC-001)', async () => {
    mockNfRepo.findByChaveAcesso.mockResolvedValue(null);
    mockProductRepo.findBySku.mockResolvedValue(null);

    mockNfRepo.create.mockResolvedValue({
      id: 2, chaveAcesso: '35210504380000010155001000000002109876543210',
      status: 'DIVERGENTE', itensNfe: [],
    } as any);

    const result = await useCase.execute(XML_SKU_DESCONHECIDO);

    expect(result.status).toBe('DIVERGENTE');
    expect(result.divergencias).toHaveLength(1);
    expect(result.divergencias[0].tipo).toBe('SKU_NAO_ENCONTRADO');
    expect(result.lotesGerados).toBe(0);
    expect(mockReceiveBatchUseCase.execute).not.toHaveBeenCalled();
  });

  it('deve marcar como DIVERGENTE se produto estiver desativado', async () => {
    mockNfRepo.findByChaveAcesso.mockResolvedValue(null);
    mockProductRepo.findBySku.mockResolvedValue({
      id: 1, sku: 'SKU-INEXISTENTE', descricao: 'Teste', categoria: 'C', perecivel: false, custoMedio: 0, ativo: false,
    } as any);

    mockNfRepo.create.mockResolvedValue({
      id: 3, status: 'DIVERGENTE', itensNfe: [],
    } as any);

    const result = await useCase.execute(XML_SKU_DESCONHECIDO);

    expect(result.status).toBe('DIVERGENTE');
    expect(result.divergencias[0].detalhe).toContain('desativado');
    expect(mockReceiveBatchUseCase.execute).not.toHaveBeenCalled();
  });

  it('deve falhar com XML vazio', async () => {
    await expect(useCase.execute('')).rejects.toThrow('vazio');
  });
});
