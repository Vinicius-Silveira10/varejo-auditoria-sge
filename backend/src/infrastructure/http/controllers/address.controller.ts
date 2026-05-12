import { Controller, Post, Body, Patch, Param, BadRequestException, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../security/jwt-auth.guard';
import { RegisterAddressUseCase } from '../../../core/use-cases/address/register-address.use-case';
import { DisableAddressUseCase } from '../../../core/use-cases/address/disable-address.use-case';
import { RegisterAddressDto } from '../dtos/register-address.dto';
import { SuggestPutawayUseCase } from '../../../core/use-cases/address/suggest-putaway.use-case';
import { SuggestPutawayDto } from '../dtos/suggest-putaway.dto';
import { Get, Query } from '@nestjs/common';

@UseGuards(JwtAuthGuard)
@Controller('addresses')
export class AddressController {
  constructor(
    private readonly registerAddressUseCase: RegisterAddressUseCase,
    private readonly disableAddressUseCase: DisableAddressUseCase,
    private readonly suggestPutawayUseCase: SuggestPutawayUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
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
