import { api } from '../api/client';

/** GET /configurations — tous les parametres systeme (super_admin, permission config:read). */
export function listerConfigurations() {
  return api.get('/configurations');
}

/** PUT /configurations/:cle — cree ou met a jour un parametre (UpsertConfigurationDto). */
export function upsertConfiguration(cle, donnees) {
  return api.put(`/configurations/${encodeURIComponent(cle)}`, donnees);
}

/** DELETE /configurations/:cle */
export function supprimerConfiguration(cle) {
  return api.delete(`/configurations/${encodeURIComponent(cle)}`);
}
