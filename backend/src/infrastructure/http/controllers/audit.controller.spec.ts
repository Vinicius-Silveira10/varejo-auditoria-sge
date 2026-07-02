import { Test, TestingModule } from '@nestjs/testing';
import { AuditController } from './audit.controller';
import { VerifyAuditChainUseCase } from '../../../core/use-cases/audit/verify-audit-chain.use-case';
import { ExportAuditCsvUseCase } from '../../../core/use-cases/audit/export-audit-csv.use-case';
import { ForbiddenException, BadRequestException } from '@nestjs/common';

describe('AuditController', () => {
  let controller: AuditController;
  let mockVerifyAuditChainUseCase: jest.Mocked<VerifyAuditChainUseCase>;
  let mockExportAuditCsvUseCase: jest.Mocked<ExportAuditCsvUseCase>;
  let mockMovementRepo: any;
  let mockLogCustoRepo: any;

  beforeEach(async () => {
    mockVerifyAuditChainUseCase = {
      verify: jest.fn(),
    } as any;

    mockExportAuditCsvUseCase = {
      execute: jest.fn().mockResolvedValue('csv-content'),
    } as any;

    mockMovementRepo = {
      purgeBefore: jest.fn().mockResolvedValue(10),
    };

    mockLogCustoRepo = {
      purgeBefore: jest.fn().mockResolvedValue(5),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [
        {
          provide: VerifyAuditChainUseCase,
          useValue: mockVerifyAuditChainUseCase,
        },
        {
          provide: ExportAuditCsvUseCase,
          useValue: mockExportAuditCsvUseCase,
        },
        {
          provide: 'IMovementRepository',
          useValue: mockMovementRepo,
        },
        {
          provide: 'ILogCustoRepository',
          useValue: mockLogCustoRepo,
        },
      ],
    }).compile();

    controller = module.get<AuditController>(AuditController);
  });

  it('deve ser definido', () => {
    expect(controller).toBeDefined();
  });

  it('deve realizar o purge com sucesso se data for anterior a 5 anos', async () => {
    const sixYearsAgo = new Date();
    sixYearsAgo.setFullYear(sixYearsAgo.getFullYear() - 6);

    const result = await controller.purge(sixYearsAgo.toISOString());

    expect(mockMovementRepo.purgeBefore).toHaveBeenCalled();
    expect(mockLogCustoRepo.purgeBefore).toHaveBeenCalled();
    expect(result).toEqual({
      message: 'Limpeza de logs de auditoria realizada com sucesso.',
      data: {
        movimentacoesRemovidas: 10,
        logsCustoRemovidos: 5,
      },
    });
  });

  it('deve rejeitar o purge se data for menor que 5 anos (RN-REL-003)', async () => {
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

    await expect(controller.purge(threeYearsAgo.toISOString())).rejects.toThrow(
      ForbiddenException,
    );
    expect(mockMovementRepo.purgeBefore).not.toHaveBeenCalled();
    expect(mockLogCustoRepo.purgeBefore).not.toHaveBeenCalled();
  });

  it('deve falhar se dataLimite nao for informada', async () => {
    await expect(controller.purge('')).rejects.toThrow(BadRequestException);
  });

  it('deve falhar se dataLimite for data invalida', async () => {
    await expect(controller.purge('data-invalida')).rejects.toThrow(BadRequestException);
  });

  it('deve chamar exportCsv e retornar o conteudo formatado em CSV', async () => {
    const mockRes = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    await controller.exportCsv(mockRes as any);

    expect(mockExportAuditCsvUseCase.execute).toHaveBeenCalled();
    expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
    expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename=audit-log.csv');
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalledWith('csv-content');
  });
});
