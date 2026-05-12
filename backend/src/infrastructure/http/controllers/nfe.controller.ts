import { Controller, Post, Body, BadRequestException, ConflictException, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../security/jwt-auth.guard';
import { ProcessNfeUseCase } from '../../../core/use-cases/nfe/process-nfe.use-case';
import { ProcessNfeDto } from '../dtos/process-nfe.dto';

@UseGuards(JwtAuthGuard)
@Controller('nfe')
export class NfeController {
  constructor(private readonly processNfeUseCase: ProcessNfeUseCase) {}

  @Post('process')
  @HttpCode(HttpStatus.CREATED)
  async processNfe(@Body() dto: ProcessNfeDto) {
    try {
      const result = await this.processNfeUseCase.execute(dto.xmlContent);
      return {
        message: result.status === 'CONFERIDO'
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
      if (error.message.includes('XML') || error.message.includes('vazio') || error.message.includes('inválid')) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
