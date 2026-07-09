import { Module } from '@nestjs/common';
import { AuditController } from './controllers/audit.controller';
import { VerifyAuditChainUseCase } from '../../core/use-cases/audit/verify-audit-chain.use-case';
import { ExportAuditCsvUseCase } from '../../core/use-cases/audit/export-audit-csv.use-case';
import { HashService } from '../security/hash.service';
import { IMovementRepository } from '../../core/interfaces/repositories/i-movement.repository';
import { ILogCustoRepository } from '../../core/interfaces/repositories/i-log-custo.repository';
import { PrismaModule } from '../database/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AuditController],
  providers: [
    {
      provide: VerifyAuditChainUseCase,
      useFactory: (hashService: HashService) => {
        return new VerifyAuditChainUseCase(hashService);
      },
      inject: [HashService],
    },
    {
      provide: ExportAuditCsvUseCase,
      useFactory: (
        movementRepo: IMovementRepository,
        logCustoRepo: ILogCustoRepository,
      ) => {
        return new ExportAuditCsvUseCase(movementRepo, logCustoRepo);
      },
      inject: ['IMovementRepository', 'ILogCustoRepository'],
    },
  ],
})
export class AuditModule {}
