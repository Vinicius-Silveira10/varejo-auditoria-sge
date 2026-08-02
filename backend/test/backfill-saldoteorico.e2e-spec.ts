/**
 * TESTE DE BACKFILL: backfill-saldoteorico.e2e-spec.ts
 *
 * Prova que o script backfillSaldoTeorico funciona corretamente contra dados
 * sintéticos reais, incluindo:
 *
 * 1. 3 ajustes PENDENTE sem saldoTeorico (cada um com lote.quantidade diferente)
 *    → devem receber saldoTeorico = lote.quantidade do seu lote.
 * 2. 1 ajuste APROVADO sem saldoTeorico
 *    → NÃO deve ser tocado (o backfill só processa PENDENTE).
 * 3. 1 ajuste PENDENTE COM saldoTeorico já preenchido
 *    → NÃO deve ser sobrescrito.
 *
 * O teste roda contra o banco efêmero Docker (fortal_sge_e2e:5434).
 * Não usa AppModule para ser independente de Redis/Bull/WebSocket.
 */

import { PrismaClient } from '@prisma/client';
import { backfillSaldoTeorico } from '../scripts/backfill_saldoteorico';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

async function criarUsuario(prisma: PrismaClient, suffix: string) {
  return prisma.usuario.create({
    data: {
      nome: `Usuário BKF ${suffix}`,
      email: `bkf-${suffix}-${Date.now()}@test.com`,
      senha: 'hash-irrelevante',
      perfil: 'OPERADOR',
    },
  });
}

async function criarProduto(prisma: PrismaClient, suffix: string) {
  return prisma.produto.create({
    data: {
      sku: `BKF-SKU-${suffix}-${Date.now()}`,
      descricao: `Produto Backfill ${suffix}`,
      categoria: 'Teste',
      custoMedio: 10.0,
    },
  });
}

async function criarLote(prisma: PrismaClient, produtoId: number, quantidade: number, suffix: string) {
  return prisma.lote.create({
    data: {
      numeroLote: `BKF-LOTE-${suffix}-${Date.now()}`,
      produtoId,
      quantidade,
    },
  });
}

/**
 * Insere um AjusteEstoque COM saldoTeorico = NULL, contornando a restrição NOT NULL
 * do Prisma atual via SQL raw. Simula exatamente o estado legado que o backfill deve corrigir.
 */
async function inserirAjusteSemSaldoTeorico(
  prisma: PrismaClient,
  loteId: number,
  solicitanteId: number,
  statusAprovacao: 'PENDENTE' | 'APROVADO' | 'REJEITADO',
): Promise<number> {
  const rows = await prisma.$queryRaw<{ id: number }[]>`
    INSERT INTO "AjusteEstoque"
      ("loteId", "quantidadeDelta", "motivo", "valorDelta", "statusAprovacao", "solicitanteId", "atualizadoEm")
    VALUES
      (${loteId}, 1, 'dado legado sem saldoTeorico', 0, ${statusAprovacao}::"StatusAprovacao", ${solicitanteId}, NOW())
    RETURNING id
  `;
  return rows[0].id;
}

// ──────────────────────────────────────────────────────────────────────────────
// Suite
// ──────────────────────────────────────────────────────────────────────────────

