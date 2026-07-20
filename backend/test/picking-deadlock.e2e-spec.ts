import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { PrismaMovementRepository } from '../src/infrastructure/database/prisma/repositories/prisma-movement.repository';
import { PrismaBatchRepository } from '../src/infrastructure/database/prisma/repositories/prisma-batch.repository';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Picking Deadlock Concurrency (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let produtoId: number;
  let loteIdA: number;
  let loteIdB: number;
  let pedidoId: number;
  let enderecoOrigemId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@fortal.com.br', senhaBruta: 'SenhaSegura123!' });
    adminToken = loginRes.body.accessToken;

    const prod = await prisma.produto.create({
      data: {
        sku: `DEADLOCK-SKU-${Date.now()}`,
        descricao: 'Produto Deadlock E2E',
        categoria: 'Teste',
        perecivel: false,
        custoMedio: 10.0,
      }
    });
    produtoId = prod.id;

    const end = await prisma.endereco.findFirst();
    enderecoOrigemId = end!.id;

    // Criar Lote A (10 unidades) e Lote B (10 unidades)
    const batchResA = await request(app.getHttpServer())
      .post('/batches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ numeroLote: 'LOTE-DEADLOCK-A', produtoId, quantidade: 10, custoAquisicao: 10, validade: '2030-12-31T00:00:00.000Z' });
    loteIdA = batchResA.body.data.id;

    const batchResB = await request(app.getHttpServer())
      .post('/batches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ numeroLote: 'LOTE-DEADLOCK-B', produtoId, quantidade: 10, custoAquisicao: 10, validade: '2030-12-31T00:00:00.000Z' });
    loteIdB = batchResB.body.data.id;

    // Criar Pedido que vai pedir 15 unidades (vai consumir 10 do A e 5 do B)
    const pedidoRes = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        codigoPedido: 'PEDIDO-DEADLOCK-1',
        itens: [{ produtoId, quantidadeSolicitada: 15 }]
      });
      
    if (pedidoRes.status !== 201) {
      throw new Error('Falha ao criar pedido: ' + JSON.stringify(pedidoRes.body));
    }
    pedidoId = pedidoRes.body.data.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve provar o deadlock entre Picking e RegisterMovement no código antigo, e passar no novo', async () => {
    const batchRepo = app.get<any>('IBatchRepository');
    const movementRepo = app.get<any>('IMovementRepository');

    // No código antigo, o Picking chamava updateQuantidadeDelta do Lote A, depois movement.create, 
    // depois updateQuantidadeDelta do Lote B, depois movement.create.
    // Para forçar o deadlock no código antigo:
    // Fazemos o Picking dar uma pausa ANTES de tentar alterar o Lote B.
    // Isso dá tempo para o RegisterMovement (que vai focar no Lote B) iniciar e pegar o lock do Lote B.
    
    const originalUpdateDelta = PrismaBatchRepository.prototype.updateQuantidadeDelta;
    jest.spyOn(PrismaBatchRepository.prototype, 'updateQuantidadeDelta').mockImplementation(async function(this: any, id: number, delta: number) {
      // Se for a transação do Picking atualizando o SEGUNDO lote (Lote B)
      if (delta === -5 && id === loteIdB) {
        console.log('--- PICKING VAI PAUSAR AGORA ANTES DE LOTE B ---');
        // Pausa de 300ms antes de tentar pegar o lock do Lote B
        await delay(300);
      }
      return originalUpdateDelta.call(this, id, delta);
    });

    const originalCreate = PrismaMovementRepository.prototype.create;
    jest.spyOn(PrismaMovementRepository.prototype, 'create').mockImplementation(async function(this: any, data: any) {
      if (data.tipo === 'SAIDA' && data.loteId === loteIdB && data.quantidade === 1) {
        console.log('--- MOVEMENT VAI PAUSAR AGORA ANTES DE CHAIN POINTER ---');
        await delay(300); // Segura o lock do Lote B e demora para pedir o ChainPointer
      }
      return originalCreate.call(this, data);
    });

    // Inicia os dois fluxos concorrentemente
    // 1. Picking (vai consumir A e B)
    const pPick = request(app.getHttpServer())
      .post(`/orders/${pedidoId}/pick`)
      .set('Authorization', `Bearer ${adminToken}`);

    // 2. RegisterMovement (Saída avulsa do Lote B)
    // Dá 50ms para o Picking arrancar e garantir o lock do Lote A e ChainPointer primeiro
    await delay(50);
    const pMove = request(app.getHttpServer())
      .post('/movements')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ loteId: loteIdB, tipo: 'SAIDA', quantidade: 1, usuarioId: 1, enderecoOrigemId });

    const [resPick, resMove] = await Promise.all([pPick, pMove]);

    // Limpa spies para não quebrar outros testes
    jest.restoreAllMocks();

    // Se houver deadlock, o Postgres aborta uma das transações (erro 40P01) e o NestJS vai lançar 500
    if (resPick.status === 500 || resMove.status === 500) {
      console.error('DEADLOCK DETECTADO (Um ou ambos os requests falharam com 500):', resPick.body, resMove.body);
    }
    
    expect(resPick.status).toBe(201);
    expect(resMove.status).toBe(201);
    
  }, 10000); // Aumenta timeout do teste para garantir que o deadlock timeout do jest apareça se houver
});
