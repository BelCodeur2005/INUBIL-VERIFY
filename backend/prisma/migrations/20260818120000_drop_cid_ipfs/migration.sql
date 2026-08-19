-- Migration : suppression du support IPFS/Pinata (non utilise)
-- Le stockage reel des fichiers passe par S3/R2 (backend/src/storage), pas IPFS.
-- La colonne cid_ipfs n'a jamais ete ecrite par le code applicatif.
--
-- La vue v_documents_complets (0_init) selectionne cid_ipfs et bloque donc le
-- DROP COLUMN direct. Elle n'est referencee nulle part dans le code applicatif
-- (verifie : aucun src/**/*.ts ne la mentionne) — on la recree simplement sans
-- cette colonne plutot que de la supprimer, au cas ou elle servirait a des
-- requetes SQL manuelles/reporting.

DROP VIEW IF EXISTS v_documents_complets;

ALTER TABLE "documents" DROP COLUMN IF EXISTS "cid_ipfs";

CREATE OR REPLACE VIEW v_documents_complets AS
SELECT
    d.id,
    d.numero_unique,
    d.url_verification,
    d.annee_academique,
    d.date_emission,
    d.date_validite,
    d.lieu_delivrance,
    d.filiere,
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
WHERE d.deleted_at IS NULL;
