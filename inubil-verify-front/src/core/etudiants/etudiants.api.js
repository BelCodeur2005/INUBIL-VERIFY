import { api } from '../api/client';

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
