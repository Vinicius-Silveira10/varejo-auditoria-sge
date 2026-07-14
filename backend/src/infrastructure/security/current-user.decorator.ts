import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtUser } from './jwt.strategy';

/**
 * ARQT-004 FIX: Decorator para extrair o usuário autenticado do request.
 * Uso: @CurrentUser() user: JwtUser ou @CurrentUser('userId') userId: number
 */
export const CurrentUser = createParamDecorator(
  (data: keyof JwtUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtUser;
    return data ? user?.[data] : user;
  },
);
