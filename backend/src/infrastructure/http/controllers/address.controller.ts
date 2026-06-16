import { Controller, Post, Body, Patch, Param, BadRequestException, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../security/jwt-auth.guard';
import { RegisterAddressUseCase } from '../../../core/use-cases/address/register-address.use-case';
import { DisableAddressUseCase } from '../../../core/use-cases/address/disable-address.use-case';
import { RegisterAddressDto } from '../dtos/register-address.dto';
import { SuggestPutawayUseCase } from '../../../core/use-cases/address/suggest-putaway.use-case';
import { GetAddressCapacityAlertsUseCase } from '../../../core/use-cases/address/get-address-capacity-alerts.use-case';
import { Get, Query } from '@nestjs/common';
import { Roles, Role } from '../../security/roles.decorator';

@ApiTags('Endereços')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('addresses')
export class AddressController {
  constructor(
    private readonly registerAddressUseCase: RegisterAddressUseCase,
    private readonly disableAddressUseCase: DisableAddressUseCase,
    private readonly suggestPutawayUseCase: SuggestPutawayUseCase,
    private readonly getAddressCapacityAlertsUseCase: GetAddressCapacityAlertsUseCase,
  ) {}

  @Roles(Role.GESTOR, Role.ADMIN)
  @Get('alerts/capacity')
  @ApiOperation({ summary: 'Obter alertas de endereços com alta ocupação' })
  @ApiQuery({ name: 'threshold', required: false, description: 'Percentual de ocupação (ex: 0.9 para 90%)' })
  @ApiResponse({ status: 200, description: 'Alertas recuperados com sucesso.' })
  async getCapacityAlerts(@Query('threshold') threshold?: string) {
    const result = await this.getAddressCapacityAlertsUseCase.execute(threshold ? +threshold : 0.9);
    return {
      data: result,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar um novo endereço logístico' })
  @ApiResponse({ status: 201, description: 'Endereço registrado com sucesso.' })
  @ApiResponse({ status: 400, description: 'Código de endereço já existe (RN-ARM-001).' })
  async registerAddress(@Body() dto: RegisterAddressDto) {
    try {
      const result = await this.registerAddressUseCase.execute(dto);
      return {
        message: 'Endereço registrado com sucesso',
        data: result,
      };
    } catch (error: any) {
      if (error.message.includes('RN-ARM-001')) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Patch(':id/disable')
  @ApiOperation({ summary: 'Desativar um endereço' })
  @ApiParam({ name: 'id', description: 'ID do endereço' })
  @ApiResponse({ status: 200, description: 'Endereço desativado com sucesso.' })
  @ApiResponse({ status: 400, description: 'Endereço possui saldo (RN-ARM-002) ou é o último da zona.' })
  async disableAddress(@Param('id') id: string) {
    try {
      const result = await this.disableAddressUseCase.execute(+id);
      return {
        message: 'Endereço desativado com sucesso',
        data: result,
      };
    } catch (error: any) {
      if (error.message.includes('RN-ARM-002') || error.message.includes('RN-ARM-003')) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Get('suggest-putaway')
  @ApiOperation({ summary: 'Sugerir endereços para armazenagem de um produto' })
  @ApiQuery({ name: 'produtoId', description: 'ID do produto' })
  @ApiQuery({ name: 'quantidade', description: 'Quantidade a armazenar' })
  @ApiResponse({ status: 200, description: 'Sugestões calculadas.' })
  async suggestPutaway(@Query('produtoId') produtoId: string, @Query('quantidade') quantidade: string) {
    try {
      const dto = { produtoId: parseInt(produtoId, 10), quantidade: parseInt(quantidade, 10) };
      if (isNaN(dto.produtoId) || isNaN(dto.quantidade) || dto.quantidade <= 0) {
        throw new BadRequestException('produtoId e quantidade devem ser números válidos maiores que zero.');
      }
      
      const result = await this.suggestPutawayUseCase.execute(dto);
      return {
        message: 'Sugestões de armazenagem calculadas com sucesso',
        data: result,
      };
    } catch (error: any) {
      if (error.message.includes('RN-ARM-002')) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
