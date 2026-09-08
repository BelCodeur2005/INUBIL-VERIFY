-- DropForeignKey
ALTER TABLE "documents" DROP CONSTRAINT "documents_rejete_par_fkey";

-- AlterTable
ALTER TABLE "etudiants" ADD COLUMN     "departement_id" UUID;

-- AlterTable
ALTER TABLE "utilisateurs" ADD COLUMN     "departement_id" UUID;

-- CreateTable
CREATE TABLE "departements" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "code" VARCHAR(50) NOT NULL,
    "nom" VARCHAR(150) NOT NULL,
    "universite_id" UUID NOT NULL,
    "est_actif" BOOLEAN NOT NULL DEFAULT true,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "departements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_departements_universite_id" ON "departements"("universite_id");

-- CreateIndex
CREATE UNIQUE INDEX "departements_code_universite_id_key" ON "departements"("code", "universite_id");

-- CreateIndex
CREATE INDEX "idx_etudiants_departement_id" ON "etudiants"("departement_id");

-- CreateIndex
CREATE INDEX "idx_utilisateurs_departement_id" ON "utilisateurs"("departement_id");

-- AddForeignKey
ALTER TABLE "departements" ADD CONSTRAINT "departements_universite_id_fkey" FOREIGN KEY ("universite_id") REFERENCES "universites"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_rejete_par_fkey" FOREIGN KEY ("rejete_par") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "etudiants" ADD CONSTRAINT "etudiants_departement_id_fkey" FOREIGN KEY ("departement_id") REFERENCES "departements"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "utilisateurs" ADD CONSTRAINT "utilisateurs_departement_id_fkey" FOREIGN KEY ("departement_id") REFERENCES "departements"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
