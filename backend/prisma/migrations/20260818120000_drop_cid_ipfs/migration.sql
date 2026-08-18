-- Migration : suppression du support IPFS/Pinata (non utilise)
-- Le stockage reel des fichiers passe par S3/R2 (backend/src/storage), pas IPFS.
-- La colonne cid_ipfs n'a jamais ete ecrite par le code applicatif.

ALTER TABLE "documents" DROP COLUMN IF EXISTS "cid_ipfs";
