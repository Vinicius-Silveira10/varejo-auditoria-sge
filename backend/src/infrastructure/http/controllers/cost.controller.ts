import { Controller, Get, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../../security/jwt-auth.guard';
import { Roles, Role } from '../../security/roles.decorator';
import { GetProductCostHistoryUseCase } from '../../../core/use-cases/cost/get-product-cost-history.use-case';

@UseGuards(JwtAuthGuard)
@Roles(Role.GESTOR, Role.ADMIN)
@Controller('costs')
export class CostController {
  constructor(private readonly getProductCostHistoryUseCase: GetProductCostHistoryUseCase) {}

  @Get('product/:id')
  async getProductCostHistory(@Param('id') id: string) {
    try {
      const result = await this.getProductCostHistoryUseCase.execute(+id);
      return {
        data: result,
      };
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }
}
