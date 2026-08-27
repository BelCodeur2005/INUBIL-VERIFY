import { api } from '../api/client';

/** GET /etudiants/moi — dossier academique de l'etudiant connecte (nom certifie, matricule, telephone...). */
export function getMonProfilEtudiant() {
  return api.get('/etudiants/moi');
}

/** GET /etudiants/moi/documents — diplomes et releves de l'etudiant connecte (filtres statut + pagination). */
export function listerMesDocuments({ statut, page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (statut) params.set('statut', statut);
  return api.get(`/etudiants/moi/documents?${params.toString()}`);
}

/** GET /etudiants/moi/documents/:id/pdf — URL S3/R2 presignee (courte duree) pour le PDF d'un document possede. */
export function getUrlPdfMonDocument(documentId) {
  return api.get(`/etudiants/moi/documents/${documentId}/pdf`);
}

/** GET /etudiants/moi/statistiques — compteurs agreges (documents, verifications, partages) de l'etudiant connecte. */
export function getMesStatistiques() {
  return api.get('/etudiants/moi/statistiques');
}

/** GET /etudiants/moi/verifications — historique des controles publics (lien/QR/hash) sur mes documents. */
export function listerMesVerifications({ page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  return api.get(`/etudiants/moi/verifications?${params.toString()}`);
}

/** GET /etudiants/moi/partages — liens de partage actifs de l'etudiant connecte. */
export function listerMesPartages() {
  return api.get('/etudiants/moi/partages');
}

/** POST /etudiants/moi/partages — cree un lien de partage (CreerPartageDto : document_id, email_destinataire?, date_expiration?, permanent?). */
export function creerPartage(donnees) {
  return api.post('/etudiants/moi/partages', donnees);
}

/** DELETE /etudiants/moi/partages/:id — revoque un lien de partage. */
export function revoquerPartage(id) {
  return api.delete(`/etudiants/moi/partages/${id}`);
}

/** GET /admin/etudiants — recherche libre (nom/prenom/matricule), scope auto sur l'universite de l'acteur. */
export function rechercherEtudiants(search, { page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) params.set('search', search);
  return api.get(`/admin/etudiants?${params.toString()}`);
}

/** POST /admin/etudiants — cree un dossier etudiant (CreerEtudiantAdminDto). */
export function creerEtudiant(donnees) {
  return api.post('/admin/etudiants', donnees);
}

/** GET /admin/etudiants/:id — fiche complete (utilise pour resoudre nom/matricule dans les listes de documents). */
export function getEtudiant(id) {
  return api.get(`/admin/etudiants/${id}`);
}

/** PATCH /admin/etudiants/:id — modifie la fiche (UpdateEtudiantAdminDto, universite_id non modifiable). */
export function modifierEtudiant(id, donnees) {
  return api.patch(`/admin/etudiants/${id}`, donnees);
}

/** DELETE /admin/etudiants/:id — soft delete, bloque (409) si l'etudiant a des documents emis. */
export function supprimerEtudiant(id) {
  return api.delete(`/admin/etudiants/${id}`);
}
