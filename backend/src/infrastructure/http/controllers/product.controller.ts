import { Controller, Post, Body, Patch, Param, BadRequestException, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../security/jwt-auth.guard';
import { Roles, Role } from '../../security/roles.decorator';
import { RegisterProductUseCase } from '../../../core/use-cases/product/register-product.use-case';
import { DisableProductUseCase } from '../../../core/use-cases/product/disable-product.use-case';
import { RegisterProductDto } from '../dtos/register-product.dto';

@ApiTags('Produtos')
@ApiBearerAuth()
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
  @ApiOperation({ summary: 'Registrar um novo produto' })
  @ApiResponse({ status: 201, description: 'Produto registrado com sucesso.' })
  @ApiResponse({ status: 400, description: 'SKU já cadastrado (RN-PROD-001).' })
  async registerProduct(@Body() dto: RegisterProductDto) {
    try {
      const result = await this.registerProductUseCase.execute({
        ...dto,
        perecivel: dto.perecivel ?? false,
        tipoZonaRequerida: dto.tipoZonaRequerida ?? 'SECO',
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
  @ApiOperation({ summary: 'Desativar um produto' })
  @ApiParam({ name: 'id', description: 'ID do produto' })
  @ApiResponse({ status: 200, description: 'Produto desativado com sucesso.' })
  @ApiResponse({ status: 400, description: 'Produto possui saldo em estoque (RN-PROD-002) ou não encontrado.' })
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
