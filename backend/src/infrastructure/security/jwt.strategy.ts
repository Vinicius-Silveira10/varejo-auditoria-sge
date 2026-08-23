import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../database/prisma/prisma.service';

export interface JwtUser {
  userId: number;
  email: string;
  perfil: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET não configurado — variável de ambiente obrigatória');
    }
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: any) => req?.cookies?.token || null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any): Promise<JwtUser> {
    const user = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      select: { ativo: true, tokenVersion: true, perfil: true, email: true },
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }
    
    if (!user.ativo) {
      throw new UnauthorizedException('Usuário inativo ou bloqueado');
    }
    
    if (user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException('Sessão expirada ou invalidada');
    }

    return { userId: payload.sub, email: user.email, perfil: user.perfil };
  }
}
