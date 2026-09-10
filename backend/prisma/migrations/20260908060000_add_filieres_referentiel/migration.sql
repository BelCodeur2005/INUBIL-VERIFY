/*
  Warnings:

  - You are about to drop the column `filiere` on the `documents` table. All the data in the column will be lost.

  Note : la vue v_documents_complets (0_init, recreee dans 20260818120000_drop_cid_ipfs)
  selectionne documents.filiere et empeche donc le DROP COLUMN. On la supprime avant
  la modification de schema puis on la recree en pointant filiere_id (memes colonnes
  qu'avant + filiere_code / filiere_nom via jointure sur filieres). Cette vue n'est
  pas utilisee par le backend (Prisma lit les tables directement) — meme demarche que
  pour cid_ipfs.
*/

-- DropView (dependance sur documents.filiere)
DROP VIEW IF EXISTS v_documents_complets;

-- CreateTable (avant l'ALTER pour permettre un backfill eventuel de filiere_id)
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
CREATE INDEX "idx_filieres_universite_id" ON "filieres"("universite_id");

-- CreateIndex
CREATE UNIQUE INDEX "filieres_code_universite_id_key" ON "filieres"("code", "universite_id");

-- AddForeignKey
ALTER TABLE "filieres" ADD CONSTRAINT "filieres_universite_id_fkey" FOREIGN KEY ("universite_id") REFERENCES "universites"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AlterTable : nouvelle colonne d'abord, backfill best-effort, puis suppression de l'ancienne
ALTER TABLE "documents" ADD COLUMN "filiere_id" UUID;

-- Backfill : pour chaque valeur texte distincte de documents.filiere, creer une
-- filiere rattachee a l'universite du document et lier filiere_id. No-op si la
-- colonne est vide. Le code est derive du libelle (majuscules, tronque a 50).
INSERT INTO "filieres" ("code", "nom", "universite_id", "ordre")
SELECT DISTINCT
    LEFT(UPPER(REGEXP_REPLACE(TRIM(d.filiere), '\s+', '_', 'g')), 50) AS code,
    TRIM(d.filiere) AS nom,
    d.universite_id,
    0
FROM "documents" d
WHERE d.filiere IS NOT NULL AND TRIM(d.filiere) <> ''
ON CONFLICT ("code", "universite_id") DO NOTHING;

UPDATE "documents" d
SET "filiere_id" = f.id
FROM "filieres" f
WHERE f.universite_id = d.universite_id
  AND f.nom = TRIM(d.filiere)
  AND d.filiere IS NOT NULL AND TRIM(d.filiere) <> '';

ALTER TABLE "documents" DROP COLUMN "filiere";

-- CreateIndex
CREATE INDEX "idx_documents_filiere_id" ON "documents"("filiere_id");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_filiere_id_fkey" FOREIGN KEY ("filiere_id") REFERENCES "filieres"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- RecreateView : identique a 20260818120000_drop_cid_ipfs, filiere -> filiere_id
-- (+ filiere_code / filiere_nom via jointure sur la nouvelle table filieres)
CREATE OR REPLACE VIEW v_documents_complets AS
SELECT
    d.id,
    d.numero_unique,
    d.url_verification,
    d.annee_academique,
    d.date_emission,
    d.date_validite,
    d.lieu_delivrance,
    d.filiere_id,
    f.code             AS filiere_code,
    f.nom              AS filiere_nom,
    d.donnees,
    d.moyenne_generale,
    d.note_sur,
    d.statut,
    d.hash_sha256,
    d.transaction_hash,
    d.reseau,
    d.qr_code_url,
    d.pdf_url,
    d.emis_le,
    d.created_at,
    -- Type de document
    td.id               AS type_document_id,
    td.code             AS type_document_code,
    td.nom              AS type_document_nom,
    td.categorie,
    td.niveau_bac_plus,
    td.a_matieres,
    td.est_partage,
    -- Mention
    md.code             AS mention_code,
    md.nom              AS mention_nom,
    -- Étudiant
    e.id                AS etudiant_id,
    e.numero_etudiant,
    e.nom               AS etudiant_nom,
    e.prenom            AS etudiant_prenom,
    e.email             AS etudiant_email,
    e.photo_url         AS etudiant_photo,
    -- Université
    u.id                AS universite_id,
    u.nom               AS universite_nom,
    u.nom_court         AS universite_nom_court,
    u.pays              AS universite_pays,
    u.logo_url          AS universite_logo
FROM documents d
JOIN etudiants          e  ON e.id  = d.etudiant_id
JOIN universites        u  ON u.id  = d.universite_id
JOIN types_document     td ON td.id = d.type_document_id
LEFT JOIN mentions_document md ON md.id = d.mention_id
LEFT JOIN filieres      f  ON f.id  = d.filiere_id
WHERE d.deleted_at IS NULL;
