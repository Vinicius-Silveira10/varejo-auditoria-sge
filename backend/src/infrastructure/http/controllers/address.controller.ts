import { Controller, Post, Body, Patch, Param, BadRequestException, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../security/jwt-auth.guard';
import { RegisterAddressUseCase } from '../../../core/use-cases/address/register-address.use-case';
import { DisableAddressUseCase } from '../../../core/use-cases/address/disable-address.use-case';
import { RegisterAddressDto } from '../dtos/register-address.dto';

@UseGuards(JwtAuthGuard)
@Controller('addresses')
export class AddressController {
  constructor(
    private readonly registerAddressUseCase: RegisterAddressUseCase,
    private readonly disableAddressUseCase: DisableAddressUseCase
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
}
