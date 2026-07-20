export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// TODO: Technical Debt - Migrar armazenamento de token do localStorage para cookie httpOnly
// em sprints futuras por questões de segurança (XSS).
export const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

export const setToken = (token: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token);
  }
};

export const removeToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
  }
};

export const setUser = (user: any) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user', JSON.stringify(user));
  }
};

export const getUser = () => {
  if (typeof window !== 'undefined') {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }
  return null;
};

export const removeUser = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user');
  }
};

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

export async function apiFetch(endpoint: string, options: FetchOptions = {}) {
  const token = getToken();
  
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  let url = `${API_URL}${endpoint}`;
  if (options.params) {
    const searchParams = new URLSearchParams(options.params);
    url += `?${searchParams.toString()}`;
  }

  try {
    const response = await fetch(url, { ...options, headers });
    
    if (response.status === 401) {
      removeToken();
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
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || `Erro HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    throw error;
  }
}
