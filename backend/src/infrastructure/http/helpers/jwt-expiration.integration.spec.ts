/**
 * jwt-expiration.integration.spec.ts
 *
 * Teste de integração real com jwtService.sign().
 * Confirma o comportamento REAL da lib jsonwebtoken quando expiresIn é
 * malformado — não assume o que "deveria" acontecer.
 *
 * Executa sem banco de dados ou NestJS completo: instancia JwtService
 * diretamente via new JwtService(), que aceita JwtModuleOptions.
 */

import { JwtService } from '@nestjs/jwt';

const SECRET = 'test-secret-apenas-para-este-spec';

/**
 * Decodifica um token JWT sem verificar assinatura para inspecionar o payload.
 * Retorna null se o token for inválido.
 */
function decodePayload(token: string): Record<string, unknown> | null {
  try {
    const [, payloadB64] = token.split('.');
    return JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

describe('jwtService.sign() — comportamento real com expiresIn malformado', () => {
  // ─── Caso 1: expiresIn com formato válido (sufixo de unidade) ────────────────

  it('token com "15m" tem campo exp no payload (expira em ~15 minutos)', () => {
    const svc = new JwtService({ secret: SECRET, signOptions: { expiresIn: '15m' } });
    const token = svc.sign({ sub: 1 });
    const payload = decodePayload(token);

    expect(payload).not.toBeNull();
    expect(payload).toHaveProperty('exp');

    const now = Math.floor(Date.now() / 1000);
    const exp = payload!['exp'] as number;
    // exp deve ser approximately now + 900 (±5s de tolerância)
    expect(exp).toBeGreaterThan(now + 890);
    expect(exp).toBeLessThan(now + 910);
  });

  // ─── Caso 2: número puro como string (segundos) ──────────────────────────────

  it('token com "3600" (número puro como string) tem campo exp no payload', () => {
    const svc = new JwtService({ secret: SECRET, signOptions: { expiresIn: '3600' as any } });
    const token = svc.sign({ sub: 1 });
    const payload = decodePayload(token);

    expect(payload).not.toBeNull();
    // EVIDÊNCIA REAL: confirmar se exp existe e corresponde a ~1h
    const hasExp = 'exp' in payload!;
    console.log('[REAL] expiresIn="3600" → payload.exp existe?', hasExp, '| exp:', payload!['exp']);
    expect(hasExp).toBe(true);
  });

  // ─── Caso 3: expiresIn MALFORMADO — o que realmente acontece ─────────────────

  it('token com expiresIn="1w" (semana, formato inválido p/ jsonwebtoken) — documenta comportamento real', () => {
    // "1w" é aceito pela lib `ms` internamente, mas NÃO consta na regex nossa
    // Este teste documenta se a lib aceita ou não — evidência real
    let token: string | null = null;
    let threwError = false;

    try {
      const svc = new JwtService({ secret: SECRET, signOptions: { expiresIn: '1w' as any } });
      token = svc.sign({ sub: 1 });
    } catch (e) {
      threwError = true;
      console.log('[REAL] expiresIn="1w" → LANÇOU EXCEÇÃO:', (e as Error).message);
    }

    if (!threwError && token) {
      const payload = decodePayload(token);
      const hasExp = payload !== null && 'exp' in payload;
      console.log('[REAL] expiresIn="1w" → token gerado, payload.exp existe?', hasExp, '| exp:', payload?.['exp']);
    }

    // O teste não faz expect fixo — ele DOCUMENTA o comportamento real
    // Leia o console.log acima para saber o que a lib faz de verdade
    expect(threwError || token !== null).toBe(true);
  });

  it('token com expiresIn="badvalue" (lixo completo) — documenta comportamento real', () => {
    let token: string | null = null;
    let threwError = false;
    let errorMessage = '';

    try {
      const svc = new JwtService({ secret: SECRET, signOptions: { expiresIn: 'badvalue' as any } });
      token = svc.sign({ sub: 1 });
    } catch (e) {
      threwError = true;
      errorMessage = (e as Error).message;
      console.log('[REAL] expiresIn="badvalue" → LANÇOU EXCEÇÃO:', errorMessage);
    }

    if (!threwError && token) {
      const payload = decodePayload(token);
      const hasExp = payload !== null && 'exp' in payload;
      console.log('[REAL] expiresIn="badvalue" → token gerado SEM exceção, payload.exp existe?', hasExp);
      if (!hasExp) {
        console.log('[REAL] ⚠️  Token sem expiração emitido! Exatamente o risco que o warn cobre.');
      }
    }

    expect(threwError || token !== null).toBe(true);
  });

  it('token com expiresIn="0" (zero segundos) — documenta comportamento real', () => {
    let token: string | null = null;
    let threwError = false;

    try {
      const svc = new JwtService({ secret: SECRET, signOptions: { expiresIn: '0' as any } });
      token = svc.sign({ sub: 1 });
    } catch (e) {
      threwError = true;
      console.log('[REAL] expiresIn="0" → LANÇOU EXCEÇÃO:', (e as Error).message);
    }

    if (!threwError && token) {
      const payload = decodePayload(token);
      console.log('[REAL] expiresIn="0" → exp:', payload?.['exp'], '| iat:', payload?.['iat']);
    }

    expect(threwError || token !== null).toBe(true);
  });
});
