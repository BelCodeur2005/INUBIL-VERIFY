-- ============================================================
-- PLATEFORME D'AUTHENTIFICATION DE DOCUMENTS — INUBIL
-- Schéma PostgreSQL — Architecture unifiée v2.0
-- Mai 2026
-- ============================================================
-- Tables : 22 | Vues : 6 | Fonctions : 5 | Triggers : 8
-- Types de documents supportés : diplômes, relevés, attestations,
--   certificats, bulletins — extensible sans modifier le code
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Wrapper IMMUTABLE autour de unaccent() pour permettre son usage dans les
-- index (unaccent() est STABLE par defaut, ce que PostgreSQL refuse dans une
-- expression d'index). Voir : recherche d'etudiant insensible aux accents.
CREATE OR REPLACE FUNCTION f_unaccent(text)
RETURNS text AS $$
  SELECT public.unaccent('public.unaccent', $1)
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT;

-- ============================================================
-- SECTION 1 — ENUMS
-- ============================================================

-- Statuts du cycle de vie des institutions
CREATE TYPE statut_universite    AS ENUM ('en_attente', 'approuvee', 'active', 'suspendue', 'rejetee');
CREATE TYPE type_universite      AS ENUM ('publique', 'privee', 'partenaire_fr', 'partenaire_international');

-- Statuts des comptes utilisateurs
CREATE TYPE statut_utilisateur   AS ENUM ('actif', 'inactif', 'suspendu', 'en_attente_email');

-- Catégories de documents (détermine le formulaire et les champs requis)
-- Toute l'app repose sur cette classification
CREATE TYPE categorie_document   AS ENUM ('diplome', 'releve', 'attestation', 'certificat', 'autre');

-- Cycle de vie unique pour TOUS les documents (diplômes, attestations, etc.)
CREATE TYPE statut_document      AS ENUM ('brouillon', 'en_validation', 'actif', 'revoque', 'expire');

-- Partages et vérifications
CREATE TYPE statut_partage       AS ENUM ('actif', 'expire', 'revoque');
CREATE TYPE type_verification    AS ENUM ('lien_unique', 'qr_code', 'hash', 'upload_pdf');
CREATE TYPE resultat_verification AS ENUM ('authentique', 'revoque', 'non_trouve', 'falsifie');

-- Blockchain
CREATE TYPE statut_transaction   AS ENUM ('en_attente', 'confirme', 'echoue');
CREATE TYPE type_transaction     AS ENUM ('emission', 'revocation');
CREATE TYPE reseau_blockchain    AS ENUM ('polygon_amoy', 'polygon_mainnet');

-- Communication
CREATE TYPE statut_notification  AS ENUM ('non_lue', 'lue', 'archivee');
CREATE TYPE statut_email         AS ENUM ('en_attente', 'envoye', 'echoue', 'rebondi');

-- Intégrations
CREATE TYPE statut_webhook       AS ENUM ('actif', 'inactif', 'en_erreur');

-- Notes
CREATE TYPE resultat_matiere     AS ENUM ('valide', 'ajourne', 'absent', 'dispense');
CREATE TYPE langue_app           AS ENUM ('fr', 'en');

-- Invitations (étudiants ET collaborateurs université)
CREATE TYPE statut_invitation    AS ENUM ('en_attente', 'acceptee', 'expiree');
CREATE TYPE cible_invitation     AS ENUM ('etudiant', 'collaborateur');

-- ============================================================
-- SECTION 2 — TABLES CŒUR
-- ============================================================

-- ------------------------------------------------------------
-- 2.1 Universités / Institutions partenaires
-- ------------------------------------------------------------
CREATE TABLE universites (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom                 VARCHAR(255) NOT NULL,
    nom_court           VARCHAR(50),
    pays                VARCHAR(100) NOT NULL DEFAULT 'Cameroun',
    ville               VARCHAR(100),
    adresse             TEXT,
    type                type_universite NOT NULL DEFAULT 'privee',
    logo_url            VARCHAR(500),
    site_web            VARCHAR(255),
    email_contact       VARCHAR(255),
    telephone           VARCHAR(50),
    description         TEXT,
    statut              statut_universite NOT NULL DEFAULT 'en_attente',
    approuvee_par       UUID,                         -- FK -> utilisateurs (différée)
    approuvee_le        TIMESTAMPTZ,
    raison_rejet        TEXT,
    config              JSONB NOT NULL DEFAULT '{}',  -- paramètres spécifiques à l'institution
    metadata            JSONB NOT NULL DEFAULT '{}',
    deleted_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by          UUID                          -- FK -> utilisateurs (différée)
);

-- ------------------------------------------------------------
-- 2.2 Rôles (RBAC — personnalisables par institution)
-- est_systeme = TRUE → non supprimable par les admins
-- universite_id = NULL → rôle global
-- ------------------------------------------------------------
CREATE TABLE roles (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom                 VARCHAR(100) NOT NULL,
    description         TEXT,
    est_systeme         BOOLEAN NOT NULL DEFAULT FALSE,
    universite_id       UUID REFERENCES universites(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by          UUID,                         -- FK -> utilisateurs (différée)
    UNIQUE (nom, universite_id)
);

-- ------------------------------------------------------------
-- 2.3 Permissions (fixes — définies par les développeurs)
-- ------------------------------------------------------------
CREATE TABLE permissions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom         VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    module      VARCHAR(50)  NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 2.4 Rôles ↔ Permissions
-- ------------------------------------------------------------
CREATE TABLE role_permissions (
    role_id         UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id   UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    accordee_par    UUID,                             -- FK -> utilisateurs (différée)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

-- ------------------------------------------------------------
-- 2.5 Utilisateurs
-- ------------------------------------------------------------
CREATE TABLE utilisateurs (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom                         VARCHAR(100) NOT NULL,
    prenom                      VARCHAR(100) NOT NULL,
    email                       VARCHAR(255) NOT NULL UNIQUE,
    mot_de_passe                VARCHAR(255) NOT NULL,        -- bcrypt hash
    role_id                     UUID REFERENCES roles(id),
    universite_id               UUID REFERENCES universites(id) ON DELETE SET NULL,
    statut                      statut_utilisateur NOT NULL DEFAULT 'en_attente_email',
    email_verifie               BOOLEAN NOT NULL DEFAULT FALSE,
    token_verification_email    VARCHAR(255),
    token_verification_expiry   TIMESTAMPTZ,
    token_reset_password        VARCHAR(255),
    token_reset_expiry          TIMESTAMPTZ,
    tentatives_connexion        INT NOT NULL DEFAULT 0,
    bloque_jusqu                TIMESTAMPTZ,
    derniere_connexion          TIMESTAMPTZ,
    avatar_url                  VARCHAR(500),
    langue                      langue_app NOT NULL DEFAULT 'fr',
    preferences                 JSONB NOT NULL DEFAULT '{}',
    metadata                    JSONB NOT NULL DEFAULT '{}',
    deleted_at                  TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                  UUID REFERENCES utilisateurs(id)
);

-- Résolution des FKs circulaires (universites <-> utilisateurs)
ALTER TABLE universites
    ADD CONSTRAINT fk_universites_approuvee_par FOREIGN KEY (approuvee_par) REFERENCES utilisateurs(id),
    ADD CONSTRAINT fk_universites_created_by    FOREIGN KEY (created_by)    REFERENCES utilisateurs(id);

ALTER TABLE roles
    ADD CONSTRAINT fk_roles_created_by FOREIGN KEY (created_by) REFERENCES utilisateurs(id);

ALTER TABLE role_permissions
    ADD CONSTRAINT fk_rp_accordee_par FOREIGN KEY (accordee_par) REFERENCES utilisateurs(id);

-- ============================================================
-- SECTION 2.6 — PARTENARIATS INTER-UNIVERSITÉS
-- Modélise les relations formelles d'INUBIL avec ses partenaires
-- (tutelles, partenaires France, accréditations mutuelles, etc.)
-- universite_id    → institution côté INUBIL (souvent INUBIL elle-même)
-- universite_liee_id → l'institution partenaire
-- ============================================================

CREATE TABLE partenariats_universite (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    universite_id       UUID NOT NULL REFERENCES universites(id) ON DELETE CASCADE,
    universite_liee_id  UUID NOT NULL REFERENCES universites(id) ON DELETE CASCADE,
    type_partenariat    VARCHAR(50) NOT NULL
                        CHECK (type_partenariat IN (
                            'tutelle',
                            'partenaire_national',
                            'partenaire_fr',
                            'partenaire_international',
                            'reconnaissance_mutuelle'
                        )),
    date_debut          DATE,
    date_fin            DATE,
    description         TEXT,
    document_url        VARCHAR(500),                     -- lien vers la convention signée (PDF)
    statut              VARCHAR(20) NOT NULL DEFAULT 'actif'
                        CHECK (statut IN ('actif', 'expire', 'resilie')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by          UUID REFERENCES utilisateurs(id),
    CONSTRAINT chk_partenariat_no_self CHECK (universite_id != universite_liee_id),
    UNIQUE (universite_id, universite_liee_id, type_partenariat)
);

-- ============================================================
-- SECTION 3 — TYPES CONFIGURABLES
-- (créés après universites car ils peuvent y être liés)
-- ============================================================

-- ------------------------------------------------------------
-- 3.1 Types de documents
--
-- universite_id = NULL  → type global disponible pour toutes les institutions
-- universite_id = <id>  → type propre à une institution (ex: "Certificat maison")
--
-- categorie  → détermine le comportement de l'app :
--   'diplome'     → formulaire avec filière, mention, moyenne
--   'releve'      → formulaire avec semestres + table matieres_document
--   'attestation' → formulaire avec motif et période
--   'certificat'  → formulaire avec motif
--   'autre'       → formulaire générique
--
-- a_matieres → TRUE = ce type a un détail ligne par ligne de matières
-- est_partage → TRUE = l'étudiant peut partager ce type avec des tiers
-- ------------------------------------------------------------
CREATE TABLE types_document (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code            VARCHAR(50)  NOT NULL,
    nom             VARCHAR(200) NOT NULL,
    nom_court       VARCHAR(50),
    categorie       categorie_document NOT NULL,
    niveau_bac_plus INT,                              -- pertinent pour diplômes uniquement
    pays            VARCHAR(100) DEFAULT 'International',
    universite_id   UUID REFERENCES universites(id) ON DELETE CASCADE,
    a_matieres      BOOLEAN NOT NULL DEFAULT FALSE,
    est_partage     BOOLEAN NOT NULL DEFAULT FALSE,
    est_actif       BOOLEAN NOT NULL DEFAULT TRUE,
    ordre           INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (code, universite_id)
);

-- ------------------------------------------------------------
-- 3.2 Mentions / grades
--
-- universite_id = NULL → mention globale (franco-camerounaise, anglo-saxonne...)
-- universite_id = <id> → mention propre à une institution
-- ------------------------------------------------------------
CREATE TABLE mentions_document (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code            VARCHAR(50)  NOT NULL,
    nom             VARCHAR(100) NOT NULL,
    note_min        DECIMAL(5,2),                     -- seuil bas de la mention
    note_max        DECIMAL(5,2),                     -- seuil haut de la mention
    universite_id   UUID REFERENCES universites(id) ON DELETE CASCADE,
    est_actif       BOOLEAN NOT NULL DEFAULT TRUE,
    ordre           INT NOT NULL DEFAULT 0,           -- tri : 10 = meilleur, 50 = passable
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (code, universite_id)
);

-- ============================================================
-- SECTION 4 — ÉTUDIANTS
-- ============================================================

CREATE TABLE etudiants (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    utilisateur_id      UUID UNIQUE REFERENCES utilisateurs(id) ON DELETE SET NULL,
    numero_etudiant     VARCHAR(50) NOT NULL UNIQUE,
    nom                 VARCHAR(100) NOT NULL,
    prenom              VARCHAR(100) NOT NULL,
    date_naissance      DATE,
    lieu_naissance      VARCHAR(150),
    nationalite         VARCHAR(100),
    email               VARCHAR(255),
    telephone           VARCHAR(50),
    photo_url           VARCHAR(500),
    universite_id       UUID NOT NULL REFERENCES universites(id),
    annee_entree        INT,
    metadata            JSONB NOT NULL DEFAULT '{}',
    deleted_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by          UUID REFERENCES utilisateurs(id)
);

-- ============================================================
-- SECTION 5 — DOCUMENTS (TABLE UNIFIÉE)
-- ============================================================

-- ------------------------------------------------------------
-- Table principale — TOUS les documents émis par INUBIL
--
-- Diplômes, relevés, attestations, certificats, bulletins...
-- tout est ici. La catégorie vient de types_document.
--
-- Le champ JSONB "donnees" stocke les métadonnées propres à
-- chaque type :
--   Diplôme     → {"filiere": "Informatique", "specialite": "IA"}
--   Relevé      → {"semestre": 2, "niveau": "L2", "credits_valides": 28, "rang": 3}
--   Attestation → {"motif": "fréquentation", "periode": "2023-2024"}
--   Certificat  → {"motif": "scolarité", "statut_etudiant": "régulier"}
-- ------------------------------------------------------------
CREATE TABLE documents (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Identifiants publics
    numero_unique           VARCHAR(20) NOT NULL UNIQUE,
    url_verification        VARCHAR(500) GENERATED ALWAYS AS
                            ('https://verify.inubil.com/d/' || numero_unique) STORED,

    -- Parties
    etudiant_id             UUID NOT NULL REFERENCES etudiants(id),
    universite_id           UUID NOT NULL REFERENCES universites(id),

    -- Type (lie à la catégorie : diplôme / relevé / attestation...)
    type_document_id        UUID NOT NULL REFERENCES types_document(id),

    -- Informations communes à tous les documents
    annee_academique        VARCHAR(9),               -- '2023-2024'
    date_emission           DATE NOT NULL,
    date_validite           DATE,                     -- pour attestations temporaires
    lieu_delivrance         VARCHAR(150),
    filiere                 VARCHAR(255),                     -- champ direct : évite un JSONB parse pour le filtre le plus fréquent

    -- Données spécifiques au type (schéma flexible)
    donnees                 JSONB NOT NULL DEFAULT '{}',

    -- Mention et résultat (diplômes et relevés)
    mention_id              UUID REFERENCES mentions_document(id),
    note_sur                DECIMAL(5,2) NOT NULL DEFAULT 20,  -- barème : 20 (franco-camerounais) ou 100 (anglo-saxon)
    moyenne_generale        DECIMAL(5,2),

    -- Fichier PDF
    pdf_url                 VARCHAR(500),
    pdf_taille_ko           INT,
    pdf_chiffre             BOOLEAN NOT NULL DEFAULT FALSE,  -- TRUE = PDF chiffré avant upload IPFS (cahier §9.2)
    chiffrement_iv          VARCHAR(32),                     -- vecteur d'initialisation (hex) du chiffrement AES
    chiffrement_cle_wrappee TEXT,                            -- clé de données (DEK) chiffrée par la clé maître (env/KMS) — la clé maître n'est JAMAIS stockée ici

    -- Blockchain & IPFS
    hash_sha256             VARCHAR(64) UNIQUE,       -- empreinte du PDF (64 hex = SHA-256)
    cid_ipfs                VARCHAR(100),             -- Content Identifier sur IPFS/Pinata
    adresse_contrat         VARCHAR(42),              -- adresse du smart contract Polygon
    transaction_hash        VARCHAR(66),              -- 0x + 64 hex
    bloc_numero             BIGINT,
    reseau                  reseau_blockchain,

    -- QR Code
    qr_code_url             VARCHAR(500),

    -- Workflow de validation
    statut                  statut_document NOT NULL DEFAULT 'brouillon',
    saisi_par               UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,
    valide_par              UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,
    valide_le               TIMESTAMPTZ,
    emis_le                 TIMESTAMPTZ,
    revoque_par             UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,
    raison_revocation       TEXT,
    revoque_le              TIMESTAMPTZ,

    metadata                JSONB NOT NULL DEFAULT '{}',
    deleted_at              TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- La moyenne doit rester dans le barème déclaré (20 ou 100)
    CONSTRAINT chk_moyenne_dans_bareme CHECK (
        moyenne_generale IS NULL
        OR (moyenne_generale >= 0 AND moyenne_generale <= note_sur)
    )
);

-- ------------------------------------------------------------
-- Détail des matières (pour relevés et bulletins)
-- Lié à un document dont types_document.a_matieres = TRUE
-- ------------------------------------------------------------
CREATE TABLE matieres_document (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    code_matiere    VARCHAR(20),
    nom_matiere     VARCHAR(255) NOT NULL,
    credits         INT NOT NULL DEFAULT 0,
    coefficient     DECIMAL(4,2) NOT NULL DEFAULT 1,
    note            DECIMAL(5,2),
    note_max        DECIMAL(5,2) NOT NULL DEFAULT 20,
    resultat        resultat_matiere NOT NULL DEFAULT 'ajourne',
    semestre        INT,
    type_ue         VARCHAR(50),                      -- UE fondamentale, option, transversale...
    ordre           INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SECTION 5.5 — INVITATIONS (étudiants ET collaborateurs)
-- cible = 'etudiant'      : document émis pour un étudiant sans compte
--                           → etudiant_id requis
-- cible = 'collaborateur' : un responsable invite un agent de saisie
--                           ou un directeur pédagogique (F-UNIV-03, tâche #53)
--                           → role_id + universite_id requis
-- Statuts : en_attente → acceptee (ou expiree par cron job)
-- ============================================================

CREATE TABLE invitations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token           VARCHAR(64) NOT NULL UNIQUE,              -- token URL-safe (généré côté backend)
    cible           cible_invitation NOT NULL DEFAULT 'etudiant',
    email           VARCHAR(255) NOT NULL,
    -- Cas étudiant
    etudiant_id     UUID REFERENCES etudiants(id) ON DELETE CASCADE,
    document_id     UUID REFERENCES documents(id) ON DELETE SET NULL, -- document déclencheur
    -- Cas collaborateur université
    role_id         UUID REFERENCES roles(id),                -- rôle proposé au collaborateur
    universite_id   UUID REFERENCES universites(id) ON DELETE CASCADE,
    statut          statut_invitation NOT NULL DEFAULT 'en_attente',
    expires_at      TIMESTAMPTZ NOT NULL,
    accepted_at     TIMESTAMPTZ,
    nb_relances     INT NOT NULL DEFAULT 0,                   -- nombre de rappels email envoyés
    created_by      UUID REFERENCES utilisateurs(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Cohérence des champs selon la cible de l'invitation
    CONSTRAINT chk_invitation_cible CHECK (
        (cible = 'etudiant'      AND etudiant_id IS NOT NULL)
        OR
        (cible = 'collaborateur' AND role_id IS NOT NULL AND universite_id IS NOT NULL)
    )
);

-- ============================================================
-- SECTION 6 — PARTAGES
-- L'étudiant accorde à une institution tierce l'accès
-- à un de ses documents (relevé, attestation, etc.)
-- ============================================================

CREATE TABLE partages_document (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id                 UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    etudiant_id                 UUID NOT NULL REFERENCES etudiants(id),
    universite_destinataire_id  UUID REFERENCES universites(id),          -- NULL si partage vers email externe
    email_destinataire_externe  VARCHAR(255),                             -- NULL si destinataire enregistré
    token_acces                 VARCHAR(64) NOT NULL UNIQUE,
    date_expiration             TIMESTAMPTZ,                   -- NULL = pas de limite
    statut                      statut_partage NOT NULL DEFAULT 'actif',
    nb_consultations            INT NOT NULL DEFAULT 0,
    derniere_consultation       TIMESTAMPTZ,
    revoque_le                  TIMESTAMPTZ,
    revoque_par                 UUID REFERENCES utilisateurs(id),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_partage_destinataire CHECK (
        universite_destinataire_id IS NOT NULL OR email_destinataire_externe IS NOT NULL
    )
);

-- ============================================================
-- SECTION 7 — VÉRIFICATIONS
-- Une vérification = une fois qu'un tiers consulte un document
-- Append-only : on n'update jamais une vérification
-- ============================================================

CREATE TABLE verifications (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id         UUID REFERENCES documents(id) ON DELETE SET NULL,      -- NULL si doc supprimé (vérif conservée)
    partage_id          UUID REFERENCES partages_document(id) ON DELETE SET NULL, -- NULL si vérif publique
    type_verification   type_verification NOT NULL,
    resultat            resultat_verification NOT NULL,
    hash_soumis         VARCHAR(64),                  -- hash entré manuellement par le vérificateur
    ip_address          INET,
    user_agent          TEXT,
    pays                VARCHAR(100),
    ville               VARCHAR(100),
    organisation        VARCHAR(255),                     -- entreprise ou institution du vérificateur (stats)
    utilisateur_id      UUID REFERENCES utilisateurs(id), -- NULL si visiteur anonyme
    rapport_genere      BOOLEAN NOT NULL DEFAULT FALSE,
    rapport_pdf_url     VARCHAR(500),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SECTION 8 — TRANSACTIONS BLOCKCHAIN
-- ============================================================

CREATE TABLE transactions_blockchain (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id         UUID REFERENCES documents(id) ON DELETE SET NULL,
    type                type_transaction NOT NULL,
    transaction_hash    VARCHAR(66) NOT NULL UNIQUE,
    bloc_numero         BIGINT,
    reseau              reseau_blockchain NOT NULL,
    gas_utilise         BIGINT,
    gas_prix            BIGINT,                       -- en wei
    statut              statut_transaction NOT NULL DEFAULT 'en_attente',
    erreur              TEXT,
    payload             JSONB NOT NULL DEFAULT '{}',  -- données envoyées au smart contract
    confirme_le         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SECTION 9 — SÉCURITÉ ET AUDIT
-- ============================================================

-- Sessions actives (JWT stockés hashés)
CREATE TABLE sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    utilisateur_id  UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    token_hash      VARCHAR(255) NOT NULL UNIQUE,
    ip_address      INET,
    user_agent      TEXT,
    expires_at      TIMESTAMPTZ NOT NULL,
    revoquee        BOOLEAN NOT NULL DEFAULT FALSE,
    revoquee_le     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Historique de toutes les tentatives de connexion
CREATE TABLE tentatives_connexion (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) NOT NULL,
    ip_address      INET,
    user_agent      TEXT,
    succes          BOOLEAN NOT NULL DEFAULT FALSE,
    raison_echec    VARCHAR(100),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Journal d'audit — traçabilité de toutes les actions sensibles
CREATE TABLE journal_audit (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    utilisateur_id      UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,
    nom_utilisateur     VARCHAR(255),                 -- dénormalisé si le compte est supprimé
    action              VARCHAR(100) NOT NULL,        -- 'DOCUMENT_VALIDE', 'ROLE_MODIFIE'
    module              VARCHAR(50)  NOT NULL,
    table_concernee     VARCHAR(100),
    enregistrement_id   UUID,
    donnees_avant       JSONB,
    donnees_apres       JSONB,
    ip_address          INET,
    user_agent          TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SECTION 10 — COMMUNICATION
-- ============================================================

-- Notifications in-app
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    utilisateur_id  UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    type            VARCHAR(80) NOT NULL,             -- 'DOCUMENT_EMIS', 'PARTAGE_ACCORDE'
    titre           VARCHAR(255) NOT NULL,
    message         TEXT NOT NULL,
    lien            VARCHAR(500),
    statut          statut_notification NOT NULL DEFAULT 'non_lue',
    lue_le          TIMESTAMPTZ,
    archivee_le     TIMESTAMPTZ,
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Log de tous les emails envoyés (pour débogage et relance)
CREATE TABLE emails_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    utilisateur_id  UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,
    destinataire    VARCHAR(255) NOT NULL,
    sujet           VARCHAR(255) NOT NULL,
    template        VARCHAR(100) NOT NULL,            -- 'DOCUMENT_EMIS', 'BIENVENUE'
    parametres      JSONB NOT NULL DEFAULT '{}',
    statut          statut_email NOT NULL DEFAULT 'en_attente',
    tentatives      INT NOT NULL DEFAULT 0,
    max_tentatives  INT NOT NULL DEFAULT 3,
    erreur          TEXT,
    message_id      VARCHAR(255),                     -- ID retourné par le serveur SMTP
    envoye_le       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SECTION 11 — INTÉGRATIONS TECHNIQUES
-- ============================================================

-- Clés API pour connexions programmatiques (ex: ERP de l'institution)
CREATE TABLE cles_api (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    universite_id        UUID NOT NULL REFERENCES universites(id) ON DELETE CASCADE,
    nom                  VARCHAR(100) NOT NULL,
    cle_hachee           VARCHAR(255) NOT NULL UNIQUE,
    prefix               VARCHAR(12)  NOT NULL,       -- premiers caractères affichés à l'écran
    permissions          JSONB NOT NULL DEFAULT '[]',
    derniere_utilisation TIMESTAMPTZ,
    nb_utilisations      BIGINT NOT NULL DEFAULT 0,
    expiration           TIMESTAMPTZ,
    est_active           BOOLEAN NOT NULL DEFAULT TRUE,
    ip_whitelist         JSONB NOT NULL DEFAULT '[]', -- vide = toutes les IPs autorisées
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by           UUID REFERENCES utilisateurs(id)
);

-- Webhooks : notifier des systèmes externes en temps réel
CREATE TABLE webhooks (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    universite_id      UUID NOT NULL REFERENCES universites(id) ON DELETE CASCADE,
    nom                VARCHAR(100) NOT NULL,
    url                VARCHAR(500) NOT NULL,
    secret             VARCHAR(255) NOT NULL,         -- clé HMAC pour signer les payloads
    evenements         JSONB NOT NULL DEFAULT '[]',   -- ['document.emis', 'document.revoque']
    statut             statut_webhook NOT NULL DEFAULT 'actif',
    nb_succes          INT NOT NULL DEFAULT 0,
    nb_echecs          INT NOT NULL DEFAULT 0,
    derniere_livraison TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by         UUID REFERENCES utilisateurs(id)
);

-- Historique de chaque livraison de webhook (pour débogage)
CREATE TABLE webhook_livraisons (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id  UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    evenement   VARCHAR(100) NOT NULL,
    payload     JSONB NOT NULL,
    statut_http INT,
    reponse     TEXT,
    duree_ms    INT,
    succes      BOOLEAN NOT NULL DEFAULT FALSE,
    tentative   INT NOT NULL DEFAULT 1,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SECTION 12 — CONFIGURATIONS SYSTÈME
-- ============================================================

CREATE TABLE configurations (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cle            VARCHAR(100) NOT NULL UNIQUE,
    valeur         TEXT NOT NULL,
    type           VARCHAR(20)  NOT NULL DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
    description    TEXT,
    modifiable_par VARCHAR(20)  NOT NULL DEFAULT 'super_admin',
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by     UUID REFERENCES utilisateurs(id)
);

-- ============================================================
-- SECTION 13 — INDEXES
-- ============================================================

-- Utilisateurs
CREATE INDEX idx_utilisateurs_email         ON utilisateurs(email);
CREATE INDEX idx_utilisateurs_role_id       ON utilisateurs(role_id);
CREATE INDEX idx_utilisateurs_universite_id ON utilisateurs(universite_id);
CREATE INDEX idx_utilisateurs_statut        ON utilisateurs(statut);
CREATE INDEX idx_utilisateurs_deleted_at    ON utilisateurs(deleted_at) WHERE deleted_at IS NULL;

-- Universités
CREATE INDEX idx_universites_statut         ON universites(statut);
CREATE INDEX idx_universites_deleted_at     ON universites(deleted_at) WHERE deleted_at IS NULL;

-- Types de documents
CREATE INDEX idx_types_document_categorie   ON types_document(categorie);
CREATE INDEX idx_types_document_actif       ON types_document(est_actif) WHERE est_actif = TRUE;

-- Étudiants
CREATE INDEX idx_etudiants_numero           ON etudiants(numero_etudiant);
CREATE INDEX idx_etudiants_universite_id    ON etudiants(universite_id);
CREATE INDEX idx_etudiants_email            ON etudiants(email);
CREATE INDEX idx_etudiants_deleted_at       ON etudiants(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_etudiants_nom_prenom       ON etudiants USING gin(
    to_tsvector('french', f_unaccent(nom || ' ' || prenom))
);

-- Documents (critiques pour la vérification publique)
CREATE INDEX idx_documents_numero_unique    ON documents(numero_unique);
CREATE INDEX idx_documents_hash_sha256      ON documents(hash_sha256);
CREATE INDEX idx_documents_etudiant_id      ON documents(etudiant_id);
CREATE INDEX idx_documents_universite_id    ON documents(universite_id);
CREATE INDEX idx_documents_type_id          ON documents(type_document_id);
CREATE INDEX idx_documents_statut           ON documents(statut);
CREATE INDEX idx_documents_date_emission    ON documents(date_emission);
CREATE INDEX idx_documents_transaction_hash ON documents(transaction_hash);
CREATE INDEX idx_documents_deleted_at       ON documents(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_donnees          ON documents USING gin(donnees); -- recherche dans le JSONB

-- Documents — filière (colonne directe la plus filtrée)
CREATE INDEX idx_documents_filiere          ON documents(filiere) WHERE filiere IS NOT NULL;

-- Matières
CREATE INDEX idx_matieres_document_id       ON matieres_document(document_id);

-- Invitations
CREATE INDEX idx_invitations_token          ON invitations(token);
CREATE INDEX idx_invitations_etudiant_id    ON invitations(etudiant_id);
CREATE INDEX idx_invitations_email          ON invitations(email);
CREATE INDEX idx_invitations_statut         ON invitations(statut);
CREATE INDEX idx_invitations_expires_at     ON invitations(expires_at)
    WHERE statut = 'en_attente';

-- Partenariats université
CREATE INDEX idx_partenariats_universite_id ON partenariats_universite(universite_id);
CREATE INDEX idx_partenariats_liee_id       ON partenariats_universite(universite_liee_id);
CREATE INDEX idx_partenariats_statut        ON partenariats_universite(statut);

-- Partages
CREATE INDEX idx_partages_token_acces       ON partages_document(token_acces);
CREATE INDEX idx_partages_document_id       ON partages_document(document_id);
CREATE INDEX idx_partages_etudiant_id       ON partages_document(etudiant_id);
CREATE INDEX idx_partages_statut            ON partages_document(statut);
CREATE INDEX idx_partages_date_expiration   ON partages_document(date_expiration)
    WHERE date_expiration IS NOT NULL;

-- Vérifications
CREATE INDEX idx_verifications_document_id  ON verifications(document_id);
CREATE INDEX idx_verifications_partage_id   ON verifications(partage_id);
CREATE INDEX idx_verifications_resultat     ON verifications(resultat);
CREATE INDEX idx_verifications_ip           ON verifications(ip_address);
CREATE INDEX idx_verifications_created_at   ON verifications(created_at DESC);

-- Transactions blockchain
CREATE INDEX idx_tx_document_id             ON transactions_blockchain(document_id);
CREATE INDEX idx_tx_hash                    ON transactions_blockchain(transaction_hash);
CREATE INDEX idx_tx_statut                  ON transactions_blockchain(statut);

-- Journal d'audit
CREATE INDEX idx_audit_utilisateur_id       ON journal_audit(utilisateur_id);
CREATE INDEX idx_audit_action               ON journal_audit(action);
CREATE INDEX idx_audit_module               ON journal_audit(module);
CREATE INDEX idx_audit_table_concernee      ON journal_audit(table_concernee);
CREATE INDEX idx_audit_enregistrement_id    ON journal_audit(enregistrement_id);
CREATE INDEX idx_audit_created_at           ON journal_audit(created_at DESC);

-- Sessions
CREATE INDEX idx_sessions_utilisateur_id    ON sessions(utilisateur_id);
CREATE INDEX idx_sessions_token_hash        ON sessions(token_hash);
CREATE INDEX idx_sessions_expires_at        ON sessions(expires_at);

-- Tentatives de connexion
CREATE INDEX idx_tentatives_email           ON tentatives_connexion(email);
CREATE INDEX idx_tentatives_ip              ON tentatives_connexion(ip_address);
CREATE INDEX idx_tentatives_created_at      ON tentatives_connexion(created_at DESC);

-- Notifications
CREATE INDEX idx_notifs_utilisateur_id      ON notifications(utilisateur_id);
CREATE INDEX idx_notifs_statut              ON notifications(statut);
CREATE INDEX idx_notifs_created_at          ON notifications(created_at DESC);

-- Emails
CREATE INDEX idx_emails_destinataire        ON emails_log(destinataire);
CREATE INDEX idx_emails_statut              ON emails_log(statut);
CREATE INDEX idx_emails_created_at          ON emails_log(created_at DESC);

-- Clés API
CREATE INDEX idx_cles_api_universite_id     ON cles_api(universite_id);
CREATE INDEX idx_cles_api_prefix            ON cles_api(prefix);

-- Webhooks
CREATE INDEX idx_webhooks_universite_id     ON webhooks(universite_id);
CREATE INDEX idx_webhook_livraisons_wid     ON webhook_livraisons(webhook_id);
CREATE INDEX idx_webhook_livraisons_date    ON webhook_livraisons(created_at DESC);

-- ============================================================
-- SECTION 14 — FONCTIONS UTILITAIRES
-- ============================================================

-- Mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Générer un numero_unique garanti unique dans la table documents
CREATE OR REPLACE FUNCTION fn_generer_numero_unique(longueur INT DEFAULT 10)
RETURNS VARCHAR AS $$
DECLARE
    chars      TEXT    := 'abcdefghjkmnpqrstuvwxyz23456789'; -- sans O/0/I/1 (ambigus)
    result     VARCHAR := '';
    i          INT;
    tentatives INT     := 0;
BEGIN
    LOOP
        result := '';
        FOR i IN 1..longueur LOOP
            result := result || substr(chars, floor(random() * length(chars) + 1)::INT, 1);
        END LOOP;
        EXIT WHEN NOT EXISTS (SELECT 1 FROM documents WHERE numero_unique = result);
        tentatives := tentatives + 1;
        IF tentatives >= 10 THEN
            RAISE EXCEPTION 'fn_generer_numero_unique : impossible de générer un code unique après 10 tentatives';
        END IF;
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Écriture dans le journal d'audit
CREATE OR REPLACE FUNCTION fn_ecrire_audit(
    p_utilisateur_id    UUID,
    p_nom_utilisateur   VARCHAR,
    p_action            VARCHAR,
    p_module            VARCHAR,
    p_table             VARCHAR,
    p_enregistrement_id UUID,
    p_avant             JSONB,
    p_apres             JSONB,
    p_ip                INET DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO journal_audit (
        utilisateur_id, nom_utilisateur, action, module,
        table_concernee, enregistrement_id,
        donnees_avant, donnees_apres, ip_address
    ) VALUES (
        p_utilisateur_id, p_nom_utilisateur, p_action, p_module,
        p_table, p_enregistrement_id,
        p_avant, p_apres, p_ip
    );
END;
$$ LANGUAGE plpgsql;

-- Vérifier si un token de partage est valide (et l'expirer si besoin)
CREATE OR REPLACE FUNCTION fn_partage_valide(p_token VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    v_partage partages_document%ROWTYPE;
BEGIN
    SELECT * INTO v_partage FROM partages_document WHERE token_acces = p_token;
    IF NOT FOUND THEN RETURN FALSE; END IF;
    IF v_partage.statut != 'actif' THEN RETURN FALSE; END IF;
    IF v_partage.date_expiration IS NOT NULL AND v_partage.date_expiration < NOW() THEN
        UPDATE partages_document SET statut = 'expire' WHERE id = v_partage.id;
        RETURN FALSE;
    END IF;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Statistiques de vérification d'un document
CREATE OR REPLACE FUNCTION fn_stats_verifications(p_document_id UUID)
RETURNS TABLE(total BIGINT, ce_mois BIGINT, aujourd_hui BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)                                                          AS total,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS ce_mois,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)               AS aujourd_hui
    FROM verifications
    WHERE document_id = p_document_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- SECTION 15 — TRIGGERS
-- ============================================================

-- updated_at automatique sur toutes les tables qui le possèdent
DO $$
DECLARE tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'universites', 'utilisateurs', 'roles',
        'etudiants', 'types_document',
        'documents', 'invitations', 'partages_document',
        'partenariats_universite',
        'notifications', 'emails_log',
        'cles_api', 'webhooks', 'configurations'
    ] LOOP
        EXECUTE format('
            CREATE TRIGGER trg_%s_updated_at
            BEFORE UPDATE ON %s
            FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
        ', tbl, tbl);
    END LOOP;
END;
$$;

-- Audit automatique sur les documents
CREATE OR REPLACE FUNCTION fn_audit_documents()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM fn_ecrire_audit(
            NEW.saisi_par, NULL, 'DOCUMENT_CREE', 'documents',
            'documents', NEW.id, NULL, to_jsonb(NEW)
        );
    ELSIF TG_OP = 'UPDATE' AND OLD.statut != NEW.statut THEN
        PERFORM fn_ecrire_audit(
            CASE NEW.statut WHEN 'revoque' THEN NEW.revoque_par ELSE NEW.valide_par END,
            NULL,
            CASE NEW.statut
                WHEN 'actif'   THEN 'DOCUMENT_VALIDE'
                WHEN 'revoque' THEN 'DOCUMENT_REVOQUE'
                ELSE 'DOCUMENT_MODIFIE'
            END,
            'documents', 'documents', NEW.id,
            jsonb_build_object('statut', OLD.statut),
            jsonb_build_object('statut', NEW.statut)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_documents
AFTER INSERT OR UPDATE ON documents
FOR EACH ROW EXECUTE FUNCTION fn_audit_documents();

-- Audit sur les changements de rôle/statut des utilisateurs
CREATE OR REPLACE FUNCTION fn_audit_utilisateurs()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.statut != NEW.statut OR OLD.role_id IS DISTINCT FROM NEW.role_id THEN
        PERFORM fn_ecrire_audit(
            NULL, NEW.email, 'UTILISATEUR_MODIFIE', 'utilisateurs',
            'utilisateurs', NEW.id,
            jsonb_build_object('statut', OLD.statut, 'role_id', OLD.role_id),
            jsonb_build_object('statut', NEW.statut, 'role_id', NEW.role_id)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_utilisateurs
AFTER UPDATE ON utilisateurs
FOR EACH ROW EXECUTE FUNCTION fn_audit_utilisateurs();

-- Audit sur l'attribution/retrait de permissions
CREATE OR REPLACE FUNCTION fn_audit_role_permissions()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM fn_ecrire_audit(
            NEW.accordee_par, NULL, 'PERMISSION_ACCORDEE', 'roles',
            'role_permissions', NEW.role_id, NULL,
            jsonb_build_object('role_id', NEW.role_id, 'permission_id', NEW.permission_id)
        );
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM fn_ecrire_audit(
            NULL, NULL, 'PERMISSION_RETIREE', 'roles',
            'role_permissions', OLD.role_id,
            jsonb_build_object('role_id', OLD.role_id, 'permission_id', OLD.permission_id), NULL
        );
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_role_permissions
AFTER INSERT OR DELETE ON role_permissions
FOR EACH ROW EXECUTE FUNCTION fn_audit_role_permissions();

-- Incrémenter le compteur du partage spécifique utilisé
CREATE OR REPLACE FUNCTION fn_incrementer_consultation_partage()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE partages_document
    SET nb_consultations     = nb_consultations + 1,
        derniere_consultation = NOW()
    WHERE id = NEW.partage_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_compteur_consultations_partage
AFTER INSERT ON verifications
FOR EACH ROW
WHEN (NEW.partage_id IS NOT NULL)
EXECUTE FUNCTION fn_incrementer_consultation_partage();

-- Expirer automatiquement un partage dont la date est passée
CREATE OR REPLACE FUNCTION fn_expirer_partages()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.date_expiration IS NOT NULL
       AND NEW.date_expiration < NOW()
       AND NEW.statut = 'actif' THEN
        NEW.statut := 'expire';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_expirer_partages
BEFORE INSERT OR UPDATE ON partages_document
FOR EACH ROW EXECUTE FUNCTION fn_expirer_partages();

-- Bloquer un compte après 5 tentatives de connexion échouées
CREATE OR REPLACE FUNCTION fn_bloquer_apres_echecs()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.succes = FALSE THEN
        UPDATE utilisateurs
        SET tentatives_connexion = tentatives_connexion + 1,
            bloque_jusqu = CASE
                WHEN tentatives_connexion + 1 >= 5 THEN NOW() + INTERVAL '30 minutes'
                ELSE bloque_jusqu
            END
        WHERE email = NEW.email;
    ELSE
        UPDATE utilisateurs
        SET tentatives_connexion = 0, bloque_jusqu = NULL
        WHERE email = NEW.email;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bloquer_apres_echecs
AFTER INSERT ON tentatives_connexion
FOR EACH ROW EXECUTE FUNCTION fn_bloquer_apres_echecs();

-- Horodater automatiquement la lecture d'une notification
CREATE OR REPLACE FUNCTION fn_marquer_lue()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.statut = 'lue' AND OLD.statut = 'non_lue' THEN
        NEW.lue_le := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_marquer_notification_lue
BEFORE UPDATE OF statut ON notifications
FOR EACH ROW EXECUTE FUNCTION fn_marquer_lue();

-- ============================================================
-- SECTION 16 — VUES
-- ============================================================

-- Vue principale : document complet (toutes infos en un SELECT)
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
    d.cid_ipfs,
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

-- Vue : statistiques de vérification par document
CREATE OR REPLACE VIEW v_stats_verifications AS
SELECT
    d.id                AS document_id,
    d.numero_unique,
    d.statut,
    td.categorie,
    td.nom              AS type_document_nom,
    COUNT(v.id)         AS total_verifications,
    COUNT(v.id) FILTER (WHERE v.created_at >= NOW() - INTERVAL '30 days') AS verif_30j,
    COUNT(v.id) FILTER (WHERE v.created_at >= CURRENT_DATE)               AS verif_aujourd_hui,
    COUNT(v.id) FILTER (WHERE v.resultat = 'authentique')  AS verif_authentiques,
    COUNT(v.id) FILTER (WHERE v.resultat = 'falsifie')     AS verif_falsifiees,
    MAX(v.created_at)   AS derniere_verification
FROM documents d
JOIN types_document td ON td.id = d.type_document_id
LEFT JOIN verifications v ON v.document_id = d.id
WHERE d.deleted_at IS NULL
GROUP BY d.id, d.numero_unique, d.statut, td.categorie, td.nom;

-- Vue : tableau de bord université
CREATE OR REPLACE VIEW v_dashboard_universite AS
SELECT
    u.id                            AS universite_id,
    u.nom,
    u.statut,
    COUNT(DISTINCT ut.id)           AS nb_utilisateurs,
    COUNT(DISTINCT et.id)           AS nb_etudiants,
    COUNT(DISTINCT d.id)            AS nb_documents_total,
    COUNT(DISTINCT d.id) FILTER (WHERE d.statut = 'actif')     AS nb_documents_actifs,
    COUNT(DISTINCT d.id) FILTER (WHERE d.statut = 'brouillon') AS nb_documents_brouillon,
    COUNT(DISTINCT d.id) FILTER (WHERE d.statut = 'revoque')   AS nb_documents_revoques,
    -- Répartition par catégorie
    COUNT(DISTINCT d.id) FILTER (WHERE td.categorie = 'diplome')     AS nb_diplomes,
    COUNT(DISTINCT d.id) FILTER (WHERE td.categorie = 'releve')      AS nb_releves,
    COUNT(DISTINCT d.id) FILTER (WHERE td.categorie = 'attestation') AS nb_attestations,
    COUNT(DISTINCT d.id) FILTER (WHERE td.categorie = 'certificat')  AS nb_certificats,
    COUNT(DISTINCT v.id)            AS nb_verifications_total
FROM universites u
LEFT JOIN utilisateurs  ut ON ut.universite_id = u.id AND ut.deleted_at IS NULL
LEFT JOIN etudiants     et ON et.universite_id = u.id AND et.deleted_at IS NULL
LEFT JOIN documents      d ON d.universite_id  = u.id AND d.deleted_at IS NULL
LEFT JOIN types_document td ON td.id = d.type_document_id
LEFT JOIN verifications  v ON v.document_id    = d.id
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.nom, u.statut;

-- Vue : espace étudiant (tous ses documents actifs + compteurs)
CREATE OR REPLACE VIEW v_espace_etudiant AS
SELECT
    e.id                    AS etudiant_id,
    e.utilisateur_id,
    e.numero_etudiant,
    e.nom,
    e.prenom,
    e.email,
    e.photo_url,
    u.nom                   AS universite_nom,
    COUNT(DISTINCT d.id)    AS nb_documents_total,
    COUNT(DISTINCT d.id) FILTER (WHERE td.categorie = 'diplome')     AS nb_diplomes,
    COUNT(DISTINCT d.id) FILTER (WHERE td.categorie = 'releve')      AS nb_releves,
    COUNT(DISTINCT d.id) FILTER (WHERE td.categorie = 'attestation') AS nb_attestations,
    COUNT(DISTINCT v.id)    AS nb_verifications_recues
FROM etudiants e
JOIN universites         u  ON u.id  = e.universite_id
LEFT JOIN documents      d  ON d.etudiant_id = e.id AND d.statut = 'actif' AND d.deleted_at IS NULL
LEFT JOIN types_document td ON td.id = d.type_document_id
LEFT JOIN verifications  v  ON v.document_id = d.id
WHERE e.deleted_at IS NULL
GROUP BY e.id, e.utilisateur_id, e.numero_etudiant, e.nom, e.prenom, e.email, e.photo_url, u.nom;

-- Vue : sessions actives
CREATE OR REPLACE VIEW v_sessions_actives AS
SELECT
    s.id,
    s.utilisateur_id,
    u.email,
    u.nom,
    u.prenom,
    s.ip_address,
    s.created_at    AS connecte_le,
    s.expires_at
FROM sessions s
JOIN utilisateurs u ON u.id = s.utilisateur_id
WHERE s.revoquee = FALSE
  AND s.expires_at > NOW();

-- Vue : partages de documents actifs
CREATE OR REPLACE VIEW v_partages_actifs AS
SELECT
    p.id,
    p.token_acces,
    p.date_expiration,
    p.nb_consultations,
    p.derniere_consultation,
    p.created_at        AS partage_le,
    e.nom               AS etudiant_nom,
    e.prenom            AS etudiant_prenom,
    d.numero_unique,
    td.nom              AS type_document_nom,
    td.categorie,
    COALESCE(ud.nom, p.email_destinataire_externe) AS universite_destinataire,
    p.email_destinataire_externe
FROM partages_document p
JOIN etudiants          e  ON e.id  = p.etudiant_id
JOIN documents          d  ON d.id  = p.document_id
JOIN types_document     td ON td.id = d.type_document_id
LEFT JOIN universites   ud ON ud.id = p.universite_destinataire_id
WHERE p.statut = 'actif'
  AND (p.date_expiration IS NULL OR p.date_expiration > NOW());

-- ============================================================
-- SECTION 17 — DONNÉES INITIALES
-- ============================================================

-- ------------------------------------------------------------
-- Types de documents globaux (universite_id = NULL)
-- ------------------------------------------------------------
INSERT INTO types_document (code, nom, nom_court, categorie, niveau_bac_plus, pays, a_matieres, est_partage, ordre) VALUES
-- DIPLÔMES — Cameroun
('BTS_CM',          'Brevet de Technicien Supérieur',                'BTS',       'diplome',     2,    'Cameroun',      FALSE, FALSE, 10),
('HND',             'Higher National Diploma',                       'HND',       'diplome',     2,    'Cameroun',      FALSE, FALSE, 11),
('DEUG',            'Diplôme d''Études Universitaires Générales',    'DEUG',      'diplome',     2,    'Cameroun',      FALSE, FALSE, 12),
('DUT_CM',          'Diplôme Universitaire de Technologie',          'DUT',       'diplome',     2,    'Cameroun',      FALSE, FALSE, 13),
('LICENCE_PRO_CM',  'Licence Professionnelle',                       'Lic. Pro',  'diplome',     3,    'Cameroun',      FALSE, FALSE, 20),
('LICENCE_CM',      'Licence',                                       'Licence',   'diplome',     3,    'Cameroun',      FALSE, FALSE, 21),
('MASTER_PRO_CM',   'Master Professionnel',                          'Master P',  'diplome',     5,    'Cameroun',      FALSE, FALSE, 30),
('MASTER_RECH_CM',  'Master Recherche',                              'Master R',  'diplome',     5,    'Cameroun',      FALSE, FALSE, 31),
('INGENIEUR_CM',    'Diplôme d''Ingénieur',                          'Ingénieur', 'diplome',     5,    'Cameroun',      FALSE, FALSE, 32),
('DOCTORAT_CM',     'Doctorat / PhD',                                'PhD',       'diplome',     8,    'Cameroun',      FALSE, FALSE, 40),
-- DIPLÔMES — France
('BTS_FR',          'Brevet de Technicien Supérieur',                'BTS',       'diplome',     2,    'France',        FALSE, FALSE, 10),
('BUT',             'Bachelor Universitaire de Technologie',         'BUT',       'diplome',     3,    'France',        FALSE, FALSE, 15),
('BACHELOR',        'Bachelor',                                      'Bachelor',  'diplome',     3,    'France',        FALSE, FALSE, 16),
('LICENCE_FR',      'Licence',                                       'Licence',   'diplome',     3,    'France',        FALSE, FALSE, 20),
('LICENCE_PRO_FR',  'Licence Professionnelle',                       'Lic. Pro',  'diplome',     3,    'France',        FALSE, FALSE, 21),
('MASTER_FR',       'Master',                                        'Master',    'diplome',     5,    'France',        FALSE, FALSE, 30),
('MBA',             'Master of Business Administration',             'MBA',       'diplome',     5,    'International', FALSE, FALSE, 31),
('INGENIEUR_FR',    'Diplôme d''Ingénieur',                          'Ingénieur', 'diplome',     5,    'France',        FALSE, FALSE, 32),
('DOCTORAT_FR',     'Doctorat',                                      'Doctorat',  'diplome',     8,    'France',        FALSE, FALSE, 40),
-- RELEVÉS DE NOTES
('RELEVE_SEMEST',   'Relevé de notes semestriel',                    'Relevé S',  'releve',      NULL, 'International', TRUE,  TRUE,  10),
('RELEVE_ANNUEL',   'Relevé de notes annuel',                        'Relevé A',  'releve',      NULL, 'International', TRUE,  TRUE,  11),
('BULLETIN',        'Bulletin de notes',                             'Bulletin',  'releve',      NULL, 'International', TRUE,  TRUE,  12),
-- ATTESTATIONS
('ATTEST_FREQ',     'Attestation de fréquentation',                  'Att. Fréq', 'attestation', NULL, 'International', FALSE, TRUE,  10),
('ATTEST_REUSS',    'Attestation de réussite',                       'Att. Réus', 'attestation', NULL, 'International', FALSE, TRUE,  11),
('ATTEST_STAGE',    'Attestation de stage',                          'Att. Stage','attestation', NULL, 'International', FALSE, TRUE,  12),
('ATTEST_INSCR',    'Attestation d''inscription',                    'Att. Insc', 'attestation', NULL, 'International', FALSE, TRUE,  13),
('ATTEST_SCOL',     'Attestation de scolarité',                      'Att. Scol', 'attestation', NULL, 'International', FALSE, TRUE,  14),
-- CERTIFICATS
('CERT_SCOL',       'Certificat de scolarité',                       'Cert. Scol','certificat',  NULL, 'International', FALSE, TRUE,  10),
('CERT_EQUIV',      'Certificat d''équivalence',                     'Cert. Équ.','certificat',  NULL, 'International', FALSE, TRUE,  11),
-- AUTRE
('AUTRE',           'Autre document',                                'Autre',     'autre',       NULL, 'International', FALSE, FALSE, 99);

-- Mentions — système franco-camerounais (/20)
INSERT INTO mentions_document (code, nom, note_min, note_max, ordre) VALUES
('excellent',   'Excellent / Félicitations du jury',    18.00, 20.00, 10),
('tres_bien',   'Très Bien',                            16.00, 17.99, 20),
('bien',        'Bien',                                 14.00, 15.99, 30),
('assez_bien',  'Assez Bien',                           12.00, 13.99, 40),
('passable',    'Passable',                             10.00, 11.99, 50);

-- Mentions — système anglo-saxon (%)
INSERT INTO mentions_document (code, nom, note_min, note_max, ordre) VALUES
('first_class',  'First Class Honours',  80.00, 100.00, 10),
('upper_second', 'Upper Second (2:1)',   70.00,  79.99, 20),
('lower_second', 'Lower Second (2:2)',   60.00,  69.99, 30),
('pass',         'Pass',                 50.00,  59.99, 40);

-- ------------------------------------------------------------
-- Rôles système (non supprimables)
-- Permissions et role_permissions gérés par prisma/seed.ts
-- ------------------------------------------------------------
INSERT INTO roles (nom, description, est_systeme) VALUES
('super_admin',            'Accès total à la plateforme',                              TRUE),
('admin_istama',           'Gestionnaire opérationnel INUBIL',                         TRUE),
('responsable_universite', 'Référent principal d''une institution partenaire',          TRUE),
('directeur_pedagogique',  'Validateur et signataire des documents',                   TRUE),
('agent_saisie',           'Saisie des documents académiques',                         TRUE),
('etudiant',               'Accès au dossier personnel',                               TRUE),
('autre_universite',       'Consultation de documents partagés par un étudiant',       TRUE),
('employeur',              'Vérification de documents (compte optionnel)',              TRUE);

-- ------------------------------------------------------------
-- Configurations initiales
-- ------------------------------------------------------------
INSERT INTO configurations (cle, valeur, type, description) VALUES
('app_nom',                  'INUBIL Verify',         'string',  'Nom de l''application'),
('app_url',                  'https://verify.inubil.com', 'string',  'URL de base publique'),
('max_tentatives_connexion', '5',                        'number',  'Tentatives max avant blocage'),
('duree_blocage_minutes',    '30',                       'number',  'Durée blocage après échecs (min)'),
('duree_token_jwt_heures',   '24',                       'number',  'Durée de vie du token JWT (h)'),
('max_upload_mo',            '10',                       'number',  'Taille max PDF uploadé (Mo)'),
('smtp_host',                'smtp.gmail.com',           'string',  'Serveur SMTP sortant'),
('smtp_port',                '587',                      'number',  'Port SMTP (STARTTLS)');

-- ============================================================
-- FIN DU SCHÉMA
-- ============================================================
