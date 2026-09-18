export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
}

export interface ApiErrorData {
  message?: string | string[];
}

export interface AuthUser {
  id: number;
  nome: string;
  email: string;
  perfil: 'ADMIN' | 'GESTOR' | 'CONTROLADORIA' | 'OPERADOR';
}

export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

export const setUser = (user: AuthUser): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user', JSON.stringify(user));
  }
};

export const getUser = (): AuthUser | null => {
  if (typeof window === 'undefined') return null;

  const value = localStorage.getItem('user');
  if (!value) return null;

  try {
    return JSON.parse(value) as AuthUser;
  } catch {
    return null;
  }
};

export const removeUser = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user');
  }
};

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function apiFetch<T = any>(
  endpoint: string,
  options: FetchOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  let url = `${API_URL}${endpoint}`;
  if (options.params) {
    const searchParams = new URLSearchParams(options.params);
    url += `?${searchParams.toString()}`;
  }

  const response = await fetch(url, { 
    ...options, 
    headers,
    credentials: 'include' // Envia os cookies (JWT) automaticamente
  });
  
  if (response.status === 401) {
    removeUser();
    // Emite evento customizado para o layout exibir o aviso antes de redirecionar
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('api-error', {
        detail: { status: 401, message: 'Sua sessão expirou, faça login novamente' }
      }));
    }
    throw new Error('Sessão expirada');
  }

  if (response.status === 429) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('api-error', {
        detail: { status: 429, message: 'Muitas requisições. Aguarde um instante.' }
      }));
    }
    throw new Error('Rate limit atingido');
  }

  if (!response.ok) {
    const errorData = (await response.json().catch(() => null)) as ApiErrorData | null;
    const msg = Array.isArray(errorData?.message)
      ? errorData.message.join(', ')
      : errorData?.message;
    throw new Error(msg || `Erro HTTP ${response.status}`);
  }

  const data = (await response.json()) as T;
  
  // Mitigação (Risco 4): Impede que o frontend armazene acidentalmente o token (Supply Chain / XSS risk)
  // O token vaza via Payload por causa de coletores Zebra (ADR-0009). 
  // Na Web, o tráfego é autenticado exclusivamente via cookie httpOnly.
  if (data && typeof data === 'object' && 'accessToken' in (data as Record<string, unknown>)) {
    delete (data as Record<string, unknown>).accessToken;
  }
  
  return data;
}
