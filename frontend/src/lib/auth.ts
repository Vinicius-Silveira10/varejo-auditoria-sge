import { getUser } from './api';

export function getCurrentUser() {
  return getUser();
}

export function hasRole(...roles: string[]): boolean {
  const user = getCurrentUser();
  if (!user || !user.perfil) return false;
  return roles.includes(user.perfil);
}
