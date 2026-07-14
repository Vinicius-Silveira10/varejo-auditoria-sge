import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const addresses = await prisma.endereco.findMany();
  let discrepantCount = 0;
  
  console.log(`Checking ${addresses.length} addresses...`);

  for (const addr of addresses) {
    const raw: any[] = await prisma.$queryRaw`
      SELECT 
        COALESCE(SUM(CASE WHEN m.tipo = 'ARMAZENAGEM' THEN m.quantidade ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN m.tipo = 'EXPEDICAO' AND m."enderecoOrigemId" = ${addr.id} THEN m.quantidade ELSE 0 END), 0) as real_occupation
      FROM "Movimentacao" m
      WHERE m."enderecoDestinoId" = ${addr.id} OR m."enderecoOrigemId" = ${addr.id}
    `;
    const realOcc = Number(raw[0]?.real_occupation || 0);
    if (realOcc !== addr.ocupado) {
      console.log(`Endereco ${addr.codigo} (ID: ${addr.id}) - Ocupado DB: ${addr.ocupado}, Calculado: ${realOcc}`);
      discrepantCount++;
    }
  }
  
  console.log(`\nTotal de enderecos com discrepancia: ${discrepantCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
