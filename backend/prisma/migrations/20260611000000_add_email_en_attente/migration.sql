-- Migration : ajout du champ email_en_attente sur la table utilisateurs
-- Permet de stocker le nouvel email en attente de verification
-- sans modifier immediatement le champ email (qui reste l'identifiant actif).

ALTER TABLE "utilisateurs"
ADD COLUMN "email_en_attente" VARCHAR(255);
