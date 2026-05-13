import { INotaFiscalRepository } from '../../interfaces/repositories/i-nota-fiscal.repository';

export class GetNfeDivergencesUseCase {
  constructor(private readonly nfeRepository: INotaFiscalRepository) {}

  async execute() {
    const divergentNfes = await this.nfeRepository.findDivergent();
    
    return divergentNfes.map(nfe => ({
      id: nfe.id,
      chaveAcesso: nfe.chaveAcesso,
      numero: nfe.numero,
      serie: nfe.serie,
      dataEmissao: nfe.dataEmissao,
      valorTotal: nfe.valorTotal,
      divergencias: nfe.divergencias
    }));
  }
}
