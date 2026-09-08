import { api } from '../api/client';

/**
 * GET /utilisateurs — liste paginee des utilisateurs (scope automatique a l'universite
 * de l'acteur cote backend). Filtres : statut, role_id, universite_id, search.
 */
export function listerUtilisateurs({ page = 1, limit = 50, roleId, search } = {}) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (roleId) params.set('role_id', roleId);
  if (search) params.set('search', search);
  return api.get(`/utilisateurs?${params.toString()}`);
}

/** PUT /utilisateurs/:id/role — assigne un role a un utilisateur (AssignerRoleDto). */
export function assignerRole(id, role_id) {
  return api.put(`/utilisateurs/${id}/role`, { role_id });
}

/**
 * PUT /utilisateurs/:id/departements — remplace la liste des departements associes
 * a un utilisateur (permission dept:edit). Liste vide = aucune restriction (scolarite).
 */
export function assignerDepartementsUtilisateur(id, departementIds) {
  return api.put(`/utilisateurs/${id}/departements`, { departement_ids: departementIds });
}
