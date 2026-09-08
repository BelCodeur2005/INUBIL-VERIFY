import { api } from '../api/client';

/** GET /verifications/mes-verifications — vérifications effectuées par le compte connecté (tri date desc). */
export function listerMesVerifications({ page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  return api.get(`/verifications/mes-verifications?${params.toString()}`);
}
