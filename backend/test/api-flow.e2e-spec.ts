import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

describe('API Flow E2E (Supertest)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  
  // Variáveis de estado do teste E2E
  let authToken: string;
  let managerToken: string;
  let adminId: number;
  let managerId: number;
  let testSku = `E2E-PROD-${Date.now()}`;
  let testAddress = `E2E-ADDR-${Date.now()}`;
  let testBatch = `E2E-BATCH-${Date.now()}`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get(PrismaService);

    // 1. Limpeza de sujeira residual
    await prisma.movimentacao.deleteMany({});
    await prisma.chainPointer.deleteMany({ where: { tabela: 'Movimentacao' } });
    
    // 2. Criar usuário temporário para o E2E
    const salt = await bcrypt.genSalt(10);
    const senha = await bcrypt.hash('SenhaE2E123', salt);
    const user = await prisma.usuario.create({
      data: {
        nome: 'Admin E2E Test',
        email: `admin-e2e-${Date.now()}@test.com`,
        senha,
        perfil: 'ADMIN',
      },
    });
    adminId = user.id;
    const managerUser = await prisma.usuario.create({
      data: {
        nome: 'Manager E2E Test',
        email: `manager-e2e-${Date.now()}@test.com`,
        senha,
        perfil: 'GESTOR',
      },
    });
    managerId = managerUser.id;

    // 2. Criar endereço e produto incompatíveis para forçar a regra térmica
    await prisma.endereco.create({
      data: {
        codigo: testAddress,
        zona: 'Z-E2E',
        tipoZona: 'SECO',
        capacidade: 1000,
      },
    });



    // Neutraliza temporariamente o endereço CONGELADO do seed
    await prisma.endereco.updateMany({
      where: { tipoZona: 'CONGELADO' },
      data: { tipoZona: 'SECO' }
    });

    await prisma.produto.create({
      data: {
        sku: testSku,
        descricao: 'Produto Perecivel E2E',
        categoria: 'Carnes',
        perecivel: true,
        tipoZonaRequerida: 'CONGELADO',
        custoMedio: 15.0,
      },
    });
    
    // 3. Criar Lote de entrada para manipulação
    const prod = await prisma.produto.findUnique({ where: { sku: testSku } });
    await prisma.lote.create({
      data: {
        numeroLote: testBatch,
        produtoId: prod!.id,
        quantidade: 100,
        validade: new Date('2028-01-01'),
      }
    });
  });

  afterAll(async () => {
    // Tear down: Limpeza completa dos dados inseridos pelo teste
    await prisma.ajusteEstoque.deleteMany({ where: { solicitanteId: adminId }});
    await prisma.movimentacao.deleteMany({});
    await prisma.lote.deleteMany({ where: { numeroLote: testBatch }});
    await prisma.produto.deleteMany({ where: { sku: testSku }});
    await prisma.endereco.deleteMany({ where: { codigo: { startsWith: 'E2E-ADDR' } }});
    await prisma.usuario.deleteMany({ where: { id: { in: [adminId, managerId] } }});
    
    await app.close();
  });

  describe('Feature 1: Autenticação E2E', () => {
    it('deve logar e obter token JWT', async () => {
      const email = (await prisma.usuario.findUnique({ where: { id: adminId } }))!.email;
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, senhaBruta: 'SenhaE2E123' })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      authToken = res.body.accessToken;

      const emailManager = (await prisma.usuario.findUnique({ where: { id: managerId } }))!.email;
      const resManager = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: emailManager, senhaBruta: 'SenhaE2E123' })
        .expect(200);
      managerToken = resManager.body.accessToken;
    });
  });

  describe('Feature 2: Putaway e Armazenamento Inteligente', () => {
    it('deve bloquear o putaway de item congelado para zona seca', async () => {
      const batch = await prisma.lote.findFirst({ where: { numeroLote: testBatch } });
      const res = await request(app.getHttpServer())
        .get(`/addresses/suggest-putaway?produtoId=${batch!.produtoId}&quantidade=50`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.data.sugestoes).toHaveLength(0);
      expect(res.body.data.aviso).toContain('Nenhum endereço CONGELADO disponível');
    });

    it('deve registrar a movimentação garantindo autoria via JWT', async () => {
      // Cria o endereço compatível para que o teste passe
      await prisma.endereco.create({
        data: {
          codigo: `${testAddress}-FRIO`,
          zona: 'Z-E2E-FRIO',
          tipoZona: 'CONGELADO',
          capacidade: 1000,
        },
      });

      const batch = await prisma.lote.findFirst({ where: { numeroLote: testBatch } });
      const address = await prisma.endereco.findUnique({ where: { codigo: `${testAddress}-FRIO` } });
      
      const res = await request(app.getHttpServer())
        .post('/movements')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tipo: 'ENTRADA',
          loteId: batch!.id,
          quantidade: 50,
          motivo: 'Recebimento E2E',
          enderecoDestinoId: address!.id
        })
        .expect(201);
      
      const mov = await prisma.movimentacao.findFirst({ where: { loteId: batch!.id } });
      expect(mov!.usuarioId).toBe(adminId); // Garante que pegou do Token, não do payload
    });
  });

  describe('Feature 3: Auditoria Logística', () => {
    it('deve validar o hash da movimentação gerada', async () => {
      const res = await request(app.getHttpServer())
        .get('/audit/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(res.body.status).toBe('INTEGRO');
    });
  });

  describe('Feature 4: Ajuste de Estoque e Isolamento do CMP', () => {
    let ajusteId: number;

    it('deve criar e aprovar o ajuste', async () => {
      const batch = await prisma.lote.findFirst({ where: { numeroLote: testBatch } });
      
      // Criar o ajuste
      const resCreate = await request(app.getHttpServer())
        .post('/adjustments/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          loteId: batch!.id,
          quantidadeDelta: -1, // Inventário encontrou falta (< 2% para passar com GESTOR)
          motivo: 'Avaria E2E'
        })
        .expect(201);
      
      ajusteId = resCreate.body.ajuste.id;

      // Aprovar o ajuste
      const resApprove = await request(app.getHttpServer())
        .post('/adjustments/approve')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          ajusteId: ajusteId,
          aprovado: true
        })
        .expect(201);

      expect(resApprove.body.statusAprovacao).toBe('APROVADO');
    });

    it('deve manter o Custo Médio Ponderado inalterado após ajuste', async () => {
      // 15.0 era o custo inicial configurado no setup (beforeAll)
      const prod = await prisma.produto.findUnique({ where: { sku: testSku } });
      expect(prod!.custoMedio).toBe(15.0); 
    });
  });

});
