/*
  Warnings:

  - You are about to drop the column `departement_id` on the `utilisateurs` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "utilisateurs" DROP CONSTRAINT "utilisateurs_departement_id_fkey";

-- DropIndex
DROP INDEX "idx_utilisateurs_departement_id";

-- AlterTable
ALTER TABLE "utilisateurs" DROP COLUMN "departement_id";

-- CreateTable
CREATE TABLE "_utilisateurs_departements" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_utilisateurs_departements_AB_unique" ON "_utilisateurs_departements"("A", "B");

-- CreateIndex
CREATE INDEX "_utilisateurs_departements_B_index" ON "_utilisateurs_departements"("B");

-- AddForeignKey
ALTER TABLE "_utilisateurs_departements" ADD CONSTRAINT "_utilisateurs_departements_A_fkey" FOREIGN KEY ("A") REFERENCES "departements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_utilisateurs_departements" ADD CONSTRAINT "_utilisateurs_departements_B_fkey" FOREIGN KEY ("B") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
