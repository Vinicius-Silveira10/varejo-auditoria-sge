import { resolveJwtExpiration } from './jwt-expiration.helper';

describe('resolveJwtExpiration', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  // ─── Casos válidos ───────────────────────────────────────────────────────────

  it('aceita segundos (ex: "3600s")', () => {
    expect(resolveJwtExpiration('3600s')).toBe('3600s');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('aceita minutos (ex: "15m")', () => {
    expect(resolveJwtExpiration('15m')).toBe('15m');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('aceita horas (ex: "1h")', () => {
    expect(resolveJwtExpiration('1h')).toBe('1h');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('aceita dias (ex: "7d")', () => {
    expect(resolveJwtExpiration('7d')).toBe('7d');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  // ─── Ausência da variável → fallback silencioso ──────────────────────────────

  it('retorna fallback "1d" quando undefined (variável não definida)', () => {
    expect(resolveJwtExpiration(undefined)).toBe('1d');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('retorna fallback "1d" quando string vazia', () => {
    expect(resolveJwtExpiration('')).toBe('1d');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  // ─── Formato inválido → fallback COM aviso no log ────────────────────────────

  it('retorna fallback "1d" e emite warn quando formato não tem sufixo de unidade (ex: "3600")', () => {
    const result = resolveJwtExpiration('3600');
    expect(result).toBe('1d');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('JWT_EXPIRATION="3600"'));
  });

  it('retorna fallback "1d" e emite warn quando sufixo é inválido (ex: "1w")', () => {
    const result = resolveJwtExpiration('1w');
    expect(result).toBe('1d');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('JWT_EXPIRATION="1w"'));
  });

  it('retorna fallback "1d" e emite warn quando valor é texto livre (ex: "um dia")', () => {
    const result = resolveJwtExpiration('um dia');
    expect(result).toBe('1d');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('JWT_EXPIRATION="um dia"'));
  });

  it('retorna fallback "1d" e emite warn quando formato tem espaço (ex: "1 d")', () => {
    // Espaço é o erro mais comum ao copiar de documentação
    const result = resolveJwtExpiration('1 d');
    expect(result).toBe('1d');
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('o warn menciona o fallback utilizado', () => {
    resolveJwtExpiration('bad');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('"1d"'));
  });
});
