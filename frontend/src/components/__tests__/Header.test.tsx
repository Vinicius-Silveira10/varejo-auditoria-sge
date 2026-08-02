import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Header from '../Header';
import * as auth from '@/lib/auth';
import * as api from '@/lib/api';

// Mock Next.js router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock auth module
jest.mock('@/lib/auth', () => ({
  hasRole: jest.fn(),
}));

// Mock api module
jest.mock('@/lib/api', () => ({
  removeToken: jest.fn(),
  removeUser: jest.fn(),
}));

describe('Header Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title', () => {
    (auth.hasRole as jest.Mock).mockReturnValue(false);
    render(<Header title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('hides inventory links for OPERADOR', () => {
    // OPERADOR: hasRole('GESTOR', 'ADMIN') -> false
    // OPERADOR: hasRole('OPERADOR', 'GESTOR', 'ADMIN') -> true
    (auth.hasRole as jest.Mock).mockImplementation((...roles: string[]) => {
      if (roles.includes('GESTOR') && !roles.includes('OPERADOR')) return false;
      return true;
    });

    render(<Header title="Test Title" />);
    
    // Default links
    expect(screen.getByText('Recebimento')).toBeInTheDocument();
    
    // Allowed links
    expect(screen.getByText('Contagem')).toBeInTheDocument();
    expect(screen.getByText('Solicitar Ajuste')).toBeInTheDocument();
    
    // Blocked links
    expect(screen.queryByText('Inventário')).not.toBeInTheDocument();
    expect(screen.queryByText('Relatórios')).not.toBeInTheDocument();
    expect(screen.queryByText('Aprovações')).not.toBeInTheDocument();
  });

  it('shows all links for ADMIN', () => {
    // ADMIN has all roles
    (auth.hasRole as jest.Mock).mockReturnValue(true);

    render(<Header title="Test Title" />);
    
    expect(screen.getByText('Inventário')).toBeInTheDocument();
    expect(screen.getByText('Relatórios')).toBeInTheDocument();
    expect(screen.getByText('Contagem')).toBeInTheDocument();
    expect(screen.getByText('Aprovações')).toBeInTheDocument();
  });

  it('calls logout functions and redirects on logout button click', () => {
    (auth.hasRole as jest.Mock).mockReturnValue(true);
    render(<Header title="Test Title" />);
    
    const logoutBtn = screen.getByText('Sair');
    fireEvent.click(logoutBtn);

    expect(api.removeToken).toHaveBeenCalled();
    expect(api.removeUser).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});
