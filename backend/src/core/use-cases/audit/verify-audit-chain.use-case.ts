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

export interface IPaginatedRepository {
  findPaginatedOrdered(skip: number, take: number): Promise<AuditRecord[]>;
  countAll(): Promise<number>;
}

export class VerifyAuditChainUseCase {
  constructor(private readonly hashService: HashService) {}

  async verify(
    tabela: string,
    repository: IPaginatedRepository,
  ): Promise<AuditVerificationResult> {
    const falhas: AuditFailure[] = [];
    const chunkSize = 1000;
    const totalRegistros = await repository.countAll();
    
    let lastHash: string | null = null;

    for (let skip = 0; skip < totalRegistros; skip += chunkSize) {
      const records = await repository.findPaginatedOrdered(skip, chunkSize);

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        
        const expectedPreviousHash = i === 0 ? lastHash : records[i - 1].hash ?? null;

        // Extrai os campos de dados (sem id, hash, previousHash, criadoEm, atualizadoEm)
        const { id, hash, previousHash, criadoEm, atualizadoEm, ...payload } = record;

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
      } // Fim do loop de registros do chunk
      
      if (records.length > 0) {
        lastHash = records[records.length - 1].hash ?? null;
      }
    } // Fim do loop de paginação

    return {
      tabela,
      totalRegistros,
      integridadeOk: falhas.length === 0,
      falhas,
    };
  }
}
