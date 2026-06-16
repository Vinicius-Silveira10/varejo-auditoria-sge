import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * ARQT-004 FIX: Decorator para extrair o usuário autenticado do request.
 * Uso: @CurrentUser() user: JwtPayload
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
