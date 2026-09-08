/*
  Warnings:

  - You are about to drop the column `filiere` on the `documents` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "documents" DROP COLUMN "filiere",
ADD COLUMN     "filiere_id" UUID;

-- CreateTable
CREATE TABLE "filieres" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "code" VARCHAR(50) NOT NULL,
    "nom" VARCHAR(150) NOT NULL,
    "universite_id" UUID NOT NULL,
    "est_actif" BOOLEAN NOT NULL DEFAULT true,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "filieres_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_documents_filiere_id" ON "documents"("filiere_id");

-- CreateIndex
CREATE INDEX "idx_filieres_universite_id" ON "filieres"("universite_id");

-- CreateIndex
CREATE UNIQUE INDEX "filieres_code_universite_id_key" ON "filieres"("code", "universite_id");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_filiere_id_fkey" FOREIGN KEY ("filiere_id") REFERENCES "filieres"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "filieres" ADD CONSTRAINT "filieres_universite_id_fkey" FOREIGN KEY ("universite_id") REFERENCES "universites"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
