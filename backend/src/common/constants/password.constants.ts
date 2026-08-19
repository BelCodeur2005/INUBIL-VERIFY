/**
 * Plancher absolu de longueur de mot de passe, valide au niveau HTTP (class-validator,
 * evalue de facon synchrone au chargement de la classe — ne peut pas lire une config
 * async). Jamais contournable, meme si le parametre systeme ci-dessous est mal configure.
 *
 * Le parametre systeme "mot_de_passe_longueur_min" (configurations) permet de RELEVER
 * cette exigence (ex: 10 ou 12) sans redeploiement ; verifie dans AuthService avant
 * hachage. Il ne peut jamais descendre sous ce plancher.
 */
export const PASSWORD_MIN_LENGTH_FLOOR = 8;
