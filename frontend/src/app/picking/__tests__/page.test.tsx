import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PickingPage from '../page';
import * as api from '@/lib/api';

jest.mock('@/components/Header', () => {
  return function MockHeader({ title }: { title: string }) {
    return <div data-testid="mock-header">{title}</div>;
  };
});

jest.mock('@/lib/api', () => ({
  apiFetch: jest.fn(),
}));

const mockOrders = {
  data: [
    {
      id: 101,
      status: 'PENDENTE',
      createdAt: '2026-08-19T10:00:00.000Z',
      itens: [
        { id: 1, produtoId: 99, quantidadeSolicitada: 5, quantidadeSeparada: 0 },
      ],
    },
    {
      id: 102,
      status: 'PENDENTE',
      createdAt: '2026-08-19T11:00:00.000Z',
      itens: [
        { id: 2, produtoId: 88, quantidadeSolicitada: 10, quantidadeSeparada: 0 },
      ],
    }
  ],
  meta: { total: 2, page: 1, limit: 20, totalPages: 1 }
};

describe('Picking Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.dispatchEvent = jest.fn();
  });

  it('deve renderizar a tela de lista de pedidos pendentes no estado inicial', async () => {
    (api.apiFetch as jest.Mock).mockResolvedValueOnce(mockOrders);

    render(<PickingPage />);

    expect(screen.getByTestId('mock-header')).toHaveTextContent('Picking / Expedição');
    expect(screen.getByText('Carregando pedidos...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Pedido #101')).toBeInTheDocument();
      expect(screen.getByText('Pedido #102')).toBeInTheDocument();
    });

    expect(api.apiFetch).toHaveBeenCalledWith('/orders?status=PENDENTE&page=1&limit=20');
  });

  it('deve exibir mensagem de erro via custom-toast se falhar ao buscar pedidos', async () => {
    (api.apiFetch as jest.Mock).mockRejectedValueOnce(new Error('Erro no servidor'));

    render(<PickingPage />);

    await waitFor(() => {
      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'custom-toast',
          detail: { type: 'error', message: 'Erro no servidor' }
        })
      );
    });
  });

  it('deve transitar para o estado "separando" ao clicar em Iniciar Separação', async () => {
    (api.apiFetch as jest.Mock)
      .mockResolvedValueOnce(mockOrders)
      .mockResolvedValueOnce({});

    render(<PickingPage />);

    await waitFor(() => {
      expect(screen.getByText('Pedido #101')).toBeInTheDocument();
    });

    const btnIniciar = screen.getAllByText('Iniciar Separação')[0];
    fireEvent.click(btnIniciar);

    await waitFor(() => {
      expect(screen.getByText('Separando Pedido #101')).toBeInTheDocument();
      expect(api.apiFetch).toHaveBeenCalledWith('/orders/101/pick', { method: 'POST' });
    });
  });

  it('deve tratar erro RN-EXP-007 e exibir Toast ao falhar na separação', async () => {
    (api.apiFetch as jest.Mock)
      .mockResolvedValueOnce(mockOrders)
      .mockRejectedValueOnce(new Error('RN-EXP-007: Lote vencido detectado'));

    render(<PickingPage />);

    await waitFor(() => {
      expect(screen.getByText('Pedido #101')).toBeInTheDocument();
    });

    const btnIniciar = screen.getAllByText('Iniciar Separação')[0];
    fireEvent.click(btnIniciar);

    await waitFor(() => {
      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'custom-toast',
          detail: { type: 'error', message: 'RN-EXP-007: Lote vencido detectado' }
        })
      );
    });
    
    expect(screen.getByText('Pedido #102')).toBeInTheDocument();
  });

  it('deve permitir conferência de itens e fechar o pedido (Feature 5)', async () => {
    (api.apiFetch as jest.Mock)
      .mockResolvedValueOnce(mockOrders)
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    render(<PickingPage />);

    await waitFor(() => expect(screen.getByText('Pedido #101')).toBeInTheDocument());

    const btnIniciar = screen.getAllByText('Iniciar Separação')[0];
    fireEvent.click(btnIniciar);

    await waitFor(() => {
      expect(screen.getByText('Conferindo Pedido #101')).toBeInTheDocument();
    });

    // Preenche crachás dos conferentes (RN-EXP-003)
    const inputConf1 = screen.getByPlaceholderText('Crachá Conferente 1');
    const inputConf2 = screen.getByPlaceholderText('Crachá Conferente 2');
    fireEvent.change(inputConf1, { target: { value: '801' } });
    fireEvent.change(inputConf2, { target: { value: '802' } });

    const btnConferir = screen.getByText('Finalizar Conferência');
    fireEvent.click(btnConferir);

    await waitFor(() => {
      expect(api.apiFetch).toHaveBeenCalledWith('/orders/101/verify', { 
        method: 'PATCH',
        body: JSON.stringify({ conferente1Id: 801, conferente2Id: 802 })
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Expedindo Pedido #101')).toBeInTheDocument();
    });

    const btnFechar = screen.getByText('Fechar Pedido');
    fireEvent.click(btnFechar);

    await waitFor(() => {
      expect(api.apiFetch).toHaveBeenCalledWith('/orders/101/close', { method: 'PATCH' });
      expect(screen.getByText('Fila de Separação')).toBeInTheDocument();
    });
  });
});
