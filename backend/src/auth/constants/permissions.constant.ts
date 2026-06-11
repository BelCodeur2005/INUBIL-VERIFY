/**
 * Permissions RBAC granulaires — notation namespace:action.
 *
 * Convention : <module>:<action>
 *   univ    → universités
 *   role    → rôles & permissions
 *   user    → utilisateurs
 *   doc     → documents / diplômes
 *   student → dossiers étudiants
 *   stats   → statistiques
 *   audit   → journal d'audit
 *
 * Les valeurs correspondent EXACTEMENT a la colonne `permissions.nom` en base
 * (alimentee par le seed). Utiliser l'enum partout evite les fautes de frappe.
 */
export enum Permission {
  // ── Universités ────────────────────────────────────────────────────────────
  UNIV_READ     = 'univ:read',
  UNIV_CREATE   = 'univ:create',
  UNIV_EDIT     = 'univ:edit',
  UNIV_DELETE   = 'univ:delete',
  UNIV_APPROVE  = 'univ:approve',
  UNIV_ACTIVATE = 'univ:activate',
  UNIV_SUSPEND  = 'univ:suspend',
  UNIV_REJECT   = 'univ:reject',

  // ── Rôles & Permissions ────────────────────────────────────────────────────
  ROLE_READ   = 'role:read',
  ROLE_CREATE = 'role:create',
  ROLE_EDIT   = 'role:edit',
  ROLE_DELETE = 'role:delete',
  ROLE_ASSIGN = 'role:assign',

  // ── Utilisateurs ──────────────────────────────────────────────────────────
  USER_READ        = 'user:read',
  USER_EDIT        = 'user:edit',
  USER_ASSIGN_ROLE = 'user:assign_role',

  // ── Documents / Diplômes ──────────────────────────────────────────────────
  DOC_READ     = 'doc:read',
  DOC_CREATE   = 'doc:create',
  DOC_VALIDATE = 'doc:validate',
  DOC_REVOKE   = 'doc:revoke',
  DOC_DELETE   = 'doc:delete',
  DOC_SHARE    = 'doc:share',

  // ── Étudiants ─────────────────────────────────────────────────────────────
  STUDENT_READ = 'student:read',

  // ── Statistiques & Audit ──────────────────────────────────────────────────
  STATS_READ = 'stats:read',
  AUDIT_READ = 'audit:read',
}

/** Toutes les permissions systeme (utile pour le seed / l'attribution en masse). */
export const TOUTES_LES_PERMISSIONS: Permission[] = Object.values(Permission);
