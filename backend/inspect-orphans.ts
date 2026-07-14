import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.usuario.findMany({
    where: {
      OR: [
        { email: { startsWith: 'admin-' } },
        { email: { startsWith: 'auditor-' } }
      ]
    }
  });
  console.log('Orphan Users:', users.map(u => u.email));

  const addrs = await prisma.endereco.findMany({
    where: {
      OR: [
        { codigo: { startsWith: 'ADDR-FLOW-' } },
        { codigo: { startsWith: 'ADDR-AUDIT-' } }
      ]
    }
  });
  console.log('Orphan Addrs:', addrs.map(a => a.codigo));
}

main().catch(console.error).finally(() => prisma.$disconnect());
