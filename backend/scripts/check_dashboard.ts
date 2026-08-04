import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  console.log('--- 2.2 INVENTORY ACCURACY ---');
  const countContagens = await prisma.contagemInventario.count();
  console.log(`Total ContagemInventario no DB: ${countContagens}`);

  console.log('\n--- 2.3 OCCUPATION DRIFT ---');
  const enderecos = await prisma.endereco.findMany();
  let divergencias = 0;
  for (const end of enderecos) {
    const entradas = await prisma.movimentacao.aggregate({
      where: { enderecoDestinoId: end.id },
      _sum: { quantidade: true },
    });
    const saidas = await prisma.movimentacao.aggregate({
      where: { enderecoOrigemId: end.id },
      _sum: { quantidade: true },
    });
    
    const ocupadoReal = (entradas._sum.quantidade || 0) - (saidas._sum.quantidade || 0);
    if (ocupadoReal !== end.ocupado) {
      console.log(`Divergência no Endereço ${end.codigo} (ID: ${end.id}): Ocupado db=${end.ocupado}, Real Movimentado=${ocupadoReal}`);
      divergencias++;
    }
  }
  if (divergencias === 0) console.log('SEM DIVERGÊNCIA DE OCUPAÇÃO ENCONTRADA.');

  console.log('\n--- 2.4 DEAD STOCK KPI ---');
  const cutOffDate = new Date();
  cutOffDate.setDate(cutOffDate.getDate() - 90);
  const lotesDead = await prisma.lote.findMany({
    where: { ativo: true, quantidade: { gt: 0 } },
    include: {
      movimentacoes: { where: { criadoEm: { gte: cutOffDate } } }
    }
  });
  const parados90Dias = lotesDead.filter((l) => l.movimentacoes.length === 0).length;
  console.log(`Total de lotes com quantidade > 0: ${lotesDead.length}`);
  console.log(`Lotes mortos (sem movimentação nos ultimos 90 dias): ${parados90Dias}`);

  await prisma.$disconnect();
}

run().catch(console.error);
