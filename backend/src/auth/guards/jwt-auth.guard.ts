import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard minimal : protege une route via l'access token JWT.
 * La version enrichie (roles + permissions RBAC) sera ajoutee en #10.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
