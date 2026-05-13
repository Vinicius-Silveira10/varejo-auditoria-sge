import { IAddressRepository } from '../../interfaces/repositories/i-address.repository';

export interface OccupationZone {
  zona: string;
  capacidadeTotal: number;
  ocupacaoTotal: number;
  percentual: number;
}

export interface OccupationDashboard {
  porZona: OccupationZone[];
  totalGlobal: {
    capacidadeTotal: number;
    ocupacaoTotal: number;
    percentual: number;
  };
}

export class GetOccupationDashboardUseCase {
  constructor(private readonly addressRepo: IAddressRepository) {}

  async execute(): Promise<OccupationDashboard> {
    const aggregations = await this.addressRepo.aggregateOccupationByZone();

    if (aggregations.length === 0) {
      return {
        porZona: [],
        totalGlobal: { capacidadeTotal: 0, ocupacaoTotal: 0, percentual: 0 },
      };
    }

    let globalCap = 0;
    let globalOcu = 0;

    const porZona: OccupationZone[] = aggregations.map(agg => {
      globalCap += agg.capacidadeTotal;
      globalOcu += agg.ocupacaoTotal;
      
      return {
        zona: agg.tipoZona,
        capacidadeTotal: agg.capacidadeTotal,
        ocupacaoTotal: agg.ocupacaoTotal,
        percentual: agg.capacidadeTotal > 0 ? Math.round((agg.ocupacaoTotal / agg.capacidadeTotal) * 100) : 0,
      };
    });

    return {
      porZona,
      totalGlobal: {
        capacidadeTotal: globalCap,
        ocupacaoTotal: globalOcu,
        percentual: globalCap > 0 ? Math.round((globalOcu / globalCap) * 100) : 0,
      },
    };
  }
}
