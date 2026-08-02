import { PrismaClient } from '@prisma/client';

export async function backfillSaldoTeorico(prismaClient?: PrismaClient) {
    const prisma = prismaClient || new PrismaClient();
    let updatedCount = 0;
    try {
        // Prisma typing considers saldoTeorico as NOT NULL (Int) based on the current schema.
        // To query for null (before migration was fully applied), we can use raw queries or bypass types.
        const ajustesPendentes: any[] = await prisma.$queryRaw`
            SELECT id, "loteId" FROM "AjusteEstoque" 
            WHERE "statusAprovacao" = 'PENDENTE' AND "saldoTeorico" IS NULL
        `;

        console.log(`[BACKFILL] Iniciando backfill de saldoTeorico para ${ajustesPendentes.length} ajustes PENDENTES.`);

        if (ajustesPendentes.length > 0) {
            console.log(`[ATENÇÃO] O valor de lote.quantidade ATUAL será usado como melhor aproximação disponível.`);
            console.log(`[ATENÇÃO] Esta é uma aproximação imperfeita para dados legados, pois a fotografia real do momento da solicitação original foi perdida.`);
        }

        for (const ajuste of ajustesPendentes) {
            const lote = await prisma.lote.findUnique({
                where: { id: ajuste.loteId }
            });

            if (lote) {
                await prisma.$executeRaw`
                    UPDATE "AjusteEstoque"
                    SET "saldoTeorico" = ${lote.quantidade}
                    WHERE id = ${ajuste.id}
                `;
                updatedCount++;
            }
        }

        console.log(`[BACKFILL] Sucesso! ${updatedCount} ajustes atualizados.`);
    } catch (error) {
        console.error(`[BACKFILL] Erro durante a atualização:`, error);
        throw error;
    } finally {
        if (!prismaClient) {
            await prisma.$disconnect();
        }
    }
    return updatedCount;
}

if (require.main === module) {
    backfillSaldoTeorico().catch(err => {
        console.error(err);
        process.exit(1);
    });
}
