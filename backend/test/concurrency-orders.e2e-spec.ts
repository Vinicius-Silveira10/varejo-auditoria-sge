import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { RegisterMovementUseCase } from '../src/core/use-cases/movement/register-movement.use-case';
import { ReceiveBatchUseCase } from '../src/core/use-cases/batch/receive-batch.use-case';
import { IProductRepository } from '../src/core/interfaces/repositories/i-product.repository';
import { IAddressRepository } from '../src/core/interfaces/repositories/i-address.repository';
import { IBatchRepository } from '../src/core/interfaces/repositories/i-batch.repository';

describe('Concurrency Test', () => {
  let app: INestApplication;
  let registerMovement: RegisterMovementUseCase;
  let receiveBatch: ReceiveBatchUseCase;
  let productRepo: IProductRepository;
  let addressRepo: IAddressRepository;
  let batchRepo: IBatchRepository;
  let userRepo: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    registerMovement = moduleFixture.get<RegisterMovementUseCase>(RegisterMovementUseCase);
    receiveBatch = moduleFixture.get<ReceiveBatchUseCase>(ReceiveBatchUseCase);
    productRepo = moduleFixture.get<IProductRepository>('IProductRepository');
    addressRepo = moduleFixture.get<IAddressRepository>('IAddressRepository');
    batchRepo = moduleFixture.get<IBatchRepository>('IBatchRepository');
    userRepo = moduleFixture.get<any>('IUserRepository');
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve impedir furo de estoque em movimentações simultâneas (Race Condition)', async () => {
    const ts = Date.now();
    const user = await userRepo.create({ nome: 'Stress', email: `stress-${ts}@test.com`, senha: '123', perfil: 'ADMIN' });
    const product = await productRepo.create({ sku: `STRESS-${ts}`, descricao: 'Stress Test', categoria: 'Secos', custoMedio: 10, tipoZonaRequerida: 'SECO' } as any);
    const address = await addressRepo.create({ codigo: `ADDR-STRESS-${ts}`, zona: 'A-01', tipoZona: 'SECO', capacidade: 1000 });

    // 1. Entrada de 10 unidades (O ReceiveBatch já define a quantidade no lote)
    const batch = await receiveBatch.execute({ produtoId: product.id, numeroLote: `L-STRESS-${ts}`, validade: new Date('2027-01-01'), quantidade: 10, custoAquisicao: 10 });
    
    // 2. Disparar 10 tentativas simultâneas de tirar 2 unidades (Total 20, mas só tem 10)
    const attempts = 10;
    const results = await Promise.allSettled(
      Array.from({ length: attempts }).map(() => 
        registerMovement.execute({
          tipo: 'SAIDA',
          loteId: batch.id,
          quantidade: 2,
          motivo: 'Race Test',
          enderecoOrigemId: address.id, // Embora não tenhamos feito a ENTRADA oficial via UseCase, o endereço existe
          enderecoDestinoId: null,
          usuarioId: user.id
        })
      )
    );

    // 3. Analisar Resultados
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failureCount = results.filter(r => r.status === 'rejected').length;

    // Só podem ter passado exatamente 5 (5 * 2 = 10)
    expect(successCount).toBe(5);
    expect(failureCount).toBe(5);

    // 4. Validar Saldo Final no Banco (Deve ser 0, nunca negativo)
    const finalBatch = await batchRepo.findById(batch.id);
    expect(finalBatch?.quantidade).toBe(0);
  });
});
