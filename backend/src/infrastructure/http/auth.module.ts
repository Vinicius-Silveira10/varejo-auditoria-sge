import { Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './controllers/auth.controller';
import { RegisterUserUseCase } from '../../core/use-cases/user/register-user.use-case';
import { AuthenticateUserUseCase } from '../../core/use-cases/auth/authenticate-user.use-case';
import { IUserRepository } from '../../core/interfaces/repositories/i-user.repository';
import { PrismaModule } from '../database/prisma/prisma.module';
import { JwtStrategy } from '../security/jwt.strategy';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secretKeyForDevelopment',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    {
      provide: RegisterUserUseCase,
      useFactory: (userRepo: IUserRepository) => {
        return new RegisterUserUseCase(userRepo);
      },
      inject: ['IUserRepository'],
    },
    {
      provide: AuthenticateUserUseCase,
      useFactory: (userRepo: IUserRepository, jwtService: JwtService) => {
        return new AuthenticateUserUseCase(userRepo, jwtService);
      },
      inject: ['IUserRepository', JwtService],
    },
  ],
})
export class AuthModule {}
