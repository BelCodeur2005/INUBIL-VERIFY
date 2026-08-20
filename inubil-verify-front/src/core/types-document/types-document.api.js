import { api } from '../api/client';

/** GET /types-document — referentiel des types de diplome (liste plate, non paginee). */
export function listerTypesDocument({ universiteId, estActif = true } = {}) {
  const params = new URLSearchParams();
  if (universiteId) params.set('universite_id', universiteId);
  if (estActif !== undefined) params.set('est_actif', String(estActif));
  return api.get(`/types-document?${params.toString()}`);
}
