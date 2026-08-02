/*
  Warnings:

  - Made the column `saldoTeorico` on table `AjusteEstoque` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "AjusteEstoque" ALTER COLUMN "saldoTeorico" SET NOT NULL;
