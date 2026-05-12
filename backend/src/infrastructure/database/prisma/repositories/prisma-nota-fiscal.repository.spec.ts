import { PrismaNotaFiscalRepository } from './prisma-nota-fiscal.repository';
import { PrismaService } from '../prisma.service';
import { Test, TestingModule } from '@nestjs/testing';

describe('PrismaNotaFiscalRepository', () => {
  let repository: PrismaNotaFiscalRepository;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const mockPrismaService = {
      notaFiscal: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaNotaFiscalRepository,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    repository = module.get<PrismaNotaFiscalRepository>(PrismaNotaFiscalRepository);
    prismaService = module.get(PrismaService);
  });

  it('deve criar uma NF-e com itens no banco', async () => {
    const data = {
      chaveAcesso: '35210504380000010155001000000001123456789',
      numero: '1',
      serie: '1',
      cnpjEmitente: '04380000010155',
      dataEmissao: new Date(),
      valorTotal: 2850,
      xmlOriginal: '<xml>...</xml>',
      status: 'CONFERIDO',
      itensNfe: [
        { produtoSku: 'SKU-001', descricaoNfe: 'Arroz', quantidade: 100, valorUnitario: 12.5, valorTotal: 1250 },
      ],
    };

    const mockResult = { id: 1, ...data, divergencias: null, criadoEm: new Date(), itensNfe: [] };
    (prismaService.notaFiscal.create as jest.Mock).mockResolvedValue(mockResult);

    const result = await repository.create(data);

    expect(result).toEqual(mockResult);
    expect(prismaService.notaFiscal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ chaveAcesso: data.chaveAcesso }),
        include: { itensNfe: true },
      }),
    );
  });

  it('deve buscar NF-e por chave de acesso (RN-REC-002)', async () => {
    const chave = '35210504380000010155001000000001123456789';
    const mockResult = { id: 1, chaveAcesso: chave };
    (prismaService.notaFiscal.findUnique as jest.Mock).mockResolvedValue(mockResult);

    const result = await repository.findByChaveAcesso(chave);

    expect(result).toEqual(mockResult);
    expect(prismaService.notaFiscal.findUnique).toHaveBeenCalledWith({
      where: { chaveAcesso: chave },
    });
  });

  it('deve retornar null se chave de acesso não existir', async () => {
    (prismaService.notaFiscal.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await repository.findByChaveAcesso('chave-inexistente');

    expect(result).toBeNull();
  });

  it('deve atualizar o status de uma NF-e', async () => {
    const mockResult = { id: 1, status: 'DIVERGENTE', divergencias: '[]' };
    (prismaService.notaFiscal.update as jest.Mock).mockResolvedValue(mockResult);

    const result = await repository.updateStatus(1, 'DIVERGENTE', '[]');

    expect(result.status).toBe('DIVERGENTE');
    expect(prismaService.notaFiscal.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: 'DIVERGENTE', divergencias: '[]' },
    });
  });
});
