import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- LIMPANDO ÓRFÃOS EXISTENTES ---');

  // Limpa tudo que começa com esses prefixos:
  // ItemPedido, PedidoExpedicao
  const pedidos = await prisma.pedidoExpedicao.findMany({
    where: { OR: [{ codigoPedido: { startsWith: 'PED-FLOW-' } }] }
  });
  for (const p of pedidos) {
    await prisma.itemPedido.deleteMany({ where: { pedidoId: p.id } });
    await prisma.pedidoExpedicao.delete({ where: { id: p.id } });
  }

  // Movimentacao, Lote
  const lotes = await prisma.lote.findMany({
    where: { OR: [{ numeroLote: { startsWith: 'L-FLOW-' } }, { numeroLote: { startsWith: 'L-AUDIT-' } }] }
  });
  for (const l of lotes) {
    await prisma.movimentacao.deleteMany({ where: { loteId: l.id } });
    await prisma.lote.delete({ where: { id: l.id } });
  }

  // Produtos
  await prisma.produto.deleteMany({
    where: { OR: [{ sku: { startsWith: 'FLOW-' } }, { sku: { startsWith: 'AUDIT-' } }] }
  });

  // Enderecos
  await prisma.endereco.deleteMany({
    where: { OR: [{ codigo: { startsWith: 'ADDR-FLOW-' } }, { codigo: { startsWith: 'ADDR-AUDIT-' } }] }
  });

  // Usuarios
  await prisma.usuario.deleteMany({
    where: { OR: [{ email: { startsWith: 'admin-' } }, { email: { startsWith: 'auditor-' } }] }
  });

  console.log('Feito.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
