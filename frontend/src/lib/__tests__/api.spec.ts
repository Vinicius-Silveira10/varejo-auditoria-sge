import { apiFetch } from '../api';

describe('apiFetch', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('deve remover o accessToken da resposta por segurança contra XSS (Risk 4)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ user: { id: 1, email: 'admin@fortal.com.br' }, accessToken: 'secret-token-that-should-be-deleted' }),
    }) as any;

    const result = await apiFetch('/auth/login', { method: 'POST' });
    
    expect(result.user).toBeDefined();
    expect(result.user.email).toBe('admin@fortal.com.br');
    // A chave accessToken DEVE ter sido removida do payload devolvido aos componentes
    expect(result.accessToken).toBeUndefined();
  });
});
