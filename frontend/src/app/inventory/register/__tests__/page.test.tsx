import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RegisterCountPage from '../page';
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

describe('RegisterCountPage (Feature 6)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<RegisterCountPage />);
    expect(screen.getByTestId('mock-header')).toHaveTextContent('Registrar Contagem');
    expect(screen.getByText('Registrar Contagem Física')).toBeInTheDocument();
  });

  it('shows error toast when fields are missing', async () => {
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');
    render(<RegisterCountPage />);
    
    const button = screen.getByRole('button', { name: /Registrar Contagem/i });
    const form = button.closest('form');
    if (form) fireEvent.submit(form);
    
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'custom-toast',
        detail: expect.objectContaining({
          type: 'error',
          message: 'Por favor, informe o ID da Contagem e a Quantidade Física.',
        })
      })
    );
  });

  it('calls apiFetch and shows success toast on successful register', async () => {
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');
    (api.apiFetch as jest.Mock).mockResolvedValueOnce({});

    render(<RegisterCountPage />);
    
    const inputId = screen.getByLabelText(/ID da Contagem/i);
    fireEvent.change(inputId, { target: { value: '5' } });

    const inputQtd = screen.getByLabelText(/Quantidade Física Encontrada/i);
    fireEvent.change(inputQtd, { target: { value: '495' } });
    
    const button = screen.getByRole('button', { name: /Registrar Contagem/i });
    fireEvent.click(button);

    expect(api.apiFetch).toHaveBeenCalledWith('/inventory/register', {
      method: 'POST',
      body: JSON.stringify({ contagemId: 5, quantidadeFisica: 495 }),
    });

    await waitFor(() => {
      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'custom-toast',
          detail: expect.objectContaining({
            type: 'success',
            message: 'Contagem registrada com sucesso!',
          })
        })
      );
    });
  });
});
