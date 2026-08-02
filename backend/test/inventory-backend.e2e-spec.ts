/**
 * INVENTÁRIO CÍCLICO — TESTES BACKEND (Feature 2 + Feature 3)
 *
 * Este arquivo documenta e prova dois problemas reais encontrados no Bloco 1:
 *
 * Feature 2 — Contagem Cega (RBAC):
 *   - RED: OPERADOR chama POST /inventory/register → espera 403
 *   - RED: OPERADOR chama POST /inventory/start → espera 403 (deve permanecer assim)
 *   (GREEN será atingido após corrigir @Roles no controller)
 *
 * Feature 3 — Race Condition (TOCTOU):
 *   - RED: Promise.all de dois POST /inventory/start para o mesmo lote
 *         → ambos retornam 201 (BUG: dois registros de contagem abertos)
 *   (GREEN será atingido após adicionar lockForUpdate na transação)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { GlobalExceptionFilter } from '../src/infrastructure/http/filters/http-exception.filter';
import * as bcrypt from 'bcrypt';

describe('Inventory — Feature 2 & 3 (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let operadorToken: string;
  let gestorToken1: string;
  let gestorToken2: string;

  let operadorId: number;
  let gestorId1: number;
  let gestorId2: number;
  let produtoId: number;
  let loteId: number;

  // IDs de contagens criadas nos testes — para cleanup
  const contagemIds: number[] = [];

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
    const senha = await bcrypt.hash('SenhaInv123', salt);

    // Usuários: 1 OPERADOR, 2 GESTORES
    const uOp = await prisma.usuario.create({
      data: { nome: 'Operador Inv', email: `op-inv-${Date.now()}@test.com`, senha, perfil: 'OPERADOR' },
    });
    operadorId = uOp.id;

    const uG1 = await prisma.usuario.create({
      data: { nome: 'Gestor Inv 1', email: `g1-inv-${Date.now()}@test.com`, senha, perfil: 'GESTOR' },
    });
    gestorId1 = uG1.id;

    const uG2 = await prisma.usuario.create({
      data: { nome: 'Gestor Inv 2', email: `g2-inv-${Date.now()}@test.com`, senha, perfil: 'GESTOR' },
    });
    gestorId2 = uG2.id;

    // Tokens
    operadorToken = (await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: uOp.email, senhaBruta: 'SenhaInv123' })).body.accessToken;

    gestorToken1 = (await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: uG1.email, senhaBruta: 'SenhaInv123' })).body.accessToken;

    gestorToken2 = (await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: uG2.email, senhaBruta: 'SenhaInv123' })).body.accessToken;

    // Produto e Lote (curva A para não ter restrição de frequência)
    const prod = await prisma.produto.create({
      data: {
        sku: `INV-SKU-${Date.now()}`,
        descricao: 'Produto Inventário E2E',
        categoria: 'Teste',
        custoMedio: 20.0,
        perecivel: false,
        curvaAbc: 'A',
      },
    });
    produtoId = prod.id;

    const lote = await prisma.lote.create({
      data: { numeroLote: `INV-LOTE-${Date.now()}`, produtoId: prod.id, quantidade: 500 },
    });
    loteId = lote.id;
  });

  afterAll(async () => {
    // Cleanup em ordem de FK
    if (contagemIds.length > 0) {
      await prisma.contagemInventario.deleteMany({ where: { id: { in: contagemIds } } });
    }
    // Garantir que lote não fique travado
    await prisma.lote.updateMany({ where: { id: loteId }, data: { emInventario: false } });
    await prisma.ajusteEstoque.deleteMany({ where: { loteId } });
    await prisma.movimentacao.deleteMany({ where: { loteId } });
    await prisma.lote.deleteMany({ where: { id: loteId } });
    await prisma.produto.deleteMany({ where: { id: produtoId } });
    await prisma.usuario.deleteMany({ where: { id: { in: [operadorId, gestorId1, gestorId2] } } });
    await app.close();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // FEATURE 2 — Contagem Cega: RBAC em /inventory/register
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Feature 2 — RBAC: Contagem Cega', () => {
    it('[RED→GREEN] OPERADOR NÃO pode chamar POST /inventory/start (403)', async () => {
      const res = await request(app.getHttpServer())
        .post('/inventory/start')
        .set('Authorization', `Bearer ${operadorToken}`)
        .send({ loteId });

      // Este teste DEVE passar em RED e GREEN (OPERADOR sempre 403 em /start)
      expect(res.status).toBe(403);
    });

    it('[RED] OPERADOR recebe 403 em POST /inventory/register (bug atual: role-guard bloqueia)', async () => {
      // Criar uma contagem como GESTOR para ter um contagemId válido
      const startRes = await request(app.getHttpServer())
        .post('/inventory/start')
        .set('Authorization', `Bearer ${gestorToken1}`)
        .send({ loteId });

      expect(startRes.status).toBe(201);
      const contagemId = startRes.body.id;
      contagemIds.push(contagemId);

      // OPERADOR tenta registrar a contagem física — deve ser 403 ANTES da correção
      // e 201 APÓS a correção (Feature 2)
      const registerRes = await request(app.getHttpServer())
        .post('/inventory/register')
        .set('Authorization', `Bearer ${operadorToken}`)
        .send({ contagemId, quantidadeFisica: 495 });

      // ← RED: este expect FALHA antes da correção (recebe 403)
      // ← GREEN: este expect PASSA após liberar OPERADOR no controller
      expect(registerRes.status).toBe(201);

      // Cleanup: garantir lote desbloqueado para os próximos testes
      await prisma.lote.update({ where: { id: loteId }, data: { emInventario: false } });
      await prisma.contagemInventario.update({ where: { id: contagemId }, data: { status: 'CONCLUIDO' } });
    });

    it('[GREEN] GESTOR pode chamar POST /inventory/start (sempre deve passar)', async () => {
      const res = await request(app.getHttpServer())
        .post('/inventory/start')
        .set('Authorization', `Bearer ${gestorToken1}`)
        .send({ loteId });

      expect(res.status).toBe(201);
      // O response NÃO deve expor quantidadeTeorica (proteção de Contagem Cega)
      expect(res.body.quantidadeTeorica).toBeUndefined();
      contagemIds.push(res.body.id);

      // Cleanup
      await prisma.lote.update({ where: { id: loteId }, data: { emInventario: false } });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // FEATURE 3 — Race Condition: dois Gestores abrindo contagem simultaneamente
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Feature 3 — Concorrência: TOCTOU em /inventory/start', () => {
    it('[RED] dois POST /inventory/start simultâneos para o mesmo lote produzem duas contagens (BUG)', async () => {
      // Garantir lote limpo
      await prisma.lote.update({ where: { id: loteId }, data: { emInventario: false } });

      // Disparar dois requests simultâneos — mesmo padrão usado nos testes de deadlock
      const [res1, res2] = await Promise.all([
        request(app.getHttpServer())
          .post('/inventory/start')
          .set('Authorization', `Bearer ${gestorToken1}`)
          .send({ loteId }),
        request(app.getHttpServer())
          .post('/inventory/start')
          .set('Authorization', `Bearer ${gestorToken2}`)
          .send({ loteId }),
      ]);

      const statuses = [res1.status, res2.status];
      console.log(`[Feature 3 RED] statuses: ${statuses}`);

      // Registrar IDs criados para cleanup
      if (res1.status === 201) contagemIds.push(res1.body.id);
      if (res2.status === 201) contagemIds.push(res2.body.id);

      // ← RED:   ambos retornam 201 (BUG confirmado — duas contagens abertas)
      // ← GREEN: exatamente 1 retorna 201 e 1 retorna 409 (protegido pelo lock)
      const successCount = statuses.filter(s => s === 201).length;
      const conflictCount = statuses.filter(s => s === 409).length;

      expect(successCount).toBe(1);   // ← FALHA no RED (ambos passam)
      expect(conflictCount).toBe(1);  // ← FALHA no RED (nenhum conflita)

      // Cleanup
      await prisma.lote.update({ where: { id: loteId }, data: { emInventario: false } });
    });
  });
});
