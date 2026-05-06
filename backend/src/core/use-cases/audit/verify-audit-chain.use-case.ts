import { HashService } from '../../../infrastructure/security/hash.service';

export interface AuditRecord {
  id?: number;
  hash?: string;
  previousHash?: string | null;
  [key: string]: any;
}

export interface AuditVerificationResult {
  tabela: string;
  totalRegistros: number;
  integridadeOk: boolean;
  falhas: AuditFailure[];
}

export interface AuditFailure {
  registroId: number;
  hashArmazenado: string;
  hashRecalculado: string;
  previousHashArmazenado: string | null;
  previousHashEsperado: string | null;
}

export class VerifyAuditChainUseCase {
  constructor(private readonly hashService: HashService) {}

  async verify(
    tabela: string,
    records: AuditRecord[],
  ): Promise<AuditVerificationResult> {
    const falhas: AuditFailure[] = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const previousRecord = i > 0 ? records[i - 1] : null;

      // Extrai os campos de dados (sem id, hash, previousHash, criadoEm, atualizadoEm)
      const { id, hash, previousHash, criadoEm, atualizadoEm, ...payload } = record;

      // O previousHash esperado é o hash do registro anterior (ou null se for o primeiro)
      const expectedPreviousHash = previousRecord ? previousRecord.hash ?? null : null;

      // Recalcula o hash com o payload e o previousHash armazenado
      const recalculatedHash = this.hashService.generateHash(payload, expectedPreviousHash);

      const hashMatch = recalculatedHash === hash;
      const previousHashMatch = (previousHash ?? null) === expectedPreviousHash;

      if (!hashMatch || !previousHashMatch) {
        falhas.push({
          registroId: id ?? -1,
          hashArmazenado: hash ?? 'AUSENTE',
          hashRecalculado: recalculatedHash,
          previousHashArmazenado: previousHash ?? null,
          previousHashEsperado: expectedPreviousHash,
        });
      }
    }

    return {
      tabela,
      totalRegistros: records.length,
      integridadeOk: falhas.length === 0,
      falhas,
    };
  }
}
