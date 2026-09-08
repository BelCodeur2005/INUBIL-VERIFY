/**
 * Redirection post-connexion par role. Voir docs/ROLES_ET_PAGES.md (racine du depot)
 * pour la hierarchie complete des roles.
 *
 * directeur_pedagogique -> /universite (fusionne avec agent_saisie/responsable_universite
 * depuis le 2026-09-07 : /dashboard-directeur est retire, la File de validation vit
 * desormais en /universite/validation, visible uniquement pour ce role et
 * responsable_universite — voir docs/ROLES_ET_PAGES.md §4).
 */
const REDIRECTIONS_PAR_ROLE = {
  super_admin: '/admin-inubil',
  admin_istama: '/admin-inubil',
  responsable_universite: '/universite',
  directeur_pedagogique: '/universite',
  agent_saisie: '/universite',
  etudiant: '/dashboard-etudiant',
};

/** autre_universite / employeur : pas encore de page dediee (historique de verifications a construire) — repli neutre. */
const DESTINATION_PAR_DEFAUT = '/verification-publique';

export function redirectionParRole(nomRole) {
  return REDIRECTIONS_PAR_ROLE[nomRole] ?? DESTINATION_PAR_DEFAUT;
}
