import { api } from '../api/client';

/**
 * GET /types-document — referentiel des types de diplome (liste plate, non paginee).
 * estActif: true (defaut, actifs seulement) | false (inactifs seulement) | null (tous).
 */
export function listerTypesDocument({ universiteId, estActif = true } = {}) {
  const params = new URLSearchParams();
  if (universiteId) params.set('universite_id', universiteId);
  if (estActif !== undefined && estActif !== null) params.set('est_actif', String(estActif));
  return api.get(`/types-document?${params.toString()}`);
}

/** POST /types-document — cree un type de document (permission doc:create). */
export function creerTypeDocument(donnees) {
  return api.post('/types-document', donnees);
}

/** PATCH /types-document/:id — modifie un type de document (permission doc:create). */
export function modifierTypeDocument(id, donnees) {
  return api.patch(`/types-document/${id}`, donnees);
}

/** DELETE /types-document/:id — supprime (physique si inutilise, desactivation douce sinon). */
export function supprimerTypeDocument(id) {
  return api.delete(`/types-document/${id}`);
}
