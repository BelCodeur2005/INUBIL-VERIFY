import { api, apiRequest } from '../api/client';

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
