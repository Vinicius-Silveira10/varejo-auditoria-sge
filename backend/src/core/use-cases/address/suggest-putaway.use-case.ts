import { IAddressRepository } from '../../interfaces/repositories/i-address.repository';
import { IProductRepository } from '../../interfaces/repositories/i-product.repository';
import { Endereco } from '@prisma/client';

export interface SuggestPutawayRequest {
  produtoId: number;
  quantidade: number;
}

export interface PutawaySuggestion {
  enderecoId: number;
  codigo: string;
  zona: string;
  tipoZona: string;
  espacoDisponivel: number;
  score: number; // Pontuação de prioridade (maior = melhor)
}

export interface SuggestPutawayResult {
  produtoId: number;
  perecivel: boolean;
  tipoZonaRequerida: string;
  sugestoes: PutawaySuggestion[];
}

export class SuggestPutawayUseCase {
  constructor(
    private readonly addressRepository: IAddressRepository,
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(request: SuggestPutawayRequest): Promise<SuggestPutawayResult> {
    // 1. Buscar produto para determinar zona térmica requerida
    const produto = await this.productRepository.findById(request.produtoId);

    if (!produto) {
      throw new Error(`RN-ARM-002: Produto com ID ${request.produtoId} não encontrado.`);
    }

    if (!produto.ativo) {
      throw new Error('RN-ARM-002: Produto desativado não pode ser endereçado.');
    }

    // RN-ARM-003: Determinar zona térmica compatível
    const tipoZonaRequerida = produto.perecivel ? 'REFRIGERADO' : 'SECO';

    // 2. Buscar endereços disponíveis na zona compatível
    const enderecos = await this.addressRepository.findAvailableByZona(tipoZonaRequerida);

    // 3. Filtrar e pontuar endereços com capacidade suficiente (RN-ARM-001/004)
    const sugestoes: PutawaySuggestion[] = enderecos
      .filter((endereco) => {
        const espacoDisponivel = endereco.capacidade - endereco.ocupado;
        return espacoDisponivel >= request.quantidade;
      })
      .map((endereco) => {
        const espacoDisponivel = endereco.capacidade - endereco.ocupado;

        // Score: priorizar endereços com MENOS espaço disponível (consolidação de estoque)
        // Mas que ainda comportem a quantidade solicitada
        const taxaOcupacao = endereco.ocupado / endereco.capacidade;
        const score = Math.round(taxaOcupacao * 100);

        return {
          enderecoId: endereco.id,
          codigo: endereco.codigo,
          zona: endereco.zona,
          tipoZona: endereco.tipoZona,
          espacoDisponivel,
          score,
        };
      })
      .sort((a, b) => b.score - a.score); // Maior score = melhor (mais consolidado)

    // Limitar a 5 sugestões
    const topSugestoes = sugestoes.slice(0, 5);

    // Se perecível e não encontrou zona REFRIGERADO, tentar CONGELADO como fallback
    if (produto.perecivel && topSugestoes.length === 0) {
      const congelados = await this.addressRepository.findAvailableByZona('CONGELADO');
      const fallback = congelados
        .filter((e) => (e.capacidade - e.ocupado) >= request.quantidade)
        .map((endereco) => ({
          enderecoId: endereco.id,
          codigo: endereco.codigo,
          zona: endereco.zona,
          tipoZona: endereco.tipoZona,
          espacoDisponivel: endereco.capacidade - endereco.ocupado,
          score: Math.round((endereco.ocupado / endereco.capacidade) * 100),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      return {
        produtoId: request.produtoId,
        perecivel: produto.perecivel,
        tipoZonaRequerida,
        sugestoes: fallback,
      };
    }

    return {
      produtoId: request.produtoId,
      perecivel: produto.perecivel,
      tipoZonaRequerida,
      sugestoes: topSugestoes,
    };
  }
}
