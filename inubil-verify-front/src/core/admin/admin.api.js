import { api } from '../api/client';

/** GET /admin/statistiques — KPIs globaux de la plateforme (permission stats:read). */
export function getStatistiquesGlobales() {
  return api.get('/admin/statistiques');
}
