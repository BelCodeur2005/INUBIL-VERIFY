import { api } from '../api/client';
import { setTokens } from '../api/token-storage';

/** POST /invitations — invite un collaborateur par email (TTL 72h, CreerInvitationDto). */
export function creerInvitation(donnees) {
  return api.post('/invitations', donnees);
}

/** GET /invitations — liste paginee des invitations collaborateurs (filtre optionnel par statut). */
export function listerInvitations({ statut, page = 1, limit = 50 } = {}) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (statut) params.set('statut', statut);
  return api.get(`/invitations?${params.toString()}`);
}

/** POST /invitations/:id/renvoyer — regenere le token (TTL 72h) et renvoie l'email. */
export function renvoyerInvitation(id) {
  return api.post(`/invitations/${id}/renvoyer`);
}

/** DELETE /invitations/:id — annule une invitation en attente (suppression definitive). */
export function annulerInvitation(id) {
  return api.delete(`/invitations/${id}`);
}

/**
 * POST /invitations/activer — accepte une invitation collaborateur (token recu par email).
 * Cree le compte si besoin (nom/prenom/mot_de_passe requis dans ce cas) ou assigne le role
 * a un compte existant. Pose les jetons retournes, exactement comme un login classique.
 */
export async function activerInvitation({ token, nom, prenom, mot_de_passe }) {
  const jetons = await api.post(
    '/invitations/activer',
    { token, nom, prenom, mot_de_passe },
    { auth: false },
  );
  setTokens(jetons);
  return jetons;
}
