import { api } from '../api/client';

/** GET /partages/:token — acces public a un document partage, sans authentification. */
export function accederPartage(token) {
  return api.get(`/partages/${encodeURIComponent(token)}`, { auth: false });
}
