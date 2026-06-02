/**
 * Permissions systeme RBAC (cahier des charges F-AUTH).
 *
 * Les valeurs correspondent EXACTEMENT a la colonne `permissions.nom` en base
 * (alimentee par le seed). Utiliser l'enum partout evite les fautes de frappe.
 */
export enum Permission {
  VALIDER_DIPLOME = 'valider_diplome',
  REVOQUER_DIPLOME = 'revoquer_diplome',
  GERER_UNIVERSITES = 'gerer_universites',
  GERER_UTILISATEURS = 'gerer_utilisateurs',
  VOIR_STATISTIQUES = 'voir_statistiques',
  VOIR_AUDIT = 'voir_audit',
  SAISIR_DOCUMENT = 'saisir_document',
  VOIR_DOSSIER_ETUDIANT = 'voir_dossier_etudiant',
  PARTAGER_DOCUMENT = 'partager_document',
}

/** Toutes les permissions systeme (utile pour le seed / l'attribution en masse). */
export const TOUTES_LES_PERMISSIONS: Permission[] = Object.values(Permission);
