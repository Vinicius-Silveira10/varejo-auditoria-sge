import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import DashboardPage from '../page';
import * as api from '@/lib/api';

jest.mock('@/lib/api', () => ({
  apiFetch: jest.fn(),
  getUser: jest.fn(),
  API_URL: 'http://localhost:3333',
}));

jest.mock('@/lib/auth', () => ({
  hasRole: jest.fn().mockReturnValue(true),
}));

// Mock socket.io-client to avoid real WebSocket connections in tests
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    disconnect: jest.fn(),
    connected: false,
  })),
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
  perdasAjustes: -1250.50,
};

const mockRealtime = {
  totalMovimentacoes: 100,
  pickingPendente: 3,
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

// Default mock resolver for all 8 API endpoints
function defaultApiFetchMock(url: string) {
  if (url === '/dashboards/kpis') return Promise.resolve(mockKpis);
  if (url === '/dashboards/realtime') return Promise.resolve(mockRealtime);
  if (url === '/dashboards/accuracy') return Promise.resolve(mockAccuracy);
  if (url === '/dashboards/otif') return Promise.resolve(mockOtif);
  if (url === '/dashboards/occupation') return Promise.resolve({ totalGlobal: { percentual: 75 } });
  if (url === '/dashboards/kpi/ruptures') return Promise.resolve(mockRuptures);
  if (url === '/dashboards/kpi/dead-stock') return Promise.resolve(mockDeadStock);
  if (url === '/dashboards/kpi/shrinkage') return Promise.resolve(mockShrinkage);
  return Promise.resolve({});
}

describe('DashboardPage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { hasRole } = require('@/lib/auth');
    hasRole.mockReturnValue(true);
  });

  it('renders loading state initially', async () => {
    // Mock that never resolves so loading stays true
    (api.apiFetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    await act(async () => {
      render(<DashboardPage />);
    });

    expect(screen.getByText('Carregando KPIs...')).toBeInTheDocument();
  });

  it('renders KPIs and Realtime data after fetch', async () => {
    (api.apiFetch as jest.Mock).mockImplementation(defaultApiFetchMock);

    await act(async () => {
      render(<DashboardPage />);
    });

    await waitFor(() => {
      expect(screen.queryByText('Carregando KPIs...')).not.toBeInTheDocument();
    });

    // Consolidated KPIs
    expect(screen.getByText('98%')).toBeInTheDocument(); // acuracia
    expect(screen.getByText('95%')).toBeInTheDocument(); // otif
    expect(screen.getByText('75%')).toBeInTheDocument(); // occupation
    expect(screen.getByText('3')).toBeInTheDocument();   // pickingPendente
    expect(screen.getByText('12')).toBeInTheDocument();  // totalRecontagens

    // Detailed KPIs
    expect(screen.getByText('2')).toBeInTheDocument();   // rupturas
    expect(screen.getByText('5')).toBeInTheDocument();   // dead stock
    expect(screen.getByText(/1\.250,50/)).toBeInTheDocument(); // shrinkage formatted
  });

  it('renders positive empty states when 0 rupturas or dead stock', async () => {
    (api.apiFetch as jest.Mock).mockImplementation((url: string) => {
      if (url === '/dashboards/realtime') return Promise.resolve(mockRealtime);
      if (url === '/dashboards/accuracy') return Promise.resolve(mockAccuracy);
      if (url === '/dashboards/otif') return Promise.resolve(mockOtif);
      if (url === '/dashboards/occupation') return Promise.resolve({ totalGlobal: { percentual: 75 } });
      if (url === '/dashboards/kpi/ruptures') return Promise.resolve({ rupturasCurvaA: 0 });
      if (url === '/dashboards/kpi/dead-stock') return Promise.resolve({ parados90Dias: 0 });
      if (url === '/dashboards/kpi/shrinkage') return Promise.resolve(mockShrinkage);
      return Promise.resolve({});
    });

    await act(async () => {
      render(<DashboardPage />);
    });

    await waitFor(() => {
      expect(screen.queryByText('Carregando KPIs...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Nenhuma ruptura de Curva A no momento')).toBeInTheDocument();
    expect(screen.getByText('Estoque circulando de forma saudável')).toBeInTheDocument();
    expect(screen.getByText('Baseado em saldo contábil — não reflete disponibilidade física imediata')).toBeInTheDocument();
  });

  it('redirects with toast if user lacks GESTOR or ADMIN role', async () => {
    const { hasRole } = require('@/lib/auth');
    hasRole.mockReturnValue(false);

    const dispatchEventSpy = jest.spyOn(window, 'dispatchEvent');

    await act(async () => {
      render(<DashboardPage />);
    });

    expect(mockPush).toHaveBeenCalledWith('/');

    const customToastEvent = dispatchEventSpy.mock.calls.find(
      (call) => call[0].type === 'custom-toast',
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

      (api.apiFetch as jest.Mock).mockImplementation(() => Promise.resolve({}));

      await act(async () => {
        render(<DashboardPage />);
      });

      // Wait for initial fetch
      await waitFor(() => {
        expect(api.apiFetch).toHaveBeenCalledTimes(8);
      });

      jest.clearAllMocks();

      // Fast-forward 30 seconds
      await act(async () => {
        jest.advanceTimersByTime(30000);
      });
      expect(api.apiFetch).toHaveBeenCalledTimes(8);

      // Fast-forward another 30 seconds
      await act(async () => {
        jest.advanceTimersByTime(30000);
      });
      expect(api.apiFetch).toHaveBeenCalledTimes(16);
    });

    it('clears interval on unmount to prevent memory leaks', async () => {
      const { hasRole } = require('@/lib/auth');
      hasRole.mockReturnValue(true);
      (api.apiFetch as jest.Mock).mockImplementation(() => Promise.resolve({}));

      let unmount: () => void;
      await act(async () => {
        const result = render(<DashboardPage />);
        unmount = result.unmount;
      });

      await waitFor(() => {
        expect(api.apiFetch).toHaveBeenCalledTimes(8);
      });
      jest.clearAllMocks();

      unmount!();

      await act(async () => {
        jest.advanceTimersByTime(30000);
      });

      expect(api.apiFetch).not.toHaveBeenCalled();
    });
  });
});
