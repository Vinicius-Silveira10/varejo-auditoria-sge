// DATABASE_URL é garantida pelo validateEnv() em main.ts antes deste módulo carregar.
// Não há fallback aqui intencionalmente — a aplicação falha ruidosamente se a variável estiver ausente.
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
