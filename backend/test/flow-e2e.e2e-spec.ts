import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { CreateOrderUseCase } from '../src/core/use-cases/order/create-order.use-case';
import { PickOrderUseCase } from '../src/core/use-cases/order/pick-order.use-case';
import { CloseOrderUseCase } from '../src/core/use-cases/order/close-order.use-case';
import { RegisterMovementUseCase } from '../src/core/use-cases/movement/register-movement.use-case';
import { ReceiveBatchUseCase } from '../src/core/use-cases/batch/receive-batch.use-case';
import { IProductRepository } from '../src/core/interfaces/repositories/i-product.repository';
import { IBatchRepository } from '../src/core/interfaces/repositories/i-batch.repository';
import { IAddressRepository } from '../src/core/interfaces/repositories/i-address.repository';

describe('Flow E2E (Integration)', () => {
  let app: INestApplication;
  let createOrder: CreateOrderUseCase;
  let pickOrder: PickOrderUseCase;
  let registerMovement: RegisterMovementUseCase;
  let closeOrder: CloseOrderUseCase;
  let receiveBatch: ReceiveBatchUseCase;
  let productRepo: IProductRepository;
  let addressRepo: IAddressRepository;
  let userRepo: any;
  const ts = Date.now();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    createOrder = moduleFixture.get<CreateOrderUseCase>(CreateOrderUseCase);
    pickOrder = moduleFixture.get<PickOrderUseCase>(PickOrderUseCase);
    registerMovement = moduleFixture.get<RegisterMovementUseCase>(
      RegisterMovementUseCase,
    );
    closeOrder = moduleFixture.get<CloseOrderUseCase>(CloseOrderUseCase);
    receiveBatch = moduleFixture.get<ReceiveBatchUseCase>(ReceiveBatchUseCase);
    productRepo = moduleFixture.get<IProductRepository>('IProductRepository');
    addressRepo = moduleFixture.get<IAddressRepository>('IAddressRepository');
    userRepo = moduleFixture.get<any>('IUserRepository');
  });

  afterAll(async () => {
    // Ordem correta de deleção baseada em FK:
    // ItemPedido -> PedidoExpedicao
    // Movimentacao -> Lote
    // Endereco, Produto, Usuario

    // 1. Limpar Pedidos e Itens
    const orderRepoPrisma = app.get('IOrderRepository').prisma;
    const order = await orderRepoPrisma.pedidoExpedicao.findFirst({
      where: { codigoPedido: `PED-FLOW-${ts}` }
    });
    if (order) {
      await orderRepoPrisma.itemPedido.deleteMany({ where: { pedidoId: order.id } });
      await orderRepoPrisma.pedidoExpedicao.delete({ where: { id: order.id } });
    }

    // 2. Limpar Lotes e Movimentacoes
    const batchRepoPrisma = app.get('IBatchRepository').prisma;
    const batch = await batchRepoPrisma.lote.findFirst({
      where: { numeroLote: `L-FLOW-${ts}` }
    });
    if (batch) {
      await batchRepoPrisma.movimentacao.deleteMany({ where: { loteId: batch.id } });
      await batchRepoPrisma.lote.delete({ where: { id: batch.id } });
    }

    // 3. Limpar Enderecos, Produtos, Usuarios
    const prisma = app.get('IOrderRepository').prisma; // Aproveitando qualquer prisma client
    await prisma.endereco.deleteMany({ where: { codigo: `ADDR-FLOW-${ts}` } });
    const product = await prisma.produto.findFirst({ where: { sku: `FLOW-${ts}` } });
    if (product) {
      await prisma.logCusto.deleteMany({ where: { produtoId: product.id } });
      await prisma.produto.delete({ where: { id: product.id } });
    }
    await prisma.usuario.deleteMany({ where: { email: `admin-${ts}@test.com` } });

    await app.close();
  });

  it('deve realizar o fluxo completo: Entrada -> Pedido -> Picking -> Saída -> Fechamento', async () => {
    const user = await userRepo.create({
      nome: 'Admin',
      email: `admin-${ts}@test.com`,
      senha: '123',
      perfil: 'ADMIN',
    });
    const product = await productRepo.create({
      sku: `FLOW-${ts}`,
      descricao: 'Flow Test',
      categoria: 'Secos',
      custoMedio: 5,
      tipoZonaRequerida: 'SECO',
    } as any);
    const address = await addressRepo.create({
      codigo: `ADDR-FLOW-${ts}`,
      zona: 'A-01',
      tipoZona: 'SECO',
      capacidade: 1000,
    });

    // 2. Entrada de Lote (Logístico)
    const batch = await receiveBatch.execute({
      produtoId: product.id,
      numeroLote: `L-FLOW-${ts}`,
      validade: new Date('2027-01-01'),
      quantidade: 100,
      custoAquisicao: 5,
      usuarioId: user.id,
    });

    // 2.1 Colocar no Endereço (Movimentação de ARMAZENAGEM)
    await registerMovement.execute({
      tipo: 'ARMAZENAGEM',
      loteId: batch.id,
      quantidade: 100,
      motivo: 'Recebimento',
      enderecoOrigemId: null,
      enderecoDestinoId: address.id,
      usuarioId: user.id,
    });

    // 3. Criar Pedido (Feature 1)
    const order = await createOrder.execute({
      codigoPedido: `PED-FLOW-${ts}`,
      itens: [{ produtoId: product.id, quantidadeSolicitada: 20 }],
    });
    expect(order.codigoPedido).toBe(`PED-FLOW-${ts}`);

    // 4. Picking (Sugestão)
    const picking = await pickOrder.execute(order.id, user.id);
    expect(picking.pickingList[0].sugestoes[0].loteId).toBe(batch.id);

    // 5. Saída de Lote (Simulando execução do picking)
    await registerMovement.execute({
      tipo: 'SAIDA',
      loteId: batch.id,
      quantidade: 20,
      motivo: 'Expedição Pedido',
      enderecoOrigemId: address.id,
      enderecoDestinoId: null,
      usuarioId: user.id,
    });

    // 6. Fechamento de Pedido
    // Nota: Como não temos um endpoint de "confirmar separação item a item" ainda,
    // precisamos atualizar a quantidadeSeparada no banco para o teste passar no CloseOrder.
    const orderRepo = app.get('IOrderRepository');
    await orderRepo.prisma.itemPedido.updateMany({
      where: { pedidoId: order.id },
      data: { quantidadeSeparada: 20 },
    });

    const finalOrder = await closeOrder.execute(order.id);
    expect(finalOrder.status).toBe('EXPEDIDO');
  });
});
