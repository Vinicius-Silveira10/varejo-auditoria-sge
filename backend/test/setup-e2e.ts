import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

afterAll(async () => {
  // 🧹 GLOBAL E2E CLEANUP
  // Isso roda após o final de *cada* arquivo de teste (suíte).
  // 
  // BUG-007 Fix: Limpa a tabela ChainPointer para garantir que a cadeia
  // de hash seja recomeçada do zero no próximo teste. Sem isso, suítes que
  // criam e deletam Movimentações/LogCustos deixavam um "rastro" no 
  // ChainPointer, corrompendo os testes de auditoria subsequentes.
  await prisma.logCusto.deleteMany({});
  await prisma.movimentacao.deleteMany({});
  await prisma.chainPointer.deleteMany({});
  await prisma.$disconnect();
});
