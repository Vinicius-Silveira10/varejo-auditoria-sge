import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InventoryStartPage from '../page';
import * as api from '@/lib/api';

// Mock Header
jest.mock('@/components/Header', () => {
  return function MockHeader({ title }: { title: string }) {
    return <div data-testid="mock-header">{title}</div>;
  };
});

// Mock apiFetch
jest.mock('@/lib/api', () => ({
  apiFetch: jest.fn(),
}));

describe('InventoryStartPage (Feature 5)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<InventoryStartPage />);
    expect(screen.getByTestId('mock-header')).toHaveTextContent('Iniciar Inventário');
    expect(screen.getByText('Iniciar Contagem Cíclica')).toBeInTheDocument();
    expect(screen.getByLabelText(/ID do Lote a ser inventariado/i)).toBeInTheDocument();
  });

  it('shows error toast when loteId is empty', async () => {
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');
    render(<InventoryStartPage />);
    
    const button = screen.getByRole('button', { name: /Iniciar Contagem/i });
    const form = button.closest('form');
    if (form) fireEvent.submit(form);
    
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'custom-toast',
        detail: expect.objectContaining({
          type: 'error',
          message: 'Por favor, informe o ID do Lote.',
        })
      })
    );
  });

  it('calls apiFetch and shows success toast on successful start', async () => {
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');
    (api.apiFetch as jest.Mock).mockResolvedValueOnce({ id: 99 });

    render(<InventoryStartPage />);
    
    const input = screen.getByLabelText(/ID do Lote a ser inventariado/i);
    fireEvent.change(input, { target: { value: '10' } });
    
    const button = screen.getByRole('button', { name: /Iniciar Contagem/i });
    fireEvent.click(button);

    expect(api.apiFetch).toHaveBeenCalledWith('/inventory/start', {
      method: 'POST',
      body: JSON.stringify({ loteId: 10 }),
    });

    await waitFor(() => {
      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'custom-toast',
          detail: expect.objectContaining({
            type: 'success',
            message: 'Contagem de inventário iniciada! ID Contagem: 99',
          })
        })
      );
    });
  });

  it('handles race condition error gracefully', async () => {
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');
    (api.apiFetch as jest.Mock).mockRejectedValueOnce(new Error('Este lote já está sob contagem'));

    render(<InventoryStartPage />);
    
    const input = screen.getByLabelText(/ID do Lote a ser inventariado/i);
    fireEvent.change(input, { target: { value: '10' } });
    
    const button = screen.getByRole('button', { name: /Iniciar Contagem/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'custom-toast',
          detail: expect.objectContaining({
            type: 'error',
            message: 'Este lote já está em processo de contagem por outro usuário.',
          })
        })
      );
    });
  });
});
