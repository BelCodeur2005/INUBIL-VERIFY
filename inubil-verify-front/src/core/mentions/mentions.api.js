import { api } from '../api/client';

/**
 * GET /mentions — referentiel des mentions (liste plate, non paginee).
 * estActif: true (defaut, actives seulement) | false (inactives seulement) | null (toutes).
 */
export function listerMentions({ universiteId, estActif = true } = {}) {
  const params = new URLSearchParams();
  if (universiteId) params.set('universite_id', universiteId);
  if (estActif !== undefined && estActif !== null) params.set('est_actif', String(estActif));
  return api.get(`/mentions?${params.toString()}`);
}

/** POST /mentions — cree une mention (permission doc:create). */
export function creerMention(donnees) {
  return api.post('/mentions', donnees);
}

/** PATCH /mentions/:id — modifie une mention (permission doc:create). */
export function modifierMention(id, donnees) {
  return api.patch(`/mentions/${id}`, donnees);
}

/** DELETE /mentions/:id — supprime (physique si inutilisee, desactivation douce sinon). */
export function supprimerMention(id) {
  return api.delete(`/mentions/${id}`);
}
