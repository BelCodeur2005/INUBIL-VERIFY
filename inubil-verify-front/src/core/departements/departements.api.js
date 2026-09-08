import { api } from '../api/client';

/**
 * GET /departements — referentiel des departements (liste plate, non paginee).
 * estActif: true (defaut, actifs seulement) | false (inactifs seulement) | null (tous).
 */
export function listerDepartements({ universiteId, estActif = true } = {}) {
  const params = new URLSearchParams();
  if (universiteId) params.set('universite_id', universiteId);
  if (estActif !== undefined && estActif !== null) params.set('est_actif', String(estActif));
  return api.get(`/departements?${params.toString()}`);
}

/** POST /departements — cree un departement (permission dept:create). */
export function creerDepartement(donnees) {
  return api.post('/departements', donnees);
}

/** PATCH /departements/:id — modifie un departement (permission dept:edit). */
export function modifierDepartement(id, donnees) {
  return api.patch(`/departements/${id}`, donnees);
}

/** DELETE /departements/:id — supprime (physique si inutilise, desactivation douce sinon). */
export function supprimerDepartement(id) {
  return api.delete(`/departements/${id}`);
}
