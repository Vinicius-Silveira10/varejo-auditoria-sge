import { IAddressRepository } from '../../interfaces/repositories/i-address.repository';
import { IProductRepository } from '../../interfaces/repositories/i-product.repository';
import { Endereco } from '@prisma/client';
import { DomainException, NotFoundException } from '../../exceptions/domain.exception';

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

/**
 * Resultado da sugestão de endereçamento (putaway) para um produto.
 *
 * Retornado pelo endpoint `GET /addresses/suggest-putaway`.
 *
 * @remarks
 * Quando não há endereços disponíveis na zona térmica requerida para um produto
 * perecível, o campo `sugestoes` virá vazio e o campo `aviso` será preenchido
 * com a justificativa do bloqueio (RN-ARM-003). Não há fallback automático para
 * zonas alternativas — a decisão deve ser tomada pelo operador com supervisão.
 */
export interface SuggestPutawayResult {
  produtoId: number;
  perecivel: boolean;
  tipoZonaRequerida: string;
  sugestoes: PutawaySuggestion[];
  /**
   * Mensagem de alerta preenchida quando não há endereços disponíveis na zona
   * térmica requerida para o produto (ex.: perecível sem espaço REFRIGERADO).
   *
   * Quando este campo vier preenchido, `sugestoes` estará vazio.
   * O front-end deve exibir esta mensagem como alerta/toast para o operador.
   *
   * @example "RN-ARM-003: Nenhum endereço REFRIGERADO disponível. Produto perecível não pode ser armazenado em zona alternativa sem autorização."
   */
  aviso?: string;
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
      throw new NotFoundException(
        `RN-ARM-002: Produto com ID ${request.produtoId} não encontrado.`,
      );
    }

    if (!produto.ativo) {
      throw new DomainException(
        'RN-ARM-002: Produto desativado não pode ser endereçado.',
      );
    }

    // RN-ARM-003: Determinar zona térmica compatível
    const tipoZonaRequerida = (produto as any).tipoZonaRequerida;

    // 2. Buscar endereços disponíveis na zona compatível
    const enderecos =
      await this.addressRepository.findAvailableByZona(tipoZonaRequerida);

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
        let score = Math.round(taxaOcupacao * 100);

        // Se o produto for da Curva A, priorizar a zona "A" (endereço rápido) (GAP-008)
        if (
          (produto as any).curvaAbc === 'A' &&
          (endereco.zona.toUpperCase() === 'A' ||
            endereco.zona.toUpperCase().startsWith('A'))
        ) {
          score += 1000;
        }

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

    // Se perecível e não encontrou zona adequada, NÃO há fallback — operador deve ser alertado
    if (produto.perecivel && topSugestoes.length === 0) {
      return {
        produtoId: request.produtoId,
        perecivel: produto.perecivel,
        tipoZonaRequerida,
        sugestoes: [],
        aviso: `RN-ARM-003: Nenhum endereço ${tipoZonaRequerida} disponível. Produto perecível não pode ser armazenado em zona alternativa sem autorização.`,
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
