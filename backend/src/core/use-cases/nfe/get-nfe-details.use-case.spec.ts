import { GetNotaFiscalDetailsUseCase } from './get-nfe-details.use-case';
import { INotaFiscalRepository } from '../../interfaces/repositories/i-nota-fiscal.repository';

describe('GetNotaFiscalDetailsUseCase', () => {
  let useCase: GetNotaFiscalDetailsUseCase;
  let nfeRepository: jest.Mocked<INotaFiscalRepository>;

  beforeEach(() => {
    nfeRepository = {
      create: jest.fn(),
      findByChaveAcesso: jest.fn(),
      updateStatus: jest.fn(),
      findById: jest.fn(),
    } as any;

    useCase = new GetNotaFiscalDetailsUseCase(nfeRepository);
  });

  it('deve retornar detalhes da nota fiscal', async () => {
    const mockNfe = { id: 1, chaveAcesso: '123', itensNfe: [] } as any;
    nfeRepository.findById.mockResolvedValue(mockNfe);

    const result = await useCase.execute(1);

    expect(result.id).toBe(1);
    expect(nfeRepository.findById).toHaveBeenCalledWith(1);
  });

  it('deve lançar erro se não encontrar a nota', async () => {
    nfeRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(999)).rejects.toThrow('Nota Fiscal com ID 999 não encontrada');
  });
});
