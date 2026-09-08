// Libellés humains + catégorie (couleur du badge) pour les actions du journal
// d'audit (GET /admin/audit). Liste construite a partir de tous les `action:`
// reellement logues cote backend (audit.log({...})) — cf. grep sur *.service.ts.
// Toute action absente de cette liste (ex. celles auto-generees par
// AuditInterceptor, du type ADMIN_PATCH_...) retombe sur une version humanisee
// de la chaine brute plutot que planter ou afficher du SCREAMING_SNAKE_CASE.

export const CATEGORIES = {
  creation:     { label: 'Création',    classe: 'badgeCreation' },
  modification: { label: 'Modification', classe: 'badgeModification' },
  validation:   { label: 'Validation',  classe: 'badgeValidation' },
  suppression:  { label: 'Suppression', classe: 'badgeSuppression' },
  systeme:      { label: 'Système',     classe: 'badgeSysteme' },
};

const ACTIONS = {
  DOCUMENT_CREER:                    { label: 'Document créé',                 categorie: 'creation' },
  DOCUMENT_MODIFIER:                 { label: 'Document modifié',              categorie: 'modification' },
  DOCUMENT_UPLOAD_PDF:               { label: 'PDF du document mis à jour',    categorie: 'modification' },
  DOCUMENT_VALIDER:                  { label: 'Diplôme validé',                categorie: 'validation' },
  DOCUMENT_REJETER:                  { label: 'Diplôme rejeté',                categorie: 'suppression' },
  DOCUMENT_REVOQUER:                 { label: 'Diplôme révoqué',               categorie: 'suppression' },
  DOCUMENT_SUPPRIMER:                { label: 'Document supprimé',             categorie: 'suppression' },

  ETUDIANT_CREER:                    { label: 'Étudiant créé',                 categorie: 'creation' },
  ETUDIANT_MODIFIER:                 { label: 'Étudiant modifié',              categorie: 'modification' },
  ETUDIANT_SUPPRIMER:                { label: 'Étudiant supprimé',             categorie: 'suppression' },

  UTILISATEUR_STATUT_CHANGE:         { label: 'Statut du compte modifié',      categorie: 'modification' },
  UTILISATEUR_ROLE_ASSIGNE:          { label: 'Rôle assigné',                  categorie: 'modification' },
  UTILISATEUR_DEPARTEMENTS_ASSIGNES: { label: 'Départements attribués',        categorie: 'modification' },
  ADMIN_UTILISATEUR_ACTIVE:          { label: 'Compte activé',                 categorie: 'validation' },
  ADMIN_UTILISATEUR_DESACTIVE:       { label: 'Compte désactivé',              categorie: 'suppression' },

  UNIVERSITE_CREEE:                  { label: 'Université créée',              categorie: 'creation' },
  UNIVERSITE_MODIFIEE:               { label: 'Université modifiée',           categorie: 'modification' },
  UNIVERSITE_APPROUVEE:              { label: 'Université approuvée',          categorie: 'validation' },
  UNIVERSITE_ACTIVEE:                { label: 'Université activée',            categorie: 'validation' },
  UNIVERSITE_SUSPENDUE:              { label: 'Université suspendue',          categorie: 'suppression' },
  UNIVERSITE_REJETEE:                { label: 'Université rejetée',            categorie: 'suppression' },
  UNIVERSITE_SUPPRIMEE:              { label: 'Université supprimée',          categorie: 'suppression' },

  MENTION_CREER:                     { label: 'Mention créée',                 categorie: 'creation' },
  MENTION_MODIFIER:                  { label: 'Mention modifiée',              categorie: 'modification' },
  MENTION_SUPPRIMER:                 { label: 'Mention supprimée',             categorie: 'suppression' },

  TYPE_DOCUMENT_CREER:               { label: 'Type de document créé',         categorie: 'creation' },
  TYPE_DOCUMENT_MODIFIER:            { label: 'Type de document modifié',      categorie: 'modification' },
  TYPE_DOCUMENT_SUPPRIMER:           { label: 'Type de document supprimé',     categorie: 'suppression' },

  DEPARTEMENT_CREER:                 { label: 'Département créé',              categorie: 'creation' },
  DEPARTEMENT_MODIFIER:              { label: 'Département modifié',           categorie: 'modification' },
  DEPARTEMENT_SUPPRIMER:             { label: 'Département supprimé',          categorie: 'suppression' },

  ROLE_CREE:                         { label: 'Rôle créé',                     categorie: 'creation' },
  ROLE_MODIFIE:                      { label: 'Rôle modifié',                  categorie: 'modification' },
  ROLE_PERMISSIONS_MISES_A_JOUR:     { label: 'Permissions du rôle modifiées',  categorie: 'modification' },
  ROLE_SUPPRIME:                     { label: 'Rôle supprimé',                 categorie: 'suppression' },

  INVITATION_CREEE:                  { label: 'Invitation envoyée',            categorie: 'creation' },
  INVITATION_RENVOYEE:               { label: 'Invitation renvoyée',           categorie: 'modification' },
  INVITATION_ACCEPTEE:               { label: 'Invitation acceptée',           categorie: 'validation' },
  INVITATION_ANNULEE:                { label: 'Invitation annulée',            categorie: 'suppression' },

  WEBHOOK_CREER:                     { label: 'Webhook créé',                  categorie: 'creation' },
  WEBHOOK_MODIFIER:                  { label: 'Webhook modifié',               categorie: 'modification' },
  WEBHOOK_SUPPRIMER:                 { label: 'Webhook supprimé',              categorie: 'suppression' },

  PARTENARIAT_CREER:                 { label: 'Partenariat créé',              categorie: 'creation' },
  PARTENARIAT_MODIFIER:              { label: 'Partenariat modifié',           categorie: 'modification' },
  PARTENARIAT_SUPPRIMER:             { label: 'Partenariat supprimé',          categorie: 'suppression' },

  CLE_API_CREER:                     { label: 'Clé API créée',                 categorie: 'creation' },
  CLE_API_MODIFIER:                  { label: 'Clé API modifiée',              categorie: 'modification' },
  CLE_API_REVOQUER:                  { label: 'Clé API révoquée',              categorie: 'suppression' },

  CONFIG_CREER:                      { label: 'Paramètre système créé',        categorie: 'creation' },
  CONFIG_MODIFIER:                   { label: 'Paramètre système modifié',     categorie: 'modification' },
  CONFIG_SUPPRIMER:                  { label: 'Paramètre système supprimé',    categorie: 'suppression' },
};

const MODULES = {
  documents:      'Documents',
  etudiants:      'Étudiants',
  utilisateurs:   'Utilisateurs',
  universites:    'Universités',
  departements:   'Départements',
  mentions:       'Mentions',
  types_document: 'Types de document',
  roles:          'Rôles',
  invitations:    'Invitations',
  webhooks:       'Webhooks',
  partenariats:   'Partenariats',
  cles_api:       'Clés API',
  configurations: 'Configuration',
  admin:          'Administration',
};

function humaniser(brut) {
  return brut
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());
}

export function infosAction(action) {
  return ACTIONS[action] ?? { label: humaniser(action), categorie: 'systeme' };
}

export function labelModule(module) {
  return MODULES[module] ?? humaniser(module ?? '');
}
