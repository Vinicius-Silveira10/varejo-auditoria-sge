import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, Role } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    
    // Se não houver usuário ou perfil (ex: falha no JwtAuthGuard), bloqueia por padrão
    const isAuthorized = user?.perfil && requiredRoles.some((role) => user.perfil === role);

    if (!isAuthorized) {
      const { method, url } = context.switchToHttp().getRequest();
      this.logger.warn(
        `Acesso Negado: Usuário ${user?.email || 'ANÔNIMO'} (${user?.perfil || 'SEM PERFIL'}) tentou ${method} ${url}. Requer: [${requiredRoles}]`
      );
    }

    return isAuthorized;
  }
}
