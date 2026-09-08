import { API_BASE_URL } from './config';
import { getAccessToken } from './token-storage';
import { ApiError } from './client';

/**
 * Telecharge un fichier binaire (CSV, PDF...) depuis l'API avec le token courant,
 * et declenche le telechargement navigateur. Utilise pour les exports CSV et le
 * rapport de verification (reponses non-JSON, donc en dehors du client api.* habituel).
 */
export async function telechargerFichier(path, filenameParDefaut) {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new ApiError(response.status, `Échec du téléchargement (${response.status})`);
  }

  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') ?? '';
  const correspondance = disposition.match(/filename="?([^"]+)"?/);
  const filename = correspondance ? correspondance[1] : filenameParDefaut;

  const url = URL.createObjectURL(blob);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = filename;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  URL.revokeObjectURL(url);
}
