import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Variante non-bloquante de JwtAuthGuard : authentifie via le token Bearer si
 * present et valide (req.user rempli), mais ne rejette jamais la requete si
 * absent/invalide — pour les endpoints publics qui veulent simplement savoir
 * "qui" agit sans l'exiger (ex: /verify/* pour rattacher une verification a
 * l'historique personnel de l'utilisateur connecte quand il y en a un).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = unknown>(_err: unknown, user: TUser): TUser {
    // Passport passe `false` (jamais une exception) quand le token est absent/invalide —
    // on normalise en undefined pour que @CurrentUser() reste propre.
    return (user || undefined) as TUser;
  }
}
