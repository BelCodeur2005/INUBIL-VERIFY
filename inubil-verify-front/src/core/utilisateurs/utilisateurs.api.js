import { api } from '../api/client';

/** PUT /utilisateurs/:id/role — assigne un role a un utilisateur (AssignerRoleDto). */
export function assignerRole(id, role_id) {
  return api.put(`/utilisateurs/${id}/role`, { role_id });
}
