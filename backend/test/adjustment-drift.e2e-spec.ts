import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { GlobalExceptionFilter } from '../src/infrastructure/http/filters/http-exception.filter';
import * as bcrypt from 'bcrypt';

describe('Adjustment Drift E2E (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  
  let operadorToken: string;
  let gestorToken: string;
  let operadorId: number;
  let gestorId: number;
  let loteId: number;
  let productId: number;

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
    
    // Criação dos Usuários
    const userOperador = await prisma.usuario.create({
      data: { nome: 'Operador Req', email: `operador-req-${Date.now()}@test.com`, senha, perfil: 'OPERADOR' },
    });
    operadorId = userOperador.id;
    
    const userGestor = await prisma.usuario.create({
      data: { nome: 'Gestor Aprov', email: `gestor-apr-${Date.now()}@test.com`, senha, perfil: 'GESTOR' },
    });
    gestorId = userGestor.id;

    // Login e tokens
    const loginOp = await request(app.getHttpServer()).post('/auth/login').send({ email: userOperador.email, senhaBruta: 'SenhaE2E123' });
    operadorToken = loginOp.body.accessToken;

    const loginGestor = await request(app.getHttpServer()).post('/auth/login').send({ email: userGestor.email, senhaBruta: 'SenhaE2E123' });
    gestorToken = loginGestor.body.accessToken;

    // Criação do Endereço de Origem
    const endereco = await prisma.endereco.create({
      data: { codigo: `E2E-ADDR-${Date.now()}`, zona: 'A', tipoZona: 'SECO', capacidade: 2000, ocupado: 1000 }
    });

    // Criação do Produto e Lote
    const prod = await prisma.produto.create({
      data: { sku: `E2E-DRIFT-${Date.now()}`, descricao: 'Produto Drift E2E', categoria: 'Teste', perecivel: false, custoMedio: 10.0 },
    });
    productId = prod.id;
    
    const lote = await prisma.lote.create({
      data: { numeroLote: `LOTE-DRIFT-${Date.now()}`, produtoId: prod.id, quantidade: 1000 }
    });
    loteId = lote.id;
  });

  afterAll(async () => {
    await prisma.ajusteEstoque.deleteMany({ where: { loteId } });
    await prisma.movimentacao.deleteMany({ where: { loteId } });
    await prisma.lote.deleteMany({ where: { id: loteId } });
    await prisma.produto.deleteMany({ where: { id: productId } });
    await prisma.endereco.deleteMany({ where: { codigo: { startsWith: 'E2E-ADDR' } } });
    await prisma.usuario.deleteMany({ where: { id: { in: [operadorId, gestorId] } } });
    await app.close();
  });

  it('deve aprovar ajuste com GESTOR usando a classificação do momento da requisição, imune ao drift do saldo', async () => {
    // 1. Solicitando um ajuste de -10 unidades. 
    // Com 1000 de saldo inicial, -10 é exatamente 1%, o que fica abaixo de 2%.
    // Pela regra (RN-AJU-004), pode ser aprovado por GESTOR.
    const resRequest = await request(app.getHttpServer())
      .post('/adjustments/request')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({ loteId, quantidadeDelta: -10, motivo: 'Teste Drift' });
    
    expect(resRequest.status).toBe(201);
    // O use case retorna { ajuste: {...}, nivelAprovacaoExigido: '...' }
    const ajusteId = resRequest.body.ajuste?.id ?? resRequest.body.id;
    if (!ajusteId) throw new Error(`ajusteId não encontrado na resposta: ${JSON.stringify(resRequest.body)}`);

    // 2. Simulando uma movimentação drástica (picking ou saída manual) que despenca o saldo do lote
    // Uma saída de 900 unidades fará o saldo cair para 100.
    const endereco = await prisma.endereco.findFirst({ where: { codigo: { startsWith: 'E2E-ADDR' } } });
    const resMovement = await request(app.getHttpServer())
      .post('/movements')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({ tipo: 'SAIDA', loteId, quantidade: 900, motivo: 'Massive drop', enderecoOrigemId: endereco!.id });
    
    expect(resMovement.status).toBe(201);

    // Conferindo saldo real atual = 100
    const currentLote = await prisma.lote.findUnique({ where: { id: loteId } });
    expect(currentLote!.quantidade).toBe(100);

    // 3. Aprovando ajuste com GESTOR
    // Sobre 100, um delta de 10 representa 10% (exigiria ADMIN caso sofresse drift).
    // Mas deve usar a base preservada (1000) e aprovar.
    const resApprove = await request(app.getHttpServer())
      .post('/adjustments/approve')
      .set('Authorization', `Bearer ${gestorToken}`)
      .send({ ajusteId, aprovado: true });
    
    // POST sem @HttpCode explícito em NestJS retorna 201 por padrão.
    // O Swagger documenta 200, mas o comportamento real é 201.
    if (![200, 201].includes(resApprove.status)) {
      throw new Error(`Approve falhou com ${resApprove.status}: ${JSON.stringify(resApprove.body)}`);
    }
    const statusAprovacao = resApprove.body.statusAprovacao ?? resApprove.body.aprovado?.statusAprovacao;
    expect(statusAprovacao).toBe('APROVADO');

    // Validação final de saldo (100 - 10 = 90)
    const finalLote = await prisma.lote.findUnique({ where: { id: loteId } });
    expect(finalLote!.quantidade).toBe(90);
  });
});
