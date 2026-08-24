import { api } from '../api/client';

/** GET /universites — liste paginee (filtres: statut, type, pays, search). */
export function listerUniversites({ page = 1, limit = 20, statut, type, pays, search } = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (statut) params.set('statut', statut);
  if (type) params.set('type', type);
  if (pays) params.set('pays', pays);
  if (search) params.set('search', search);
  return api.get(`/universites?${params.toString()}`);
}

/** GET /universites/:id */
export function getUniversite(id) {
  return api.get(`/universites/${id}`);
}

/** POST /universites — cree avec statut initial "en_attente" (CreateUniversiteDto). */
export function creerUniversite(donnees) {
  return api.post('/universites', donnees);
}

/** PATCH /universites/:id (UpdateUniversiteDto). */
export function modifierUniversite(id, donnees) {
  return api.patch(`/universites/${id}`, donnees);
}

/** DELETE /universites/:id — soft delete, bloque (409) si l'universite est active. */
export function supprimerUniversite(id) {
  return api.delete(`/universites/${id}`);
}

/** POST /universites/:id/approuver — en_attente -> approuvee. */
export function approuverUniversite(id) {
  return api.post(`/universites/${id}/approuver`);
}

/** POST /universites/:id/activer — approuvee -> active. */
export function activerUniversite(id) {
  return api.post(`/universites/${id}/activer`);
}

/** POST /universites/:id/suspendre — active -> suspendue (raison optionnelle). */
export function suspendreUniversite(id, raison) {
  return api.post(`/universites/${id}/suspendre`, raison ? { raison } : {});
}

/** POST /universites/:id/rejeter — en_attente -> rejetee (raison_rejet obligatoire, 10 caracteres min). */
export function rejeterUniversite(id, raison_rejet) {
  return api.post(`/universites/${id}/rejeter`, { raison_rejet });
}
