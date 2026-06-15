-- Migration : ajout du rejet de document par le directeur pedagogique
-- Ajoute la valeur "rejete" a l'enum statut_document
-- et les colonnes de traçabilite du rejet sur la table documents.

ALTER TYPE "statut_document" ADD VALUE IF NOT EXISTS 'rejete';

ALTER TABLE "documents"
  ADD COLUMN IF NOT EXISTS "motif_rejet"  TEXT,
  ADD COLUMN IF NOT EXISTS "rejete_par"   UUID REFERENCES "utilisateurs"("id") ON UPDATE NO ACTION,
  ADD COLUMN IF NOT EXISTS "rejete_le"    TIMESTAMPTZ;
