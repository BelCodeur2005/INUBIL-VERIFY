import { api } from '../api/client';
import { setTokens } from '../api/token-storage';

/** POST /invitations — invite un collaborateur par email (TTL 72h, CreerInvitationDto). */
export function creerInvitation(donnees) {
  return api.post('/invitations', donnees);
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
