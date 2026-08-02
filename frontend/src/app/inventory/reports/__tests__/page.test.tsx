import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import InventoryReportsPage from '../page';
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

describe('InventoryReportsPage (Feature 7)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (api.apiFetch as jest.Mock).mockReturnValue(new Promise(() => {}));
    render(<InventoryReportsPage />);
    expect(screen.getByText('Carregando relatórios...')).toBeInTheDocument();
  });

  it('fetches and renders accuracy and value reports', async () => {
    (api.apiFetch as jest.Mock).mockImplementation((url: string) => {
      if (url === '/inventory/report/accuracy') {
        return Promise.resolve({
          totalContagens: 10,
          contagensExatas: 8,
          contagensDivergentes: 2,
          acuracidadePercentual: 80.0,
        });
      }
      if (url === '/inventory/report/value') {
        return Promise.resolve({
          totalProdutos: 2,
          valorTotalEstoque: 15000,
          detalhes: [
            { sku: 'SKU-001', quantidadeTotal: 100, custoMedio: 50, valorTotalProduto: 5000 },
            { sku: 'SKU-002', quantidadeTotal: 200, custoMedio: 50, valorTotalProduto: 10000 },
          ],
        });
      }
      return Promise.reject();
    });

    render(<InventoryReportsPage />);

    await waitFor(() => {
      expect(screen.queryByText('Carregando relatórios...')).not.toBeInTheDocument();
    });

    // Accuracy assertions
    expect(screen.getByText('80.00%')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument(); // total
    expect(screen.getByText('8')).toBeInTheDocument(); // exatas
    expect(screen.getAllByText('2').length).toBeGreaterThan(0); // divergentes and unique products
    
    // Value assertions
    // Checking for formatted strings. R$ 15.000,00 might contain non-breaking spaces depending on Intl,
    // so it's safer to use a regex that ignores exact spacing.
    expect(screen.getByText(/15\.000,00/)).toBeInTheDocument();
    expect(screen.getByText('SKU-001')).toBeInTheDocument();
    expect(screen.getByText('SKU-002')).toBeInTheDocument();
  });
});
