import { IMovementRepository } from '../../interfaces/repositories/i-movement.repository';
import { ILogCustoRepository } from '../../interfaces/repositories/i-log-custo.repository';
import * as crypto from 'crypto';

export class ExportAuditCsvUseCase {
  constructor(
    private readonly movementRepo: IMovementRepository,
    private readonly logCustoRepo: ILogCustoRepository,
  ) {}

  async execute(): Promise<string> {
    const salt = 'SGE_SALT_LGPD_2026';

    const [movements, costLogs] = await Promise.all([
      this.movementRepo.findAllOrdered(),
      this.logCustoRepo.findAllOrdered(),
    ]);

    const csvRows: string[] = [];
    csvRows.push('TipoLog,Data,TargetId,Quantidade,CustoMedio,UsuarioAnonimizado,Hash,HashAnterior');

    // Mapear movimentações
    for (const m of movements) {
      const userRaw = (m as any).usuario?.email || `USER_ID_${m.usuarioId}`;
      const userHash = crypto.createHash('sha256').update(userRaw + salt).digest('hex').substring(0, 16);

      const row = [
        `MOVIMENTACAO_${m.tipo}`,
        m.criadoEm.toISOString(),
        `Lote ${m.loteId}`,
        m.quantidade,
        'n/a',
        userHash,
        m.hash,
        m.previousHash || '',
      ].join(',');
      csvRows.push(row);
    }

    // Mapear logs de custos
    for (const c of costLogs) {
      const createdTime = c.criadoEm ? c.criadoEm.toISOString() : new Date().toISOString();
      const row = [
        'CUSTO_UPDATE',
        createdTime,
        `Produto ${c.produtoId}`,
        c.quantidadeNova,
        c.custoNovo,
        'SISTEMA',
        c.hash,
        c.previousHash || '',
      ].join(',');
      csvRows.push(row);
    }

    return csvRows.join('\n');
  }
}
