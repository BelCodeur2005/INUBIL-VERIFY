-- Migration : retire la colonne generee (STORED GENERATED) sur
-- documents.url_verification. Ce n'etait pas un simple DEFAULT : Postgres la
-- recalculait TOUJOURS via l'expression 'https://verify.inubil.com/d/' +
-- numero_unique, domaine placeholder jamais deploye, code en dur au niveau
-- SQL et totalement independant de la variable d'env PUBLIC_VERIFY_URL —
-- et un GENERATED ALWAYS ne peut pas etre ecrit par une requete applicative
-- (INSERT/UPDATE sur cette colonne est rejete par Postgres).
--
-- Desormais DocumentsService.creerDocument fixe explicitement cette valeur
-- a la creation, a partir de PUBLIC_VERIFY_URL (meme pattern deja utilise
-- pour le QR genere a la validation). Les lignes existantes ne sont pas
-- corrigees ici (une valeur en dur dependante de l'environnement n'a pas sa
-- place dans une migration versionnee) — un script separe est execute
-- manuellement contre chaque base pour les mettre a jour.

ALTER TABLE "documents" ALTER COLUMN "url_verification" DROP EXPRESSION;
