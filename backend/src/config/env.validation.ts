/**
 * env.validation.ts
 *
 * Módulo central de validação de variáveis de ambiente.
 * Deve ser invocado como o PRIMEIRO passo do bootstrap da aplicação.
 *
 * Filosofia: "Fail loud, fail early."
 * A aplicação NÃO DEVE subir com configuração ausente usando um valor silencioso
 * de desenvolvimento. Cada variável obrigatória deve estar explicitamente definida
 * no ambiente de execução. Caso contrário, o processo encerra com código 1 e uma
 * mensagem de erro clara.
 */

interface ValidatedEnv {
  DATABASE_URL: string;
  JWT_SECRET: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
  PORT: number;
  ALLOWED_ORIGINS: string[];
}

/**
 * Valida e retorna todas as variáveis de ambiente obrigatórias.
 * Lança um erro explícito se qualquer variável crítica estiver ausente.
 *
 * @throws {Error} Se qualquer variável de ambiente obrigatória não estiver definida.
 */
export function validateEnv(): ValidatedEnv {
  const missing: string[] = [];

  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) missing.push('DATABASE_URL');

  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) missing.push('JWT_SECRET');

  if (missing.length > 0) {
    throw new Error(
      `\n\n❌ ERRO CRÍTICO DE CONFIGURAÇÃO — A aplicação não pode ser iniciada.\n` +
      `As seguintes variáveis de ambiente obrigatórias não estão definidas:\n` +
      missing.map((v) => `  - ${v}`).join('\n') +
      `\n\nCopie o arquivo .env.example para .env e preencha todos os valores.\n`,
    );
  }

  // Variáveis com padrão operacional aceitável (não são segredos)
  const REDIS_HOST = process.env.REDIS_HOST ?? 'localhost';
  const REDIS_PORT = Number(process.env.REDIS_PORT ?? 6379);
  const PORT = Number(process.env.PORT ?? 3000);

  // ALLOWED_ORIGINS: lista separada por vírgulas. Ex.: "http://localhost:3000,https://staging.meuapp.com"
  const originsRaw = process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000';
  const ALLOWED_ORIGINS = originsRaw.split(',').map((o) => o.trim()).filter(Boolean);

  return {
    DATABASE_URL: DATABASE_URL!,
    JWT_SECRET: JWT_SECRET!,
    REDIS_HOST,
    REDIS_PORT,
    PORT,
    ALLOWED_ORIGINS,
  };
}
