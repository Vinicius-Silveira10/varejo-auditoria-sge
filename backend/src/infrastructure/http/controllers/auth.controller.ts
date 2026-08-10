import {
  Controller,
  Post,
  Body,
  BadRequestException,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Res,
} from '@nestjs/common';
import * as express from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { RegisterUserUseCase } from '../../../core/use-cases/user/register-user.use-case';
import { AuthenticateUserUseCase } from '../../../core/use-cases/auth/authenticate-user.use-case';
import { RegisterUserDto } from '../dtos/register-user.dto';
import { LoginDto } from '../dtos/login.dto';
import { Public } from '../../security/public.decorator';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly authenticateUserUseCase: AuthenticateUserUseCase,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar novo usuário' })
  @ApiBody({ type: RegisterUserDto })
  @ApiResponse({ status: 201, description: 'Usuário criado com sucesso' })
  @ApiResponse({ status: 400, description: 'E-mail já cadastrado (RN-USR-001)' })
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

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autenticar usuário e obter token JWT' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Token JWT retornado no cookie httpOnly' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  @ApiResponse({ status: 429, description: 'Rate limit atingido (5 tentativas/minuto)' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: express.Response) {
    try {
      const result = await this.authenticateUserUseCase.execute(dto);
      
      const expiresInDays = parseInt(process.env.JWT_EXPIRATION?.replace('d', '') || '1');
      
      response.cookie('token', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        sameSite: 'strict',
        maxAge: expiresInDays * 24 * 60 * 60 * 1000,
        path: '/',
      });
      
      return { user: result.user, message: 'Login realizado com sucesso' };
    } catch (error: any) {
      if (
        error.message.includes('RN-USR-002') ||
        error.message.includes('RN-USR-003')
      ) {
        throw new UnauthorizedException(error.message);
      }
      throw error;
    }
  }
  
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fazer logout (limpar cookie)' })
  @ApiResponse({ status: 200, description: 'Logout realizado com sucesso' })
  async logout(@Res({ passthrough: true }) response: express.Response) {
    response.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'strict',
      path: '/',
    });
    return { message: 'Logout realizado com sucesso' };
  }
}
