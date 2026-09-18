import { SetMetadata } from '@nestjs/common';

export enum Role {
  ADMIN = 'ADMIN',
  GESTOR = 'GESTOR',
  CONTROLADORIA = 'CONTROLADORIA',
  OPERADOR = 'OPERADOR',
}

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
