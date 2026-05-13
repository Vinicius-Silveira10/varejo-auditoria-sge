import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    try {
      // Ping Database
      await this.prisma.$queryRaw`SELECT 1`;
      
      return {
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        checks: {
          database: 'up',
        }
      };
    } catch (error) {
      return {
        status: 'error',
        checks: {
          database: 'down',
        }
      };
    }
  }
}
