import { Controller, Get, UseGuards, Inject } from '@nestjs/common';
import { JwtAuthGuard } from '../../security/jwt-auth.guard';
import { VerifyAuditChainUseCase } from '../../../core/use-cases/audit/verify-audit-chain.use-case';
import type { IMovementRepository } from '../../../core/interfaces/repositories/i-movement.repository';
import type { ILogCustoRepository } from '../../../core/interfaces/repositories/i-log-custo.repository';

@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(
    private readonly verifyAuditChainUseCase: VerifyAuditChainUseCase,
    @Inject('IMovementRepository')
    private readonly movementRepository: IMovementRepository,
    @Inject('ILogCustoRepository')
    private readonly logCustoRepository: ILogCustoRepository,
  ) {}

  @Get('verify')
  async verifyAll() {
    const [movements, logs] = await Promise.all([
      this.movementRepository.findAllOrdered(),
      this.logCustoRepository.findAllOrdered(),
    ]);

    const [movResult, logResult] = await Promise.all([
      this.verifyAuditChainUseCase.verify('Movimentacao', movements as any),
      this.verifyAuditChainUseCase.verify('LogCusto', logs as any),
    ]);

    return {
      timestamp: new Date().toISOString(),
      status: movResult.integridadeOk && logResult.integridadeOk ? 'INTEGRO' : 'CORROMPIDO',
      resultados: [movResult, logResult],
    };
  }
}
