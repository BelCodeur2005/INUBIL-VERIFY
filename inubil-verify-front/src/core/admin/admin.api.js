import { api } from '../api/client';

/** GET /admin/statistiques — KPIs globaux de la plateforme (permission stats:read). */
export function getStatistiquesGlobales() {
  return api.get('/admin/statistiques');
}

/** GET /admin/statistiques/graphe — series temporelles verifications + documents emis. */
export function getStatistiquesGraphe({ granularite, debut, fin } = {}) {
  const params = new URLSearchParams();
  if (granularite) params.set('granularite', granularite);
  if (debut) params.set('debut', debut);
  if (fin) params.set('fin', fin);
  const qs = params.toString();
  return api.get(`/admin/statistiques/graphe${qs ? `?${qs}` : ''}`);
}

/** GET /admin/utilisateurs — liste paginee, toutes universites (permission user:read). */
export function listerUtilisateursAdmin({ page = 1, limit = 20, statut, role_id, universite_id, search } = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (statut) params.set('statut', statut);
  if (role_id) params.set('role_id', role_id);
  if (universite_id) params.set('universite_id', universite_id);
  if (search) params.set('search', search);
  return api.get(`/admin/utilisateurs?${params.toString()}`);
}

/** PATCH /admin/utilisateurs/:id/activer */
export function activerUtilisateurAdmin(id) {
  return api.patch(`/admin/utilisateurs/${id}/activer`);
}

/** PATCH /admin/utilisateurs/:id/desactiver */
export function desactiverUtilisateurAdmin(id) {
  return api.patch(`/admin/utilisateurs/${id}/desactiver`);
}

/** GET /admin/documents — tous les documents de la plateforme (permission doc:read), memes filtres que GET /documents. */
export function listerDocumentsAdmin({ statut, typeDocumentId, etudiantId, dateDebut, dateFin, page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (statut) params.set('statut', statut);
  if (typeDocumentId) params.set('type_document_id', typeDocumentId);
  if (etudiantId) params.set('etudiant_id', etudiantId);
  if (dateDebut) params.set('date_debut', dateDebut);
  if (dateFin) params.set('date_fin', dateFin);
  return api.get(`/admin/documents?${params.toString()}`);
}

/** GET /admin/audit — journal d'audit paginé (permission audit:read). */
export function listerJournalAudit({ page = 1, limit = 50, utilisateur_id, action, module, date_debut, date_fin } = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (utilisateur_id) params.set('utilisateur_id', utilisateur_id);
  if (action) params.set('action', action);
  if (module) params.set('module', module);
  if (date_debut) params.set('date_debut', date_debut);
  if (date_fin) params.set('date_fin', date_fin);
  return api.get(`/admin/audit?${params.toString()}`);
}

/** POST /admin/backup — declenche un backup manuel (pg_dump -> upload), permission config:edit. */
export function declencherBackup() {
  return api.post('/admin/backup');
}
