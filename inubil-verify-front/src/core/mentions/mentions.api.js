import { api } from '../api/client';

/** GET /mentions — referentiel des mentions (liste plate, non paginee). */
export function listerMentions({ universiteId, estActif = true } = {}) {
  const params = new URLSearchParams();
  if (universiteId) params.set('universite_id', universiteId);
  if (estActif !== undefined) params.set('est_actif', String(estActif));
  return api.get(`/mentions?${params.toString()}`);
}
