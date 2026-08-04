import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.contagemInventario.deleteMany().then(() => console.log('Cleaned')).finally(() => prisma.$disconnect());
