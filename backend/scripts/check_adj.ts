import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.ajusteEstoque.findMany().then(a => console.log('Ajustes no dev:', a.length)).finally(() => prisma.$disconnect());
