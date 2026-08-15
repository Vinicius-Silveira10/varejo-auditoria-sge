/**
 * jwt-expiration.helper.ts
 *
 * Validação leve do formato de JWT_EXPIRATION.
 *
 * Formatos aceitos pela lib `jsonwebtoken` (usada internamente pelo @nestjs/jwt):
 *   - String com sufixo de unidade de tempo: /^\d+[smhd]$/ (ex: "15m", "1h", "7d", "3600s")
 *   - Número inteiro em segundos (ex: 3600) — não aplicável aqui pois a variável de env é sempre string
 *
 * Se o formato não bater, a função retorna o fallback '1d' e emite um aviso no console.
 * NÃO é fail-loud (não lança exceção) porque JWT_EXPIRATION não é segredo de segurança —
 * um valor mal formatado resulta em tokens que nunca expiram (padrão do jsonwebtoken),
 * o que é indesejável mas não constitui falha crítica de segurança.
 */

const JWT_EXPIRATION_REGEX = /^\d+[smhd]$/;
const FALLBACK_EXPIRATION = '1d';

/**
 * Resolve e valida o valor de JWT_EXPIRATION.
 *
 * @param raw - Valor cru da variável de ambiente (pode ser undefined).
 * @returns Valor validado, pronto para ser passado ao JwtModule como `expiresIn`.
 */
export function resolveJwtExpiration(raw: string | undefined): string {
  if (raw === undefined || raw === '') {
    return FALLBACK_EXPIRATION;
  }

  if (!JWT_EXPIRATION_REGEX.test(raw)) {
    console.warn(
      `[AuthModule] JWT_EXPIRATION="${raw}" não bate com o formato esperado ` +
      `(/^\\d+[smhd]$/ — ex: 15m, 1h, 7d, 3600s). ` +
      `Usando fallback seguro: "${FALLBACK_EXPIRATION}". ` +
      `Corrija JWT_EXPIRATION no seu .env para silenciar este aviso.`,
    );
    return FALLBACK_EXPIRATION;
  }

  return raw;
}
