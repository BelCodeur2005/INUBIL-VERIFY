import { api, apiRequest } from '../api/client';

/** GET /documents — liste paginee, filtrable par statut/type/etudiant/plage de dates. */
export function listerDocuments({ statut, typeDocumentId, etudiantId, dateDebut, dateFin, page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (statut) params.set('statut', statut);
  if (typeDocumentId) params.set('type_document_id', typeDocumentId);
  if (etudiantId) params.set('etudiant_id', etudiantId);
  if (dateDebut) params.set('date_debut', dateDebut);
  if (dateFin) params.set('date_fin', dateFin);
  return api.get(`/documents?${params.toString()}`);
}

/** GET /documents/:id/pdf — URL S3/R2 presignee (valide ~15 min), pas le fichier lui-meme. */
export function getUrlPdfPresignee(documentId) {
  return api.get(`/documents/${documentId}/pdf`);
}

/** POST /documents — cree un document en statut brouillon (CreerDocumentDto). */
export function creerDocument(donnees) {
  return api.post('/documents', donnees);
}

/** POST /documents/:id/pdf — upload multipart du PDF (champ "fichier"). Calcule le hash SHA-256 cote serveur. */
export function uploaderPdf(documentId, fichier) {
  const formData = new FormData();
  formData.append('fichier', fichier);
  return apiRequest(`/documents/${documentId}/pdf`, { method: 'POST', body: formData });
}

/** POST /documents/:id/valider — ancrage blockchain + activation (brouillon|en_validation -> actif). */
export function validerDocument(documentId) {
  return api.post(`/documents/${documentId}/valider`, {});
}

/** POST /documents/:id/rejeter — brouillon|en_validation -> rejete, motif obligatoire. */
export function rejeterDocument(documentId, motif) {
  return api.post(`/documents/${documentId}/rejeter`, { motif });
}
