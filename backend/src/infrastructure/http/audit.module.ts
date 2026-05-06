import { Module } from '@nestjs/common';
import { AuditController } from './controllers/audit.controller';
import { VerifyAuditChainUseCase } from '../../core/use-cases/audit/verify-audit-chain.use-case';
import { HashService } from '../security/hash.service';
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
  ],
})
export class AuditModule {}
