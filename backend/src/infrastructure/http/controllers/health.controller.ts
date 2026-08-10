import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { Public } from '../../security/public.decorator';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health Check')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Verificar saúde da aplicação e conectividade com o banco' })
  @ApiResponse({ status: 200, description: 'Aplicação saudável' })
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
        },
      };
    } catch (error) {
      return {
        status: 'error',
        checks: {
          database: 'down',
        },
      };
    }
  }
}
