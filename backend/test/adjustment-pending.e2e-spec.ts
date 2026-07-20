import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { GlobalExceptionFilter } from '../src/infrastructure/http/filters/http-exception.filter';
import * as bcrypt from 'bcrypt';

describe('Adjustment Pending (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  
  let adminToken: string;
  let operadorToken: string;
  let adminId: number;
  let operadorId: number;
  let testSku = `E2E-PENDING-${Date.now()}`;
  let testBatch = `E2E-BATCH-${Date.now()}`;
  let loteId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
    prisma = app.get(PrismaService);

    // Setup de usuários
    const salt = await bcrypt.genSalt(10);
    const senha = await bcrypt.hash('SenhaE2E123', salt);
    
    const userAdmin = await prisma.usuario.create({
      data: {
        nome: 'Admin E2E Test',
        email: `admin-pending-${Date.now()}@test.com`,
        senha,
        perfil: 'ADMIN',
      },
    });
    adminId = userAdmin.id;
    
    const userOperador = await prisma.usuario.create({
      data: {
        nome: 'Operador E2E Test',
        email: `operador-pending-${Date.now()}@test.com`,
        senha,
        perfil: 'OPERADOR',
      },
    });
    operadorId = userOperador.id;

    const loginAdmin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: userAdmin.email, senhaBruta: 'SenhaE2E123' });
    adminToken = loginAdmin.body.accessToken;

    const loginOperador = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: userOperador.email, senhaBruta: 'SenhaE2E123' });
    operadorToken = loginOperador.body.accessToken;

    // Setup de Produto e Lote
    const prod = await prisma.produto.create({
      data: {
        sku: testSku,
        descricao: 'Produto Pending E2E',
        categoria: 'Teste',
        perecivel: false,
        custoMedio: 10.0,
      },
    });
    
    const lote = await prisma.lote.create({
      data: {
        numeroLote: testBatch,
        produtoId: prod.id,
        quantidade: 100,
      }
    });
    loteId = lote.id;
  });

  afterAll(async () => {
    await prisma.ajusteEstoque.deleteMany({ where: { loteId } });
    await prisma.chainPointer.deleteMany({ where: { tabela: 'Movimentacao' } });
    await prisma.movimentacao.deleteMany({ where: { loteId } });
    await prisma.lote.deleteMany({ where: { id: loteId } });
    await prisma.produto.deleteMany({ where: { sku: testSku } });
    await prisma.usuario.deleteMany({ where: { id: { in: [adminId, operadorId] } } });
    await app.close();
  });

  it('GET /adjustments/pending sem token retorna 401', async () => {
    await request(app.getHttpServer())
      .get('/adjustments/pending')
      .expect(401);
  });

  it('GET /adjustments/pending com OPERADOR retorna 403', async () => {
    await request(app.getHttpServer())
      .get('/adjustments/pending')
      .set('Authorization', `Bearer ${operadorToken}`)
      .expect(403);
  });

  it('GET /adjustments/pending?status=INVALIDO retorna 400', async () => {
    await request(app.getHttpServer())
      .get('/adjustments/pending?status=INVALIDO')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('Fluxo completo de listagem e aprovação', async () => {
    const reqRes = await request(app.getHttpServer())
      .post('/adjustments/request')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({
        loteId,
        quantidadeDelta: 5,
        motivo: 'Sobra'
      })
      .expect(201);
    
    const ajusteId = reqRes.body.ajuste.id;

    let listRes = await request(app.getHttpServer())
      .get('/adjustments/pending')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    
    const pendingItem = listRes.body.find((a: any) => a.id === ajusteId);
    expect(pendingItem).toBeDefined();
    expect(pendingItem.statusAprovacao).toBe('PENDENTE');
    expect(pendingItem.lote.numeroLote).toBe(testBatch);
    expect(pendingItem.lote.produto.sku).toBe(testSku);

    await request(app.getHttpServer())
      .post('/adjustments/approve')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ajusteId,
        aprovado: true
      })
      .expect(201);

    listRes = await request(app.getHttpServer())
      .get('/adjustments/pending')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    
    expect(listRes.body.find((a: any) => a.id === ajusteId)).toBeUndefined();

    const listResAprovado = await request(app.getHttpServer())
      .get('/adjustments/pending?status=APROVADO')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const aprovadoItem = listResAprovado.body.find((a: any) => a.id === ajusteId);
    expect(aprovadoItem).toBeDefined();
    expect(aprovadoItem.statusAprovacao).toBe('APROVADO');
  });
});
