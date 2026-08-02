import { hasRole, getCurrentUser } from '../auth';
import * as api from '../api';

jest.mock('../api', () => ({
  getUser: jest.fn(),
}));

describe('Auth Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrentUser', () => {
    it('should call getUser from api', () => {
      const mockUser = { id: 1, perfil: 'GESTOR' };
      (api.getUser as jest.Mock).mockReturnValue(mockUser);
      
      const user = getCurrentUser();
      
      expect(api.getUser).toHaveBeenCalledTimes(1);
      expect(user).toEqual(mockUser);
    });
  });

  describe('hasRole', () => {
    it('should return false if user is null', () => {
      (api.getUser as jest.Mock).mockReturnValue(null);
      expect(hasRole('GESTOR')).toBe(false);
    });

    it('should return false if user has no perfil', () => {
      (api.getUser as jest.Mock).mockReturnValue({ id: 1 });
      expect(hasRole('GESTOR')).toBe(false);
    });

    it('should return true if user has the exact role', () => {
      (api.getUser as jest.Mock).mockReturnValue({ id: 1, perfil: 'GESTOR' });
      expect(hasRole('GESTOR')).toBe(true);
    });

    it('should return true if user has one of the allowed roles', () => {
      (api.getUser as jest.Mock).mockReturnValue({ id: 1, perfil: 'ADMIN' });
      expect(hasRole('GESTOR', 'ADMIN')).toBe(true);
    });

    it('should return false if user role is not in the list', () => {
      (api.getUser as jest.Mock).mockReturnValue({ id: 1, perfil: 'OPERADOR' });
      expect(hasRole('GESTOR', 'ADMIN')).toBe(false);
    });
  });
});
