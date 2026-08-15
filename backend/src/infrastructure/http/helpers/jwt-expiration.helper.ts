/**
 * jwt-expiration.helper.ts
 *
 * Validação leve do formato de JWT_EXPIRATION.
 *
 * Formatos aceitos pela lib `jsonwebtoken` (usada internamente pelo @nestjs/jwt):
 *   - Número inteiro em segundos como string: /^\d+$/ (ex: "3600", "86400")
 *   - String com sufixo de unidade de tempo: /^\d+[smhd]$/ (ex: "15m", "1h", "7d", "3600s")
 *
 * Referência: https://github.com/vercel/ms#readme (lib `ms` usada pelo jsonwebtoken)
 *
 * Se o formato não bater com nenhum dos dois padrões, a função retorna o fallback '1d'
 * e emite um aviso no console. NÃO é fail-loud porque JWT_EXPIRATION não é segredo de
 * segurança — mas um valor mal formatado faz o jsonwebtoken ignorar o expiresIn
 * silenciosamente, emitindo tokens sem expiração. O warn torna isso visível.
 */

// Aceita: "3600" (segundos puros) OU "15m"/"1h"/"7d"/"3600s" (sufixo de unidade)
const JWT_EXPIRATION_REGEX = /^(\d+|\d+[smhd])$/;
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
