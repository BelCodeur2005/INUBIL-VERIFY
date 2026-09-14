// Metadonnees d'affichage pour les cles de configurations systeme (table
// `configurations`, GET /configurations) — regroupe par section et donne un
// libelle humain, une icone et un statut "connecte" (verifie a la main :
// certaines cles presentes en base ne sont lues par aucun service backend,
// cf. grep sur configurations.get(...) — les modifier ne change rien au
// comportement reel de la plateforme).

export const SECTIONS_CONFIG = [
  {
    id: 'securite',
    titre: 'Sécurité',
    cles: [
      'max_tentatives_connexion',
      'duree_blocage_min',
      'mot_de_passe_longueur_min',
      'session_idle_min',
    ],
  },
  {
    id: 'documents',
    titre: 'Documents & partage',
    cles: ['pdf_max_taille_mo', 'presigned_url_duree_min', 'partage_duree_jours'],
  },
  {
    id: 'email',
    titre: 'Email',
    cles: ['app_nom', 'smtp_host', 'smtp_port', 'smtp_from_email'],
  },
];

export const CONFIG_META = {
  max_tentatives_connexion:  { label: 'Tentatives de connexion max.',          connecte: true },
  duree_blocage_min:         { label: 'Durée de blocage après échecs',         connecte: true },
  mot_de_passe_longueur_min: { label: 'Longueur minimale du mot de passe',     connecte: true },
  session_idle_min:          { label: "Fenêtre d'inactivité de session",       connecte: true },
  pdf_max_taille_mo:         { label: "Taille max. d'un PDF",                  connecte: true },
  presigned_url_duree_min:   { label: 'Durée des liens de téléchargement',     connecte: true },
  partage_duree_jours:       { label: "Durée par défaut d'un partage",         connecte: true },
  app_nom:                   { label: "Nom de l'application",                 connecte: true },
  smtp_host:                 { label: 'Serveur SMTP sortant',                 connecte: true },
  smtp_port:                 { label: 'Port SMTP',                           connecte: true },
  smtp_from_email:           { label: "Adresse d'expéditeur (From)",          connecte: true },
};

export function metaConfig(cle) {
  return CONFIG_META[cle] ?? { label: cle, connecte: false };
}
