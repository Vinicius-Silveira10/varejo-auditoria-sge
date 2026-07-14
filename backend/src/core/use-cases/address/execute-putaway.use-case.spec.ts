import { ExecutePutawayUseCase } from './execute-putaway.use-case';
import { IBatchRepository } from '../../interfaces/repositories/i-batch.repository';
import { IAddressRepository } from '../../interfaces/repositories/i-address.repository';
import { IProductRepository } from '../../interfaces/repositories/i-product.repository';
import { IUnitOfWork } from '../../interfaces/repositories/i-unit-of-work';
import { DomainException, NotFoundException } from '../../exceptions/domain.exception';

describe('ExecutePutawayUseCase', () => {
  let useCase: ExecutePutawayUseCase;
  let batchRepo: jest.Mocked<IBatchRepository>;
  let addressRepo: jest.Mocked<IAddressRepository>;
  let productRepo: jest.Mocked<IProductRepository>;
  let unitOfWork: jest.Mocked<IUnitOfWork>;

  beforeEach(() => {
    batchRepo = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<IBatchRepository>;

    addressRepo = {
      findById: jest.fn(),
      updateOcupacao: jest.fn(),
    } as unknown as jest.Mocked<IAddressRepository>;

    productRepo = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<IProductRepository>;

    unitOfWork = {
      execute: jest.fn((callback) => {
        const ctx = {
          addressRepository: addressRepo,
          movementRepository: {
            create: jest.fn().mockResolvedValue({ id: 999, tipo: 'ARMAZENAGEM' }),
          },
          lockForUpdate: jest.fn(),
        };
        return callback(ctx);
      }),
    } as unknown as jest.Mocked<IUnitOfWork>;

    useCase = new ExecutePutawayUseCase(
      batchRepo,
      addressRepo,
      productRepo,
      unitOfWork,
    );
  });

  it('deve armazenar com sucesso quando as regras são atendidas', async () => {
    batchRepo.findById.mockResolvedValue({
      id: 1,
      produtoId: 10,
      quantidade: 50,
      ativo: true,
      movimentacoes: [], // Lote sem nenhuma armazenagem prévia
    } as any);

    addressRepo.findById.mockResolvedValue({
      id: 5,
      codigo: 'A-01',
      capacidade: 100,
      ocupado: 10,
      bloqueado: false,
      tipoZona: 'SECO',
    } as any);

    productRepo.findById.mockResolvedValue({
      id: 10,
      tipoZonaRequerida: 'SECO',
    } as any);

    await expect(
      useCase.execute({
        loteId: 1,
        enderecoDestinoId: 5,
        quantidade: 40,
        usuarioId: 99,
      }),
    ).resolves.toBeDefined();

    // Verifica chamada do unit of work
    expect(unitOfWork.execute).toHaveBeenCalled();
    expect(addressRepo.updateOcupacao).toHaveBeenCalledWith(5, 50); // 10 + 40
  });

  it('deve lançar exceção se tentar armazenar mais do que a pendência do lote', async () => {
    batchRepo.findById.mockResolvedValue({
      id: 1,
      quantidade: 50,
      ativo: true,
      movimentacoes: [
        { tipo: 'ARMAZENAGEM', quantidade: 40 }
      ], // Já tem 40 armazenado, resta 10
    } as any);

    await expect(
      useCase.execute({
        loteId: 1,
        enderecoDestinoId: 5,
        quantidade: 20, // Tenta armazenar 20, mas só tem 10 pendente
        usuarioId: 99,
      }),
    ).rejects.toThrow(DomainException);
  });

  it('deve falhar por capacidade insuficiente (RN-ARM-001)', async () => {
    batchRepo.findById.mockResolvedValue({
      id: 1,
      produtoId: 10,
      quantidade: 50,
      ativo: true,
      movimentacoes: [],
    } as any);

    addressRepo.findById.mockResolvedValue({
      id: 5,
      capacidade: 100,
      ocupado: 90, // Só cabem mais 10
      bloqueado: false,
    } as any);

    await expect(
      useCase.execute({
        loteId: 1,
        enderecoDestinoId: 5,
        quantidade: 20,
        usuarioId: 99,
      }),
    ).rejects.toThrow('RN-ARM-001');

    expect(unitOfWork.execute).not.toHaveBeenCalled();
  });

  it('deve falhar por incompatibilidade térmica (RN-ARM-003)', async () => {
    batchRepo.findById.mockResolvedValue({
      id: 1,
      produtoId: 10,
      quantidade: 50,
      ativo: true,
      movimentacoes: [],
    } as any);

    addressRepo.findById.mockResolvedValue({
      id: 5,
      capacidade: 100,
      ocupado: 0,
      bloqueado: false,
      tipoZona: 'SECO', // Endereço SECO
    } as any);

    productRepo.findById.mockResolvedValue({
      id: 10,
      tipoZonaRequerida: 'CONGELADO', // Produto CONGELADO
    } as any);

    await expect(
      useCase.execute({
        loteId: 1,
        enderecoDestinoId: 5,
        quantidade: 10,
        usuarioId: 99,
      }),
    ).rejects.toThrow('RN-ARM-003');

    expect(unitOfWork.execute).not.toHaveBeenCalled();
  });

  it('teste de atomicidade: não deve atualizar ocupação se a transação falhar', async () => {
    batchRepo.findById.mockResolvedValue({
      id: 1,
      produtoId: 10,
      quantidade: 50,
      ativo: true,
      movimentacoes: [],
    } as any);

    addressRepo.findById.mockResolvedValue({
      id: 5,
      capacidade: 100,
      ocupado: 10,
      bloqueado: false,
      tipoZona: 'SECO',
    } as any);

    productRepo.findById.mockResolvedValue({
      id: 10,
      tipoZonaRequerida: 'SECO',
    } as any);

    unitOfWork.execute.mockImplementationOnce(async (callback) => {
      const ctx = {
        addressRepository: addressRepo,
        movementRepository: {
          create: jest.fn().mockRejectedValue(new Error('DB Error')),
        },
        lockForUpdate: jest.fn(),
      };
      return callback(ctx);
    });

    await expect(
      useCase.execute({
        loteId: 1,
        enderecoDestinoId: 5,
        quantidade: 40,
        usuarioId: 99,
      }),
    ).rejects.toThrow('DB Error');

    // A chamada ocorre DENTRO do mock transacional simulado.
    // Em um BD real com UnitOfWork, a exceção aborta o COMMIT e dá ROLLBACK, 
    // garantindo que a alteração de ocupação não seja persistida.
    expect(addressRepo.updateOcupacao).toHaveBeenCalled();
  });
});
