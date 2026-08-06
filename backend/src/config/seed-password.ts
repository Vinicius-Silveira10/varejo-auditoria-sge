/**
 * seed-password.ts
 *
 * Função pura que resolve a senha de seed do banco de dados
 * com comportamento diferenciado por ambiente (ADR-0008, Decisão 3).
 *
 * Filosofia: "Fail loud in non-dev environments."
 *
 * Motivação para extração em módulo separado:
 *   A lógica de resolução de senha foi extraída do seed.ts para permitir
 *   testes unitários sem dependência do PrismaClient — mesmo padrão da
 *   extração de RN-AJU-004 (ADR-0006). O seed.ts importa e usa esta função.
 */

/** Senha padrão de conveniência para desenvolvimento local.
 *  NUNCA deve ser usada fora de development. */
const DEV_DEFAULT_PASSWORD = 'SenhaSegura123!';

export interface SeedPasswordResult {
  /** A senha em texto puro que será hasheada pelo seed */
  password: string;
  /** Indica se o ambiente é desenvolvimento (para exibir aviso) */
  isDev: boolean;
}

/**
 * Resolve a senha a ser usada no seed com base no ambiente.
 *
 * @returns SeedPasswordResult com a senha e flag de ambiente
 * @throws {Error} Se NODE_ENV não for 'development' e SEED_ADMIN_PASSWORD estiver ausente
 */
export function resolveSeedPassword(): SeedPasswordResult {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const isDev = nodeEnv === 'development';

  // SEED_ADMIN_PASSWORD tem prioridade em qualquer ambiente, incluindo dev
  if (process.env.SEED_ADMIN_PASSWORD) {
    return { password: process.env.SEED_ADMIN_PASSWORD, isDev };
  }

  // Em desenvolvimento sem SEED_ADMIN_PASSWORD: usa padrão com aviso
  if (isDev) {
    console.warn(
      '\n⚠️  AVISO DE SEGURANÇA — SEED EM MODO DESENVOLVIMENTO\n' +
      '   Usando senha padrão hardcoded: SenhaSegura123!\n' +
      '   Esta senha é conhecida publicamente e NÃO deve ser usada\n' +
      '   em nenhum ambiente além do desenvolvimento local.\n' +
      '   Para sobrescrever, defina SEED_ADMIN_PASSWORD no seu .env\n',
    );
    return { password: DEV_DEFAULT_PASSWORD, isDev: true };
  }

  // Fora de dev sem a variável: falha explícita (fail-loud)
  throw new Error(
    '\n\n❌ ERRO CRÍTICO DE SEED — Ambiente não-desenvolvimento detectado.\n' +
    `   NODE_ENV="${nodeEnv}" mas SEED_ADMIN_PASSWORD não está definida.\n` +
    '   O seed NÃO criará usuários com senha padrão conhecida em staging/produção.\n' +
    '\n' +
    '   Solução: injete SEED_ADMIN_PASSWORD como secret no seu pipeline antes\n' +
    '   de executar "npx prisma db seed".\n' +
    '   Exemplo: SEED_ADMIN_PASSWORD="SenhaForteAleatoria!" npx prisma db seed\n',
  );
}
