import {
  Controller,
  Post,
  Body,
  BadRequestException,
  ConflictException,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../security/jwt-auth.guard';
import { CurrentUser } from '../../security/current-user.decorator';
import { Roles, Role } from '../../security/roles.decorator';
import { ProcessNfeUseCase } from '../../../core/use-cases/nfe/process-nfe.use-case';
import { GetNotaFiscalDetailsUseCase } from '../../../core/use-cases/nfe/get-nfe-details.use-case';
import { GetNfeDivergencesUseCase } from '../../../core/use-cases/nfe/get-nfe-divergences.use-case';
import { ProcessNfeDto } from '../dtos/process-nfe.dto';

@ApiTags('NF-e')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Roles(Role.GESTOR, Role.ADMIN)
@Controller('nfe')
export class NfeController {
  constructor(
    private readonly processNfeUseCase: ProcessNfeUseCase,
    private readonly getNotaFiscalDetailsUseCase: GetNotaFiscalDetailsUseCase,
    private readonly getNfeDivergencesUseCase: GetNfeDivergencesUseCase,
  ) {}

  @Get('alerts/divergences')
  @ApiOperation({ summary: 'Obter alertas de divergências em NF-es' })
  @ApiResponse({
    status: 200,
    description: 'Divergências recuperadas com sucesso.',
  })
  async getNfeDivergences() {
    const result = await this.getNfeDivergencesUseCase.execute();
    return {
      data: result,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de uma NF-e específica' })
  @ApiParam({ name: 'id', description: 'ID da Nota Fiscal' })
  @ApiResponse({ status: 200, description: 'Detalhes da NF-e encontrados.' })
  @ApiResponse({ status: 404, description: 'Nota Fiscal não encontrada.' })
  async getNfeDetails(@Param('id') id: string) {
    const result = await this.getNotaFiscalDetailsUseCase.execute(+id);
    return {
      data: result,
    };
  }

  @Post('process')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Processar XML de uma NF-e' })
  @ApiResponse({
    status: 201,
    description: 'NF-e processada com sucesso (com ou sem divergências).',
  })
  @ApiResponse({ status: 400, description: 'XML inválido ou malformado.' })
  @ApiResponse({
    status: 409,
    description: 'Chave de acesso já processada anteriormente (RN-REC-002).',
  })
  async processNfe(@Body() dto: ProcessNfeDto, @CurrentUser('userId') usuarioId: number) {
    try {
      const result = await this.processNfeUseCase.execute(dto.xmlContent, usuarioId);
      return {
        message:
          result.status === 'CONFERIDO'
            ? `NF-e processada com sucesso. ${result.lotesGerados} lote(s) gerado(s).`
            : 'NF-e processada com divergências. Nenhum lote foi gerado.',
        data: {
          notaFiscalId: result.notaFiscal.id,
          chaveAcesso: result.notaFiscal.chaveAcesso,
          status: result.status,
          divergencias: result.divergencias,
          lotesGerados: result.lotesGerados,
        },
      };
    } catch (error: any) {
      if (error.message.includes('RN-REC-002')) {
        throw new ConflictException(error.message);
      }
      if (
        error.message.includes('XML') ||
        error.message.includes('vazio') ||
        error.message.includes('inválid')
      ) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
