import { Controller, Post, Body, BadRequestException, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { RegisterUserUseCase } from '../../../core/use-cases/user/register-user.use-case';
import { AuthenticateUserUseCase } from '../../../core/use-cases/auth/authenticate-user.use-case';
import { RegisterUserDto } from '../dtos/register-user.dto';
import { LoginDto } from '../dtos/login.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly authenticateUserUseCase: AuthenticateUserUseCase
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterUserDto) {
    try {
      const result = await this.registerUserUseCase.execute(dto);
      return {
        message: 'Usuário registrado com sucesso',
        data: result,
      };
    } catch (error: any) {
      if (error.message.includes('RN-USR-001')) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    try {
      const result = await this.authenticateUserUseCase.execute(dto);
      return result;
    } catch (error: any) {
      if (error.message.includes('RN-USR-002') || error.message.includes('RN-USR-003')) {
        throw new UnauthorizedException(error.message);
      }
      throw error;
    }
  }
}
