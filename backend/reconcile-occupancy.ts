import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- RECONCILIAÇÃO DE OCUPAÇÃO DE ENDEREÇOS ---');
  
  const enderecos = await prisma.endereco.findMany();
  let divergencias = 0;

  for (const endereco of enderecos) {
    // Calcular a ocupação real usando as movimentações
    // Ocupação = SUM(quantidade) de ARMAZENAGEM onde enderecoDestinoId = endereco.id
    //          - SUM(quantidade) de EXPEDICAO onde enderecoOrigemId = endereco.id
    
    const movsArmazenagem = await prisma.movimentacao.aggregate({
      where: {
        tipo: 'ARMAZENAGEM',
        enderecoDestinoId: endereco.id
      },
      _sum: { quantidade: true }
    });

    const movsExpedicao = await prisma.movimentacao.aggregate({
      where: {
        tipo: 'EXPEDICAO',
        enderecoOrigemId: endereco.id
      },
      _sum: { quantidade: true }
    });

    const armazenado = movsArmazenagem._sum.quantidade || 0;
    const expedido = movsExpedicao._sum.quantidade || 0;
    const ocupacaoReal = armazenado - expedido;

    if (endereco.ocupado !== ocupacaoReal) {
      console.log(`Endereço [${endereco.codigo}] ID: ${endereco.id} | Ocupado Atual: ${endereco.ocupado} | Ocupação Real: ${ocupacaoReal}`);
      divergencias++;

      // Aplica a correção
      await prisma.endereco.update({
        where: { id: endereco.id },
        data: { ocupado: ocupacaoReal }
      });
      console.log(` > Corrigido para ${ocupacaoReal}`);
    }
  }

  console.log(`\nReconciliação concluída. ${divergencias} endereços corrigidos.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