describe('Backfill saldoTeorico (e2e — banco efêmero Docker)', () => {
  let prisma: PrismaClient;

  // IDs para cleanup
  const ajusteIds: number[] = [];
  const loteIds: number[] = [];
  const produtoIds: number[] = [];
  let usuarioId: number;

  beforeAll(async () => {
    prisma = new PrismaClient();

    // Verificar conexão
    await prisma.$connect();

    // ── Pré-condição: relaxar NOT NULL para simular dados legados ──────────────
    await prisma.$executeRaw`ALTER TABLE "AjusteEstoque" ALTER COLUMN "saldoTeorico" DROP NOT NULL`;

    const usuario = await criarUsuario(prisma, 'A');
    usuarioId = usuario.id;

    // ── 3 Lotes com quantidades distintas (valores esperados após backfill) ────
    const qtds = [50, 200, 75]; // os três "saldoTeorico" esperados
    for (let i = 0; i < 3; i++) {
      const prod = await criarProduto(prisma, `${i}`);
      produtoIds.push(prod.id);
      const lote = await criarLote(prisma, prod.id, qtds[i], `${i}`);
      loteIds.push(lote.id);
    }

    // ── Ajustes PENDENTE sem saldoTeorico (alvo principal do backfill) ─────────
    for (const loteId of loteIds) {
      const id = await inserirAjusteSemSaldoTeorico(prisma, loteId, usuarioId, 'PENDENTE');
      ajusteIds.push(id);
    }

    // ── Ajuste APROVADO sem saldoTeorico (não deve ser tocado) ────────────────
    const idAprovado = await inserirAjusteSemSaldoTeorico(prisma, loteIds[0], usuarioId, 'APROVADO');
    ajusteIds.push(idAprovado); // para cleanup

    // ── Ajuste PENDENTE COM saldoTeorico já preenchido (não deve ser sobrescrito) ──
    const idComSaldo = await prisma.$queryRaw<{ id: number }[]>`
      INSERT INTO "AjusteEstoque"
        ("loteId", "quantidadeDelta", "motivo", "valorDelta", "saldoTeorico", "statusAprovacao", "solicitanteId", "atualizadoEm")
      VALUES
        (${loteIds[0]}, 1, 'ajuste com saldo já preenchido', 0, 999, 'PENDENTE', ${usuarioId}, NOW())
      RETURNING id
    `;
    ajusteIds.push(idComSaldo[0].id);
  });

  afterAll(async () => {
    // Cleanup em ordem de FK
    if (ajusteIds.length > 0) {
      await prisma.$executeRaw`DELETE FROM "AjusteEstoque" WHERE id = ANY(${ajusteIds}::int[])`;
    }
    for (const loteId of loteIds) {
      await prisma.movimentacao.deleteMany({ where: { loteId } });
      await prisma.lote.delete({ where: { id: loteId } }).catch(() => {});
    }
    for (const produtoId of produtoIds) {
      await prisma.produto.delete({ where: { id: produtoId } }).catch(() => {});
    }
    if (usuarioId) {
      await prisma.usuario.delete({ where: { id: usuarioId } }).catch(() => {});
    }

    // Restaurar NOT NULL
    await prisma.$executeRaw`ALTER TABLE "AjusteEstoque" ALTER COLUMN "saldoTeorico" SET NOT NULL`;

    await prisma.$disconnect();
  });

  // ──────────────────────────────────────────────────────────────────────────────

  it('deve confirmar que os 3 ajustes PENDENTE têm saldoTeorico NULL antes do backfill', async () => {
    const nullRows = await prisma.$queryRaw<{ id: number; saldo: number | null }[]>`
      SELECT id, "saldoTeorico" AS saldo FROM "AjusteEstoque"
      WHERE id = ANY(${ajusteIds.slice(0, 3)}::int[])
    `;
    expect(nullRows).toHaveLength(3);
    for (const row of nullRows) {
      expect(row.saldo).toBeNull();
    }
  });

  it('deve executar o backfill e retornar exactamente 3 registros atualizados', async () => {
    const updatedCount = await backfillSaldoTeorico(prisma);

    expect(updatedCount).toBe(3); // só os PENDENTE sem saldo
    console.log(`[BACKFILL] ${updatedCount} registros atualizados — conforme esperado.`);
  });

  it('deve atribuir a cada ajuste PENDENTE o saldoTeorico = lote.quantidade do seu lote', async () => {
    // Cenário: lotes tinham quantidades 50, 200, 75 — nessa ordem
    const lotesQtds = [50, 200, 75];

    for (let i = 0; i < 3; i++) {
      const rows = await prisma.$queryRaw<{ saldoTeorico: number }[]>`
        SELECT "saldoTeorico" FROM "AjusteEstoque" WHERE id = ${ajusteIds[i]}
      `;
      const saldo = rows[0].saldoTeorico;
      console.log(`  Ajuste #${ajusteIds[i]} (lote.quantidade=${lotesQtds[i]}) → saldoTeorico=${saldo}`);
      expect(saldo).toBe(lotesQtds[i]);
    }
  });

  it('NÃO deve tocar o ajuste APROVADO (saldoTeorico permanece NULL)', async () => {
    const idAprovado = ajusteIds[3]; // 4º elemento
    const rows = await prisma.$queryRaw<{ saldoTeorico: number | null }[]>`
      SELECT "saldoTeorico" FROM "AjusteEstoque" WHERE id = ${idAprovado}
    `;
    expect(rows[0].saldoTeorico).toBeNull();
  });

  it('NÃO deve sobrescrever ajuste PENDENTE que já tem saldoTeorico preenchido', async () => {
    const idComSaldo = ajusteIds[4]; // 5º elemento
    const rows = await prisma.$queryRaw<{ saldoTeorico: number }[]>`
      SELECT "saldoTeorico" FROM "AjusteEstoque" WHERE id = ${idComSaldo}
    `;
    expect(rows[0].saldoTeorico).toBe(999); // valor original intacto
  });
});
