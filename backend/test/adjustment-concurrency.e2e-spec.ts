import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { GlobalExceptionFilter } from '../src/infrastructure/http/filters/http-exception.filter';
import * as bcrypt from 'bcrypt';

describe('Adjustment Concurrency (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  
  let gestorToken1: string;
  let gestorToken2: string;
  let adminId: number; 
  let gestorId1: number;
  let gestorId2: number;
  let testSku = `E2E-CONCURRENCY-${Date.now()}`;
  let testBatch = `E2E-BATCH-CONC-${Date.now()}`;
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

    const salt = await bcrypt.genSalt(10);
    const senha = await bcrypt.hash('SenhaE2E123', salt);
    
    const userAdmin = await prisma.usuario.create({
      data: {
        nome: 'Admin Solicitante',
        email: `admin-req-${Date.now()}@test.com`,
        senha,
        perfil: 'ADMIN',
      },
    });
    adminId = userAdmin.id;
    
    const userGestor1 = await prisma.usuario.create({
      data: {
        nome: 'Gestor 1',
        email: `gestor1-conc-${Date.now()}@test.com`,
        senha,
        perfil: 'GESTOR',
      },
    });
    gestorId1 = userGestor1.id;

    const userGestor2 = await prisma.usuario.create({
      data: {
        nome: 'Gestor 2',
        email: `gestor2-conc-${Date.now()}@test.com`,
        senha,
        perfil: 'GESTOR',
      },
    });
    gestorId2 = userGestor2.id;

    const loginGestor1 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: userGestor1.email, senhaBruta: 'SenhaE2E123' });
    gestorToken1 = loginGestor1.body.accessToken;

    const loginGestor2 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: userGestor2.email, senhaBruta: 'SenhaE2E123' });
    gestorToken2 = loginGestor2.body.accessToken;

    const prod = await prisma.produto.create({
      data: {
        sku: testSku,
        descricao: 'Produto Concurrency E2E',
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
    await prisma.usuario.deleteMany({ where: { id: { in: [adminId, gestorId1, gestorId2] } } });
    await app.close();
  });

  it('deve impedir a dupla aprovação do mesmo ajuste (Fix Race Condition)', async () => {
    const ajuste = await prisma.ajusteEstoque.create({
      data: {
        loteId,
        quantidadeDelta: 1,
        motivo: 'Teste Concorrência',
        valorDelta: 10.0,
        statusAprovacao: 'PENDENTE',
        solicitanteId: adminId,
      }
    });

    const req1 = request(app.getHttpServer())
      .post('/adjustments/approve')
      .set('Authorization', `Bearer ${gestorToken1}`)
      .send({
        ajusteId: ajuste.id,
        aprovado: true
      });

    const req2 = request(app.getHttpServer())
      .post('/adjustments/approve')
      .set('Authorization', `Bearer ${gestorToken2}`)
      .send({
        ajusteId: ajuste.id,
        aprovado: true
      });

    const [res1, res2] = await Promise.all([req1, req2]);

    const statuses = [res1.status, res2.status].sort((a, b) => a - b);
    
    expect(statuses).toEqual([201, 409]);

    const loteAtualizado = await prisma.lote.findUnique({ where: { id: loteId } });
    expect(loteAtualizado!.quantidade).toBe(101);
  });

  it('deve lidar com aprovação e rejeição simultâneas para o mesmo ajuste garantindo que o delta seja aplicado no máximo uma vez', async () => {
    // Para este teste, o lote deve ter quantidade inicial de 101 (resultado do teste anterior)
    const loteAntes = await prisma.lote.findUnique({ where: { id: loteId } });
    const saldoInicial = loteAntes!.quantidade;

    const ajuste = await prisma.ajusteEstoque.create({
      data: {
        loteId,
        quantidadeDelta: 1,
        motivo: 'Teste Concorrência Aprovação vs Rejeição',
        valorDelta: 10.0,
        statusAprovacao: 'PENDENTE',
        solicitanteId: adminId,
      }
    });

    const reqApprove = request(app.getHttpServer())
      .post('/adjustments/approve')
      .set('Authorization', `Bearer ${gestorToken1}`)
      .send({
        ajusteId: ajuste.id,
        aprovado: true
      });

    const reqReject = request(app.getHttpServer())
      .post('/adjustments/approve')
      .set('Authorization', `Bearer ${gestorToken2}`)
      .send({
        ajusteId: ajuste.id,
        aprovado: false
      });

    const [resApprove, resReject] = await Promise.all([reqApprove, reqReject]);

    const statuses = [resApprove.status, resReject.status].sort((a, b) => a - b);
    
    // Um deve passar (201) e o outro falhar com conflito (409)
    expect(statuses).toEqual([201, 409]);

    const loteAtualizado = await prisma.lote.findUnique({ where: { id: loteId } });
    
    // Se a aprovação passou primeiro, o saldo deve ser saldoInicial + 5.
    // Se a rejeição passou primeiro, o saldo deve ser saldoInicial.
    // Portanto, o saldo atualizado NÃO PODE SER saldoInicial + 10 (aplicado duas vezes de alguma forma errônea, 
    // ou seja, ambas terem sucesso não esperado).
    
    if (resApprove.status === 201) {
      expect(loteAtualizado!.quantidade).toBe(saldoInicial + 1);
    } else {
      expect(loteAtualizado!.quantidade).toBe(saldoInicial);
    }
  });
});
