import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { GlobalExceptionFilter } from '../src/infrastructure/http/filters/http-exception.filter';

describe('Picking RN-EXP-007 (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let expiredBatchId: number;
  let orderId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('Setup: seed produto, lote vencido e pedido', async () => {
    // 2. Criar Produto
    const produto = await prisma.produto.create({
      data: {
        sku: `PROD-EXP-007-${Date.now()}`,
        descricao: 'Produto Teste Vencimento',
        categoria: 'GERAL',
      },
    });

    // 3. Criar Lote Vencido (Data no passado)
    const dataVencida = new Date();
    dataVencida.setMonth(dataVencida.getMonth() - 1); // 1 mês atrás

    const lote = await prisma.lote.create({
      data: {
        produtoId: produto.id,
        numeroLote: `LOTE-VENCIDO-${Date.now()}`,
        validade: dataVencida,
        quantidade: 10,
        ativo: true,
      },
    });
    expiredBatchId = lote.id;

    // 4. Criar Pedido de Expedição pendente
    const pedido = await prisma.pedidoExpedicao.create({
      data: {
        codigoPedido: `PED-E2E-${Date.now()}`,
        status: 'PENDENTE',
        itens: {
          create: [
            {
              produtoId: produto.id,
              quantidadeSolicitada: 5,
              quantidadeSeparada: 0,
            },
          ],
        },
      },
    });
    orderId = pedido.id;

    const email = `operador@fortal.com.br`;
    const senhaBruta = process.env.SEED_ADMIN_PASSWORD || 'SenhaSegura123!';

    const authRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, senhaBruta });

    if (!authRes.body.accessToken) {
      throw new Error(`Login falhou: ${JSON.stringify(authRes.body)}`);
    }

    token = authRes.body.accessToken;
  });

  it('Deve rejeitar o picking com 400 devido a saldo insuficiente (lote vencido é filtrado pelo banco - A+B)', async () => {
    const response = await request(app.getHttpServer())
      .post(`/orders/${orderId}/pick`)
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    // Como adotamos A+B, o Prisma oculta o lote vencido.
    // Consequentemente, o UseCase enxerga saldo 0 e dispara RN-EXP-004.
    // A RN-EXP-007 de TOCTOU fica como guarda de segurança na memória.
    expect(response.body.message).toContain('RN-EXP-004');
    expect(response.body.message).toContain('Saldo insuficiente');
  });
});
