import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { GetBatchMovementsUseCase } from '../src/core/use-cases/movement/get-batch-movements.use-case';
import { RegisterMovementUseCase } from '../src/core/use-cases/movement/register-movement.use-case';
import { ReceiveBatchUseCase } from '../src/core/use-cases/batch/receive-batch.use-case';
import { IProductRepository } from '../src/core/interfaces/repositories/i-product.repository';
import { IAddressRepository } from '../src/core/interfaces/repositories/i-address.repository';

describe('Audit & Traceability (Integration)', () => {
  let app: INestApplication;
  let getBatchMovements: GetBatchMovementsUseCase;
  let registerMovement: RegisterMovementUseCase;
  let receiveBatch: ReceiveBatchUseCase;
  let productRepo: IProductRepository;
  let addressRepo: IAddressRepository;
  let userRepo: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    getBatchMovements = moduleFixture.get<GetBatchMovementsUseCase>(GetBatchMovementsUseCase);
    registerMovement = moduleFixture.get<RegisterMovementUseCase>(RegisterMovementUseCase);
    receiveBatch = moduleFixture.get<ReceiveBatchUseCase>(ReceiveBatchUseCase);
    productRepo = moduleFixture.get<IProductRepository>('IProductRepository');
    addressRepo = moduleFixture.get<IAddressRepository>('IAddressRepository');
    userRepo = moduleFixture.get<any>('IUserRepository');
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve garantir a integridade da corrente de hashes (Blockchain) e rastreabilidade', async () => {
    const ts = Date.now();
    const user = await userRepo.create({ nome: 'Auditor', email: `auditor-${ts}@test.com`, senha: '123', perfil: 'ADMIN' });
    const product = await productRepo.create({ sku: `AUDIT-${ts}`, descricao: 'Audit Test', categoria: 'Secos', custoMedio: 10, tipoZonaRequerida: 'SECO' } as any);
    const address = await addressRepo.create({ codigo: `ADDR-AUDIT-${ts}`, zona: 'A-01', tipoZona: 'SECO', capacidade: 1000 });

    // 1. Primeira Movimentação (ENTRADA)
    const batch = await receiveBatch.execute({ produtoId: product.id, numeroLote: `L-AUDIT-${ts}`, validade: new Date('2027-01-01'), quantidade: 50, custoAquisicao: 10 });
    const mov1 = await registerMovement.execute({
      tipo: 'ENTRADA',
      loteId: batch.id,
      quantidade: 50,
      motivo: 'Recebimento',
      enderecoOrigemId: null,
      enderecoDestinoId: address.id,
      usuarioId: user.id
    });

    // 2. Segunda Movimentação (SAIDA)
    const mov2 = await registerMovement.execute({
      tipo: 'SAIDA',
      loteId: batch.id,
      quantidade: 10,
      motivo: 'Amostra',
      enderecoOrigemId: address.id,
      enderecoDestinoId: null,
      usuarioId: user.id
    });

    // 3. Validar Hashes (Encadeamento Atômico)
    expect(mov1.hash).toBeDefined();
    
    expect(mov2.hash).toBeDefined();
    expect(mov2.previousHash).toBe(mov1.hash); // O elo da corrente: mov2 aponta para mov1

    // 4. Testar Use Case de Rastreabilidade (Feature 2)
    const history = await getBatchMovements.execute(batch.id);
    expect(history).toHaveLength(2);
    expect(history[0].tipo).toBe('SAIDA'); // Mais recente primeiro
    expect(history[1].tipo).toBe('ENTRADA');
  });
});
