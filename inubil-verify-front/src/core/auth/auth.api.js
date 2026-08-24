import { api } from '../api/client';
import { setTokens, clearTokens, getRefreshToken } from '../api/token-storage';

/** POST /auth/login — email + mot_de_passe (noms exacts attendus par LoginDto). */
export async function login(email, mot_de_passe) {
  const jetons = await api.post('/auth/login', { email, mot_de_passe }, { auth: false });
  setTokens(jetons);
  return jetons.user;
}

/** POST /auth/logout — revoque la session cote serveur puis nettoie les jetons locaux. */
export async function logout() {
  const refresh_token = getRefreshToken();
  if (refresh_token) {
    await api.post('/auth/logout', { refresh_token }, { auth: false }).catch(() => {
      // Le serveur peut deja avoir revoque/expire la session : on nettoie quand meme localement.
    });
  }
  clearTokens();
}

/** GET /auth/me — profil complet de l'utilisateur connecte. */
export function getProfil() {
  return api.get('/auth/me');
}

/** PATCH /auth/me — modifie nom/prenom (email declenche une re-verification, non gere ici). */
export function modifierProfil(donnees) {
  return api.patch('/auth/me', donnees);
}

/** PATCH /auth/password — changement de mot de passe (204 sans corps). */
export function changerMotDePasse(donnees) {
  return api.patch('/auth/password', donnees);
}

/** GET /auth/sessions — sessions actives de l'utilisateur connecte. */
export function listerSessions() {
  return api.get('/auth/sessions');
}

/** DELETE /auth/sessions/:id — revoque une session a distance (204 sans corps). */
export function revoquerSession(id) {
  return api.delete(`/auth/sessions/${id}`);
}
