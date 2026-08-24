import { api } from '../api/client';

/** POST /invitations — invite un collaborateur par email (TTL 72h, CreerInvitationDto). */
export function creerInvitation(donnees) {
  return api.post('/invitations', donnees);
}
