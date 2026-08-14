import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';

describe('P2034 Concurrency Check (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let loteId: number;
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
      .send({ email: 'admin@fortal.com.br', senhaBruta: process.env.SEED_ADMIN_PASSWORD || 'SenhaSegura123!' });
    adminToken = loginRes.body.accessToken;

    const prod = await prisma.produto.create({
      data: {
        sku: `P2034-SKU-${Date.now()}`,
        descricao: 'Produto P2034 Check',
        categoria: 'Teste',
        perecivel: false,
        custoMedio: 10.0,
      }
    });

    const end = await prisma.endereco.findFirst();
    enderecoOrigemId = end!.id;

    const batchRes = await request(app.getHttpServer())
      .post('/batches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ numeroLote: `LOTE-P2034-${Date.now()}`, produtoId: prod.id, quantidade: 100, custoAquisicao: 10, validade: '2030-12-31T00:00:00.000Z' });
    loteId = batchRes.body.data.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve executar updateQuantidadeDelta concorrentemente sem erro P2034', async () => {
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        request(app.getHttpServer())
          .post('/movements')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ loteId, tipo: 'SAIDA', quantidade: 5, usuarioId: 1, enderecoOrigemId })
      );
    }

    const results = await Promise.all(promises);
    
    let has500 = false;
    results.forEach(res => {
      if (res.status === 500) {
        has500 = true;
        console.error('Falha de Concorrência Detectada (Status 500):', res.body);
      } else {
        expect(res.status).toBe(201);
      }
    });

    expect(has500).toBe(false);

    const loteDb = await prisma.lote.findUnique({ where: { id: loteId } });
    expect(loteDb!.quantidade).toBe(75);
  });

  it('deve rejeitar oversell concorrente (TOCTOU) mantendo integridade do saldo', async () => {
    // Vamos criar um novo lote com saldo 100
    const batchRes = await request(app.getHttpServer())
      .post('/batches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ numeroLote: `LOTE-OVERSELL-${Date.now()}`, produtoId: 1, quantidade: 100, custoAquisicao: 10, validade: '2030-12-31T00:00:00.000Z' });
    const loteOversellId = batchRes.body.data.id;

    // Disparamos 5 requisições de SAIDA pedindo 30 unidades cada (Total: 150 > 100)
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        request(app.getHttpServer())
          .post('/movements')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ loteId: loteOversellId, tipo: 'SAIDA', quantidade: 30, usuarioId: 1, enderecoOrigemId })
      );
    }

    const results = await Promise.all(promises);
    
    let successes = 0;
    let businessErrors = 0;
    
    results.forEach(res => {
      if (res.status === 201) {
        successes++;
      } else if (res.status === 400 && res.body.message.includes('RN-TRV-002')) {
        businessErrors++;
      } else {
        console.error('Status inesperado no teste de Oversell:', res.status, res.body);
      }
    });

    // Como 100 / 30 = 3.33, apenas 3 saídas podem ter sucesso (90 no total).
    // As outras 2 obrigatoriamente têm que falhar com RN-TRV-002 (DomainException 400).
    expect(successes).toBe(3);
    expect(businessErrors).toBe(2);

    // O saldo final deve ser exatamente 10 (100 - 90) e NUNCA negativo.
    const loteDb = await prisma.lote.findUnique({ where: { id: loteOversellId } });
    expect(loteDb!.quantidade).toBe(10);
  });
});
