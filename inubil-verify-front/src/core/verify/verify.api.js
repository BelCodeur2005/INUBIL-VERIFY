import { api } from '../api/client';
import { API_BASE_URL } from '../api/config';

/** GET /verify/:identifiant — verification par lien/QR, publique (30 req/min/IP). */
export function verifierParIdentifiant(identifiant) {
  return api.get(`/verify/${encodeURIComponent(identifiant)}`, { auth: false });
}

/** POST /verify/hash — verification par hash SHA-256 (64 hex), publique (10 req/min/IP). */
export function verifierParHash(hash) {
  return api.post('/verify/hash', { hash }, { auth: false });
}

/** POST /verify/upload — verification par upload PDF, hash calcule cote serveur, publique (5 req/min/IP). */
export function verifierParUpload(fichier) {
  const formData = new FormData();
  formData.append('fichier', fichier);
  return api.post('/verify/upload', formData, { auth: false });
}

/**
 * GET /verify/:identifiant/rapport — telecharge le rapport PDF horodate.
 * Reponse binaire (application/pdf), donc en dehors du client JSON habituel.
 */
export async function telechargerRapport(identifiant) {
  const response = await fetch(`${API_BASE_URL}/verify/${encodeURIComponent(identifiant)}/rapport`);
  if (!response.ok) {
    throw new Error('Impossible de generer le rapport de verification pour le moment.');
  }

  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') ?? '';
  const correspondance = disposition.match(/filename="?([^"]+)"?/);
  const filename = correspondance ? correspondance[1] : `rapport-verification-${identifiant}.pdf`;

  const url = URL.createObjectURL(blob);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = filename;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  URL.revokeObjectURL(url);
}
