/**
 * env.validation.spec.ts
 *
 * Testa o comportamento de "fail loud" do módulo de validação de env.
 * Garantia: a aplicação NUNCA sobe silenciosamente com configuração ausente.
 */
import { validateEnv } from './env.validation';

describe('validateEnv()', () => {
  // Salva e restaura process.env para isolar cada teste
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ============================================================
  // GRUPO 1 — Variáveis obrigatórias ausentes → deve lançar erro
  // ============================================================

  it('[RED→GREEN] lança erro explícito quando DATABASE_URL está ausente', () => {
    delete process.env.DATABASE_URL;
    delete process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'uma-chave-forte-de-pelo-menos-64-caracteres-para-producao-real';

    expect(() => validateEnv()).toThrow('DATABASE_URL');
  });

  it('[RED→GREEN] lança erro explícito quando JWT_SECRET está ausente', () => {
    process.env.DATABASE_URL = 'postgresql://admin:pass@localhost:5432/db?schema=public';
    delete process.env.JWT_SECRET;

    expect(() => validateEnv()).toThrow('JWT_SECRET');
  });

  it('[RED→GREEN] lista TODAS as variáveis ausentes em uma única mensagem de erro', () => {
    delete process.env.DATABASE_URL;
    delete process.env.JWT_SECRET;

    expect(() => validateEnv()).toThrow(
      expect.objectContaining({
        message: expect.stringContaining('DATABASE_URL'),
      }),
    );
    expect(() => validateEnv()).toThrow(
      expect.objectContaining({
        message: expect.stringContaining('JWT_SECRET'),
      }),
    );
  });

  // ============================================================
  // GRUPO 2 — Configuração válida → retorna objeto tipado
  // ============================================================

  it('retorna objeto validado quando todas as variáveis obrigatórias estão presentes', () => {
    process.env.DATABASE_URL = 'postgresql://admin:pass@localhost:5432/db?schema=public';
    process.env.JWT_SECRET = 'uma-chave-forte-de-pelo-menos-64-caracteres-para-producao-real';
    process.env.REDIS_HOST = 'redis-server';
    process.env.REDIS_PORT = '6380';
    process.env.PORT = '4000';
    process.env.ALLOWED_ORIGINS = 'https://staging.app.com,https://app.com';

    const result = validateEnv();

    expect(result.DATABASE_URL).toBe('postgresql://admin:pass@localhost:5432/db?schema=public');
    expect(result.JWT_SECRET).toBe('uma-chave-forte-de-pelo-menos-64-caracteres-para-producao-real');
    expect(result.REDIS_HOST).toBe('redis-server');
    expect(result.REDIS_PORT).toBe(6380);
    expect(result.PORT).toBe(4000);
    expect(result.ALLOWED_ORIGINS).toEqual(['https://staging.app.com', 'https://app.com']);
  });

  it('usa defaults operacionais para variáveis opcionais quando ausentes', () => {
    process.env.DATABASE_URL = 'postgresql://admin:pass@localhost:5432/db?schema=public';
    process.env.JWT_SECRET = 'chave-forte';
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PORT;
    delete process.env.PORT;
    delete process.env.ALLOWED_ORIGINS;

    const result = validateEnv();

    expect(result.REDIS_HOST).toBe('localhost');
    expect(result.REDIS_PORT).toBe(6379);
    expect(result.PORT).toBe(3000);
    expect(result.ALLOWED_ORIGINS).toEqual(['http://localhost:3000']);
  });

  // ============================================================
  // GRUPO 3 — CORS: confirma que wildcard nunca é o padrão
  // ============================================================

  it('nunca retorna wildcard (*) como origem padrão', () => {
    process.env.DATABASE_URL = 'postgresql://admin:pass@localhost:5432/db?schema=public';
    process.env.JWT_SECRET = 'chave-forte';
    delete process.env.ALLOWED_ORIGINS;

    const result = validateEnv();

    expect(result.ALLOWED_ORIGINS).not.toContain('*');
  });
});
