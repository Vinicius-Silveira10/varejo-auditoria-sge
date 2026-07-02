import { Controller, Get, Delete, Query, UseGuards, Inject, BadRequestException, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../security/jwt-auth.guard';
import { Roles, Role } from '../../security/roles.decorator';
import { VerifyAuditChainUseCase } from '../../../core/use-cases/audit/verify-audit-chain.use-case';
import { ExportAuditCsvUseCase } from '../../../core/use-cases/audit/export-audit-csv.use-case';
import { RetentionGuard } from '../../security/retention.guard';
import type { IMovementRepository } from '../../../core/interfaces/repositories/i-movement.repository';
import type { ILogCustoRepository } from '../../../core/interfaces/repositories/i-log-custo.repository';

@ApiTags('Auditoria')
@ApiBearerAuth()
@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(
    private readonly verifyAuditChainUseCase: VerifyAuditChainUseCase,
    private readonly exportAuditCsvUseCase: ExportAuditCsvUseCase,
    @Inject('IMovementRepository')
    private readonly movementRepository: IMovementRepository,
    @Inject('ILogCustoRepository')
    private readonly logCustoRepository: ILogCustoRepository,
  ) {}

  @Get('verify')
  @ApiOperation({ summary: 'Verificar integridade da cadeia de hashes de auditoria (Movimentações e CustoLogs)' })
  @ApiResponse({ status: 200, description: 'Resultado da verificação de integridade retornado.' })
  @ApiResponse({ status: 401, description: 'Não autorizado.' })
  async verifyAll() {
    const [movResult, logResult] = await Promise.all([
      this.verifyAuditChainUseCase.verify('Movimentacao', this.movementRepository as any),
      this.verifyAuditChainUseCase.verify('LogCusto', this.logCustoRepository as any),
    ]);

    return {
      timestamp: new Date().toISOString(),
      status: movResult.integridadeOk && logResult.integridadeOk ? 'INTEGRO' : 'CORROMPIDO',
      resultados: [movResult, logResult],
    };
  }

  @Delete('purge')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Expurgar logs de auditoria anteriores a uma data (mínimo 5 anos — RN-REL-003)' })
  @ApiQuery({ name: 'dataLimite', description: 'Data limite para expurgo no formato ISO 8601 (ex: 2021-01-01)', required: true })
  @ApiResponse({ status: 200, description: 'Logs expurgados com sucesso.' })
  @ApiResponse({ status: 400, description: 'Data inválida ou período dentro dos 5 anos de retenção obrigatória.' })
  @ApiResponse({ status: 403, description: 'Apenas ADMIN pode expurgar logs.' })
  async purge(@Query('dataLimite') dataLimiteStr: string) {
    if (!dataLimiteStr) {
      throw new BadRequestException('Parâmetro dataLimite é obrigatório.');
    }

    const dataLimite = new Date(dataLimiteStr);
    if (isNaN(dataLimite.getTime())) {
      throw new BadRequestException('Data limite inválida.');
    }

    // Valida se a data limite respeita os 5 anos mínimos de retenção (RN-REL-003)
    RetentionGuard.assertPurgeable(dataLimite);

    const [deletedMovements, deletedCostLogs] = await Promise.all([
      this.movementRepository.purgeBefore(dataLimite),
      this.logCustoRepository.purgeBefore(dataLimite),
    ]);

    return {
      message: 'Limpeza de logs de auditoria realizada com sucesso.',
      data: {
        movimentacoesRemovidas: deletedMovements,
        logsCustoRemovidos: deletedCostLogs,
      },
    };
  }

  @Get('export')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Exportar logs de auditoria em CSV com pseudonimização LGPD (SHA-256)' })
  @ApiResponse({ status: 200, description: 'Arquivo CSV gerado e retornado como download.', content: { 'text/csv': { schema: { type: 'string' } } } })
  @ApiResponse({ status: 403, description: 'Apenas ADMIN pode exportar logs de auditoria.' })
  async exportCsv(@Res() res: any) {
    const csvContent = await this.exportAuditCsvUseCase.execute();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=audit-log.csv');
    return res.status(200).send(csvContent);
  }
}
