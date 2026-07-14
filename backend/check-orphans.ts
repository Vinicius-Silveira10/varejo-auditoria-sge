import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.usuario.count({
    where: {
      OR: [
        { email: { startsWith: 'admin-' } },
        { email: { startsWith: 'auditor-' } }
      ]
    }
  });

  const products = await prisma.produto.count({
    where: {
      OR: [
        { sku: { startsWith: 'FLOW-' } },
        { sku: { startsWith: 'AUDIT-' } }
      ]
    }
  });

  const batches = await prisma.lote.count({
    where: {
      OR: [
        { numeroLote: { startsWith: 'L-FLOW-' } },
        { numeroLote: { startsWith: 'L-AUDIT-' } }
      ]
    }
  });

  const orders = await prisma.pedidoExpedicao.count({
    where: {
      OR: [
        { codigoPedido: { startsWith: 'PED-FLOW-' } }
      ]
    }
  });

  const addresses = await prisma.endereco.count({
    where: {
      OR: [
        { codigo: { startsWith: 'ADDR-FLOW-' } },
        { codigo: { startsWith: 'ADDR-AUDIT-' } }
      ]
    }
  });

  console.log('--- RELATÓRIO DE DADOS ÓRFÃOS DE TESTE ---');
  console.log(`Usuários (admin-*, auditor-*): ${users}`);
  console.log(`Produtos (FLOW-*, AUDIT-*): ${products}`);
  console.log(`Lotes (L-FLOW-*, L-AUDIT-*): ${batches}`);
  console.log(`Pedidos (PED-FLOW-*): ${orders}`);
  console.log(`Endereços (ADDR-FLOW-*, ADDR-AUDIT-*): ${addresses}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
