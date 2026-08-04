import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import DashboardPage from '../page';
import api from '@/lib/api';

jest.mock('@/lib/api', () => ({
  get: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  hasRole: jest.fn().mockReturnValue(true),
}));

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const mockKpis = {
  acuraciaGeral: 98,
  totalRecontagens: 12,
  perdasAjustes: -1250.50
};

const mockRealtime = {
  totalMovimentacoes: 100,
  pickingPendente: 3
};

const mockAccuracy = {
  acuraciaPercentual: 98,
};

const mockOtif = {
  onTimePercentual: 95,
};

const mockRuptures = {
  rupturasCurvaA: 2,
};

const mockDeadStock = {
  parados90Dias: 5,
};

const mockShrinkage = {
  perdasAjustes: -1250.50,
};

describe('DashboardPage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (api.get as jest.Mock).mockImplementation(() => new Promise(() => {}));
    render(<DashboardPage />);
    expect(screen.getByText('Carregando KPIs...')).toBeInTheDocument();
  });

  it('renders KPIs and Realtime data after fetch', async () => {
    (api.get as jest.Mock).mockImplementation((url: string) => {
      if (url === '/dashboards/kpis') return Promise.resolve({ data: mockKpis });
      if (url === '/dashboards/realtime') return Promise.resolve({ data: mockRealtime });
      if (url === '/dashboards/accuracy') return Promise.resolve({ data: mockAccuracy });
      if (url === '/dashboards/otif') return Promise.resolve({ data: mockOtif });
      if (url === '/dashboards/occupation') return Promise.resolve({ data: { totalGlobal: { percentual: 75 } } });
      if (url === '/dashboards/kpi/ruptures') return Promise.resolve({ data: mockRuptures });
      if (url === '/dashboards/kpi/dead-stock') return Promise.resolve({ data: mockDeadStock });
      if (url === '/dashboards/kpi/shrinkage') return Promise.resolve({ data: mockShrinkage });
      return Promise.resolve({ data: {} });
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.queryByText('Carregando KPIs...')).not.toBeInTheDocument();
    });

    // Consolidated KPIs
    expect(screen.getByText('98%')).toBeInTheDocument(); // acuracia
    expect(screen.getByText('95%')).toBeInTheDocument(); // otif
    expect(screen.getByText('75%')).toBeInTheDocument(); // occupation
    expect(screen.getByText('3')).toBeInTheDocument(); // pickingPendente
    expect(screen.getByText('12')).toBeInTheDocument(); // totalRecontagens
    
    // Detailed KPIs
    expect(screen.getByText('2')).toBeInTheDocument(); // rupturas
    expect(screen.getByText('5')).toBeInTheDocument(); // dead stock
    expect(screen.getByText(/1\.250,50/)).toBeInTheDocument(); // shrinkage formatted
  });

  it('renders positive empty states when 0 rupturas or dead stock', async () => {
    (api.get as jest.Mock).mockImplementation((url: string) => {
      if (url === '/dashboards/realtime') return Promise.resolve({ data: mockRealtime });
      if (url === '/dashboards/accuracy') return Promise.resolve({ data: mockAccuracy });
      if (url === '/dashboards/otif') return Promise.resolve({ data: mockOtif });
      if (url === '/dashboards/occupation') return Promise.resolve({ data: { totalGlobal: { percentual: 75 } } });
      if (url === '/dashboards/kpi/ruptures') return Promise.resolve({ data: { rupturasCurvaA: 0 } });
      if (url === '/dashboards/kpi/dead-stock') return Promise.resolve({ data: { parados90Dias: 0 } });
      if (url === '/dashboards/kpi/shrinkage') return Promise.resolve({ data: mockShrinkage });
      return Promise.resolve({ data: {} });
    });

    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.queryByText('Carregando KPIs...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Nenhuma ruptura de Curva A no momento')).toBeInTheDocument();
    expect(screen.getByText('Estoque circulando de forma saudável')).toBeInTheDocument();
    expect(screen.getByText('Baseado em saldo contábil — não reflete disponibilidade física imediata')).toBeInTheDocument();
  });

  it('redirects with toast if user lacks GESTOR or ADMIN role', () => {
    // Mock user without role
    const { hasRole } = require('@/lib/auth');
    hasRole.mockReturnValue(false);

    const dispatchEventSpy = jest.spyOn(window, 'dispatchEvent');

    render(<DashboardPage />);

    expect(mockPush).toHaveBeenCalledWith('/');
    
    // Check if toast was dispatched
    const customToastEvent = dispatchEventSpy.mock.calls.find(
      (call) => call[0].type === 'custom-toast'
    );
    expect(customToastEvent).toBeDefined();
    expect((customToastEvent![0] as CustomEvent).detail.message).toBe('Acesso restrito');
  });

  describe('Polling mechanism', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('polls the API every 30 seconds', async () => {
      const { hasRole } = require('@/lib/auth');
      hasRole.mockReturnValue(true);

      (api.get as jest.Mock).mockImplementation(() => Promise.resolve({ data: {} }));

      render(<DashboardPage />);
      
      // Wait for initial fetch (1 promise per API call)
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(8); // 8 calls total for all kpis
      });

      jest.clearAllMocks();

      // Fast-forward 30 seconds
      jest.advanceTimersByTime(30000);
      expect(api.get).toHaveBeenCalledTimes(8); // polling happens again

      // Fast-forward another 30 seconds
      jest.advanceTimersByTime(30000);
      expect(api.get).toHaveBeenCalledTimes(16);
    });

    it('clears interval on unmount to prevent memory leaks', async () => {
      const { hasRole } = require('@/lib/auth');
      hasRole.mockReturnValue(true);
      (api.get as jest.Mock).mockImplementation(() => Promise.resolve({ data: {} }));

      const { unmount } = render(<DashboardPage />);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(8);
      });
      jest.clearAllMocks();

      unmount();

      // Fast-forward 30 seconds
      jest.advanceTimersByTime(30000);
      
      // se não houver clearInterval, vai ter feito as 8 chamadas!
      expect(api.get).not.toHaveBeenCalled();
    });
  });
});
