import { Injectable, ForbiddenException } from '@nestjs/common';

/**
 * Guard de retenção de dados (RN-REL-003).
 * Impede a exclusão programática de registros de auditoria
 * com menos de 5 anos de idade.
 */
@Injectable()
export class RetentionGuard {
  private static readonly RETENTION_YEARS = 5;

  /**
   * Verifica se um registro pode ser purgado com base na sua data de criação.
   * @throws ForbiddenException se o registro estiver dentro do período de retenção.
   */
  static assertPurgeable(criadoEm: Date): void {
    const now = new Date();
    const retentionLimit = new Date(now);
    retentionLimit.setFullYear(retentionLimit.getFullYear() - RetentionGuard.RETENTION_YEARS);

    if (criadoEm > retentionLimit) {
      throw new ForbiddenException(
        `RN-REL-003: Registro protegido por política de retenção (${RetentionGuard.RETENTION_YEARS} anos). Purge bloqueado.`,
      );
    }
  }

  /**
   * Retorna a data limite para purge (registros anteriores a esta data podem ser removidos).
   */
  static getRetentionCutoffDate(): Date {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - RetentionGuard.RETENTION_YEARS);
    return cutoff;
  }
}
