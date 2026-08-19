/**
 * Redirection post-connexion par role. Voir docs/ROLES_ET_PAGES.md (racine du depot)
 * pour la hierarchie complete des roles.
 *
 * directeur_pedagogique -> /dashboard-directeur en attendant que cette page soit
 * fusionnee avec /universite (elle doit partager les pages d'agent_saisie + la
 * file de validation, pas rester une page a part avec des concepts qui n'existent
 * pas cote backend — voir docs/ROLES_ET_PAGES.md §4).
 */
const REDIRECTIONS_PAR_ROLE = {
  super_admin: '/admin-inubil',
  admin_istama: '/admin-inubil',
  responsable_universite: '/universite',
  directeur_pedagogique: '/dashboard-directeur',
  agent_saisie: '/universite',
  etudiant: '/dashboard-etudiant',
};

/** autre_universite / employeur : pas encore de page dediee (historique de verifications a construire) — repli neutre. */
const DESTINATION_PAR_DEFAUT = '/verification-publique';

export function redirectionParRole(nomRole) {
  return REDIRECTIONS_PAR_ROLE[nomRole] ?? DESTINATION_PAR_DEFAUT;
}
