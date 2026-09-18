-- AlterEnum
ALTER TYPE "Perfil" ADD VALUE 'CONTROLADORIA';

-- AlterEnum
ALTER TYPE "StatusAprovacao" ADD VALUE 'PENDENTE_CONTROLADORIA';

-- AlterTable
ALTER TABLE "AjusteEstoque" ADD COLUMN "aprovadorGestorId" INTEGER,
ADD COLUMN "aprovadorControladoriaId" INTEGER;

-- DropForeignKey
ALTER TABLE "ItemPedido" DROP CONSTRAINT "ItemPedido_pedidoId_fkey";

-- AddForeignKey
ALTER TABLE "AjusteEstoque" ADD CONSTRAINT "AjusteEstoque_aprovadorGestorId_fkey" FOREIGN KEY ("aprovadorGestorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AjusteEstoque" ADD CONSTRAINT "AjusteEstoque_aprovadorControladoriaId_fkey" FOREIGN KEY ("aprovadorControladoriaId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPedido" ADD CONSTRAINT "ItemPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "PedidoExpedicao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
