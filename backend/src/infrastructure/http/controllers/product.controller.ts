import { Controller, Post, Body, Patch, Param, BadRequestException, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../security/jwt-auth.guard';
import { Roles, Role } from '../../security/roles.decorator';
import { RegisterProductUseCase } from '../../../core/use-cases/product/register-product.use-case';
import { DisableProductUseCase } from '../../../core/use-cases/product/disable-product.use-case';
import { RegisterProductDto } from '../dtos/register-product.dto';

@UseGuards(JwtAuthGuard)
@Roles(Role.GESTOR, Role.ADMIN)
@Controller('products')
export class ProductController {
  constructor(
    private readonly registerProductUseCase: RegisterProductUseCase,
    private readonly disableProductUseCase: DisableProductUseCase
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async registerProduct(@Body() dto: RegisterProductDto) {
    try {
      const result = await this.registerProductUseCase.execute({
        ...dto,
        perecivel: dto.perecivel ?? false,
      });
      return {
        message: 'Produto registrado com sucesso',
        data: result,
      };
    } catch (error: any) {
      if (error.message.includes('RN-PROD-001')) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Patch(':id/disable')
  async disableProduct(@Param('id') id: string) {
    try {
      const result = await this.disableProductUseCase.execute(+id);
      return {
        message: 'Produto desativado com sucesso',
        data: result,
      };
    } catch (error: any) {
      if (error.message.includes('RN-PROD-002') || error.message.includes('RN-PROD-003')) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
