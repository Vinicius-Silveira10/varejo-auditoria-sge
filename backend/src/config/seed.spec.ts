/**
 * seed.spec.ts
 *
 * Testa o comportamento do seed diferenciado por ambiente (ADR-0008, Decisão 3).
 *
 * Estratégia: o seed.ts usa o PrismaClient real, o que torna difícil
 * testá-lo diretamente sem banco. Por isso extraímos a lógica de
 * resolução de senha para uma função pura (resolveSeedPassword) que pode
 * ser testada em isolamento — mesmo padrão da extração de RN-AJU-004 (ADR-0006).
 *
 * A função resolveSeedPassword() é o contrato que o teste garante.
 * O seed.ts importa e chama essa função.
 */

import { resolveSeedPassword } from './seed-password';

describe('resolveSeedPassword() — Decisão 3 (ADR-0008)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ─── Ambientes fora de dev (staging / production) ─────────────────────────

  it('[RED→GREEN] FALHA explicitamente em staging quando SEED_ADMIN_PASSWORD está ausente', () => {
    process.env.NODE_ENV = 'staging';
    delete process.env.SEED_ADMIN_PASSWORD;

    expect(() => resolveSeedPassword()).toThrow('SEED_ADMIN_PASSWORD');
  });

  it('[RED→GREEN] FALHA explicitamente em production quando SEED_ADMIN_PASSWORD está ausente', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.SEED_ADMIN_PASSWORD;

    expect(() => resolveSeedPassword()).toThrow('SEED_ADMIN_PASSWORD');
  });

  it('[RED→GREEN] FALHA se NODE_ENV for um valor desconhecido (não dev) e senha estiver ausente', () => {
    process.env.NODE_ENV = 'homologacao';
    delete process.env.SEED_ADMIN_PASSWORD;

    expect(() => resolveSeedPassword()).toThrow('SEED_ADMIN_PASSWORD');
  });

  it('retorna SEED_ADMIN_PASSWORD quando fornecida em staging', () => {
    process.env.NODE_ENV = 'staging';
    process.env.SEED_ADMIN_PASSWORD = 'SenhaForteDeStagingR@ndom!2026';

    const result = resolveSeedPassword();
    expect(result.password).toBe('SenhaForteDeStagingR@ndom!2026');
    expect(result.isDev).toBe(false);
  });

  it('retorna SEED_ADMIN_PASSWORD quando fornecida em production', () => {
    process.env.NODE_ENV = 'production';
    process.env.SEED_ADMIN_PASSWORD = 'SenhaFortaDeProducaoSuperSecreta!';

    const result = resolveSeedPassword();
    expect(result.password).toBe('SenhaFortaDeProducaoSuperSecreta!');
    expect(result.isDev).toBe(false);
  });

  it('NUNCA usa a senha hardcoded fora de dev mesmo que SEED_ADMIN_PASSWORD seja igual a ela', () => {
    process.env.NODE_ENV = 'staging';
    process.env.SEED_ADMIN_PASSWORD = 'SenhaSegura123!'; // coincide com a padrão — mas vem do env

    const result = resolveSeedPassword();
    // O que importa é que o valor veio do env, não que está hardcoded
    expect(result.password).toBe('SenhaSegura123!');
    expect(result.isDev).toBe(false);
  });

  // ─── Ambiente de desenvolvimento ──────────────────────────────────────────

  it('[RED→GREEN] funciona em development SEM SEED_ADMIN_PASSWORD, usando senha padrão', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.SEED_ADMIN_PASSWORD;

    // Não deve lançar
    const result = resolveSeedPassword();
    expect(result.password).toBe('SenhaSegura123!');
    expect(result.isDev).toBe(true);
  });

  it('funciona quando NODE_ENV está ausente (assume development)', () => {
    delete process.env.NODE_ENV;
    delete process.env.SEED_ADMIN_PASSWORD;

    const result = resolveSeedPassword();
    expect(result.password).toBe('SenhaSegura123!');
    expect(result.isDev).toBe(true);
  });

  it('em dev: SEED_ADMIN_PASSWORD sobrescreve a senha padrão quando fornecida', () => {
    process.env.NODE_ENV = 'development';
    process.env.SEED_ADMIN_PASSWORD = 'SenhaDev123Customizada';

    // Mesmo em dev, se a variável estiver definida, ela tem prioridade
    const result = resolveSeedPassword();
    expect(result.password).toBe('SenhaDev123Customizada');
    expect(result.isDev).toBe(true);
  });
});
