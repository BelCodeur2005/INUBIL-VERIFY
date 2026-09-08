import { api } from '../api/client';

/**
 * GET /filieres — referentiel des filieres (liste plate, non paginee).
 * estActif: true (defaut, actives seulement) | false (inactives seulement) | null (toutes).
 */
export function listerFilieres({ universiteId, estActif = true } = {}) {
  const params = new URLSearchParams();
  if (universiteId) params.set('universite_id', universiteId);
  if (estActif !== undefined && estActif !== null) params.set('est_actif', String(estActif));
  return api.get(`/filieres?${params.toString()}`);
}

/** POST /filieres — cree une filiere (permission fil:create). */
export function creerFiliere(donnees) {
  return api.post('/filieres', donnees);
}

/** PATCH /filieres/:id — modifie une filiere (permission fil:edit). */
export function modifierFiliere(id, donnees) {
  return api.patch(`/filieres/${id}`, donnees);
}

/** DELETE /filieres/:id — supprime (physique si inutilisee, desactivation douce sinon). */
export function supprimerFiliere(id) {
  return api.delete(`/filieres/${id}`);
}
