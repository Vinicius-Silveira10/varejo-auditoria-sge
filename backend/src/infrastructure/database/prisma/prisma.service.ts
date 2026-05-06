import 'dotenv/config';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://admin:fortalpassword@127.0.0.1:5433/fortal_sge?schema=public';
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
