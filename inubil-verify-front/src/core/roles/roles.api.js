import { api } from '../api/client';

/** GET /roles — liste des roles (filtre optionnel par universite_id, null = roles globaux). */
export function listerRoles(universiteId) {
  const qs = universiteId ? `?universite_id=${encodeURIComponent(universiteId)}` : '';
  return api.get(`/roles${qs}`);
}

/** GET /roles/:id — detail d'un role avec ses permissions. */
export function getRole(id) {
  return api.get(`/roles/${id}`);
}

/** POST /roles (CreateRoleDto). */
export function creerRole(donnees) {
  return api.post('/roles', donnees);
}

/** PATCH /roles/:id (UpdateRoleDto). */
export function modifierRole(id, donnees) {
  return api.patch(`/roles/${id}`, donnees);
}

/** DELETE /roles/:id — bloque (409) si role systeme ou assigne a des utilisateurs. */
export function supprimerRole(id) {
  return api.delete(`/roles/${id}`);
}

/** PUT /roles/:id/permissions — remplace atomiquement toutes les permissions du role. */
export function assignerPermissionsRole(id, permission_ids) {
  return api.put(`/roles/${id}/permissions`, { permission_ids });
}
