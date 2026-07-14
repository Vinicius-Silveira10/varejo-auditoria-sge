import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Encontra todos os endereços
  const addresses = await prisma.endereco.findMany();
  
  for (const addr of addresses) {
    if (addr.ocupado > 0) {
      const movs = await prisma.movimentacao.findMany({
        where: {
          OR: [
             { enderecoDestinoId: addr.id },
             { enderecoOrigemId: addr.id }
          ]
        }
      });
      console.log(`\nEndereco ID ${addr.id} (ocupado=${addr.ocupado}): tem ${movs.length} movs.`);
      for (const m of movs) {
        console.log(`  -> Tipo: ${m.tipo}, Qtd: ${m.quantidade}`);
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
