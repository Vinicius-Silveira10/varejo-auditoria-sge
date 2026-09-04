import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';

/**
 * ChainPointer Full-Flow E2E
 * ==========================
 * Executa em sequência real, via HTTP, TODOS os tipos de evento do ChainPointer:
 * ENTRADA → ARMAZENAGEM → AJUSTE (aprovado) → AJUSTE (rejeitado) → EXPEDICAO → INVENTÁRIO (divergência automática)
 * Ao final, chama GET /audit/verify e confirma status: INTEGRO.
 *
 * Este é o teste de integridade de auditoria mais completo do sistema.
 * DEVE rodar em toda execução de CI.
 */
describe('ChainPointer Full-Flow & Audit Integrity (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let adminToken: string;
  let gestorToken: string;

  let produtoId: number;
  let loteId: number;
  let enderecoId: number;
  let pedidoId: number;
  let adminUserId: number;

  const ts = Date.now();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    prisma = app.get(PrismaService);
    await app.init();

    // Login ADMIN (seed)
    const adminRes = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'admin@fortal.com.br',
      senhaBruta: process.env.SEED_ADMIN_PASSWORD || 'SenhaSegura123!',
    });
    adminToken = adminRes.body.accessToken;
    adminUserId = adminRes.body.user.id;

    // Login GESTOR (seed)
    const gestorRes = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'gestor@fortal.com.br',
      senhaBruta: process.env.SEED_ADMIN_PASSWORD || 'SenhaSegura123!',
    });
    gestorToken = gestorRes.body.accessToken;
  });

  afterAll(async () => {
    // Limpeza seletiva dos dados criados neste teste
    try {
      await prisma.pedidoExpedicao.deleteMany({ where: { id: pedidoId } });
      await prisma.ajusteEstoque.deleteMany({ where: { loteId } });
      await prisma.contagemInventario.deleteMany({ where: { loteId } });
      await prisma.movimentacao.deleteMany({ where: { loteId } });
      if (loteId) await prisma.lote.delete({ where: { id: loteId } }).catch(() => {});
      if (produtoId) {
        await prisma.logCusto.deleteMany({ where: { produtoId } });
        await prisma.produto.delete({ where: { id: produtoId } }).catch(() => {});
      }
      if (enderecoId) await prisma.endereco.delete({ where: { id: enderecoId } }).catch(() => {});
    } catch (e) { /* silent */ }
    await app.close();
  });

  // --- PASSO 1: Criar dados auxiliares ---
  it('SETUP: deve criar produto e endereço para o fluxo', async () => {
    const prodRes = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sku: `CP-FULL-${ts}`, descricao: 'ChainPointer Full Test', categoria: 'Secos', tipoZonaRequerida: 'SECO', custoMedio: 100 });
    expect(prodRes.status).toBe(201);
    produtoId = prodRes.body.data.id;

    const endRes = await request(app.getHttpServer())
      .post('/addresses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ codigo: `CPF-ADDR-${ts}`, zona: 'A-01', tipoZona: 'SECO', capacidade: 1000 });
    expect(endRes.status).toBe(201);
    enderecoId = endRes.body.data.id;
  });

  // --- PASSO 2: RECEBIMENTO (gera Movimentação ENTRADA) ---
  it('PASSO 1 - ENTRADA: deve registrar recebimento e gerar movimentação', async () => {
    const res = await request(app.getHttpServer())
      .post('/batches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        produtoId,
        numeroLote: `CPF-LOTE-${ts}`,
        validade: '2028-01-01',
        quantidade: 100,
        custoAquisicao: 100,
      });
    expect(res.status).toBe(201);
    loteId = res.body.data.id;

    const movs = await prisma.movimentacao.findMany({ where: { loteId } });
    expect(movs.some(m => m.tipo === 'ENTRADA')).toBe(true);
  });

  // --- PASSO 3: PUTAWAY (gera Movimentação ARMAZENAGEM) ---
  it('PASSO 2 - ARMAZENAGEM: deve executar putaway gerando movimentação ARMAZENAGEM', async () => {
    const res = await request(app.getHttpServer())
      .post('/addresses/putaway')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ loteId, enderecoDestinoId: enderecoId, quantidade: 100 });
    expect(res.status).toBe(201);

    const movs = await prisma.movimentacao.findMany({ where: { loteId } });
    expect(movs.some(m => m.tipo === 'ARMAZENAGEM')).toBe(true);
  });

  // --- PASSO 4: AJUSTE APROVADO ---
  it('PASSO 3 - AJUSTE APROVADO: deve solicitar e aprovar ajuste de estoque', async () => {
    const solRes = await request(app.getHttpServer())
      .post('/adjustments/request')
      .set('Authorization', `Bearer ${gestorToken}`)
      .send({ loteId, quantidadeDelta: -5, motivo: 'Dano no transporte' });
    expect(solRes.status).toBe(201);
    const ajusteId = solRes.body.ajuste.id;

    const aprRes = await request(app.getHttpServer())
      .post('/adjustments/approve')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ajusteId, aprovado: true });
    
    expect(aprRes.status).toBe(201);

    const movs = await prisma.movimentacao.findMany({ where: { loteId } });
    expect(movs.some(m => m.tipo === 'AJUSTE')).toBe(true);
  });

  // --- PASSO 5: AJUSTE REJEITADO ---
  it('PASSO 4 - AJUSTE REJEITADO: deve solicitar e rejeitar ajuste de estoque', async () => {
    const solRes = await request(app.getHttpServer())
      .post('/adjustments/request')
      .set('Authorization', `Bearer ${gestorToken}`)
      .send({ loteId, quantidadeDelta: -2, motivo: 'Solicitação indevida' });
    expect(solRes.status).toBe(201);
    const ajusteId = solRes.body.ajuste.id;

    const rejRes = await request(app.getHttpServer())
      .post('/adjustments/approve')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ajusteId, aprovado: false });
    expect(rejRes.status).toBe(201);

    const ajuste = await prisma.ajusteEstoque.findUnique({ where: { id: ajusteId } });
    expect(ajuste?.statusAprovacao).toBe('REJEITADO');
  });

  // --- PASSO 6: PICKING / EXPEDIÇÃO ---
  it('PASSO 5 - EXPEDICAO: deve criar pedido, fazer picking gerando movimentação EXPEDICAO', async () => {
    const pedRes = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        codigoPedido: `PED-CPF-${ts}`,
        itens: [{ produtoId, quantidadeSolicitada: 10 }]
      });
    expect(pedRes.status).toBe(201);
    pedidoId = pedRes.body.data.id;

    const pickRes = await request(app.getHttpServer())
      .post(`/orders/${pedidoId}/pick`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(pickRes.status).toBe(201);

    const movs = await prisma.movimentacao.findMany({ where: { loteId } });
    expect(movs.some(m => m.tipo === 'EXPEDICAO')).toBe(true);
  });

  // --- PASSO 7: INVENTÁRIO com divergência automática ---
  it('PASSO 6 - INVENTARIO: deve registrar contagem com divergência gerando ajuste automático', async () => {
    const startRes = await request(app.getHttpServer())
      .post('/inventory/start')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ loteId });
    expect(startRes.status).toBe(201);
    const contagemId = startRes.body.id;

    // Contagem com divergência (50 de real vs. ~85 teórico)
    const countRes = await request(app.getHttpServer())
      .post('/inventory/register')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ contagemId, quantidadeFisica: 50 });
    expect(countRes.status).toBe(201);
  });

  // --- PASSO 8: VERIFICAÇÃO FINAL DE INTEGRIDADE ---
  it('VERIFICACAO FINAL: GET /audit/verify deve retornar status INTEGRO', async () => {
    const res = await request(app.getHttpServer())
      .get('/audit/verify')
      .set('Authorization', `Bearer ${adminToken}`);

    console.log('[ChainPointer Full-Flow] Audit Verify Response:', JSON.stringify(res.body, null, 2));

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('INTEGRO');
    expect(res.body.resultados).toBeDefined();
    expect(res.body.resultados.every((r: any) => r.integridadeOk === true)).toBe(true);
  });
});
