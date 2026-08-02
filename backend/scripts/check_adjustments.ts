import { PrismaClient } from '@prisma/client';

async function checkPendingAdjustments() {
  const prisma = new PrismaClient();
  try {
    const pendentes = await prisma.ajusteEstoque.count({
      where: { statusAprovacao: 'PENDENTE' },
    });
    console.log(`[VERIFICAÇÃO] Encontrados ${pendentes} ajustes PENDENTES no ambiente dev/local.`);
  } catch (error) {
    console.error('Erro ao verificar ajustes pendentes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPendingAdjustments();
