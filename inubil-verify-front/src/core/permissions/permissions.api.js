import { api } from '../api/client';

/** GET /permissions — catalogue complet des permissions systeme. */
export function listerPermissions() {
  return api.get('/permissions');
}
