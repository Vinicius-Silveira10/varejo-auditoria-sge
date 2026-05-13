import { Controller, Post, Body, BadRequestException, HttpCode, HttpStatus, UseGuards, Get, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../../security/jwt-auth.guard';
import { Roles, Role } from '../../security/roles.decorator';
import { RegisterMovementUseCase } from '../../../core/use-cases/movement/register-movement.use-case';
import { GetBatchMovementsUseCase } from '../../../core/use-cases/movement/get-batch-movements.use-case';
import { RegisterMovementDto } from '../dtos/register-movement.dto';

@UseGuards(JwtAuthGuard)
@Controller('movements')
export class MovementController {
  constructor(
    private readonly registerMovementUseCase: RegisterMovementUseCase,
    private readonly getBatchMovementsUseCase: GetBatchMovementsUseCase,
  ) {}

  @Roles(Role.GESTOR, Role.ADMIN)
  @Get('batch/:id')
  async getBatchMovements(@Param('id') id: string) {
    const result = await this.getBatchMovementsUseCase.execute(+id);
    return {
      data: result,
    };
  }

  @Roles(Role.OPERADOR, Role.GESTOR, Role.ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async registerMovement(@Body() dto: RegisterMovementDto) {
    try {
      const result = await this.registerMovementUseCase.execute({
        ...dto,
        motivo: dto.motivo ?? null,
        enderecoOrigemId: dto.enderecoOrigemId ?? null,
        enderecoDestinoId: dto.enderecoDestinoId ?? null,
      });
      return {
        message: 'Movimentação registrada com sucesso',
        data: result,
      };
    } catch (error: any) {
      if (error.message.includes('RN-TRV-002') || error.message.includes('RN-EXP-001') || error.message.includes('não encontrado')) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
