import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

/** Contenu du payload signe dans l'access token. */
export interface JwtPayload {
  sub: string;
  email: string;
  role_id: string | null;
}

/** Utilisateur attache a la requete apres validation du token (req.user). */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role_id: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') as string,
    });
  }

  /** Verifie que l'utilisateur du token existe toujours et est actif. */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.utilisateurs.findFirst({
      where: { id: payload.sub, deleted_at: null },
    });

    if (!user || user.statut === 'suspendu' || user.statut === 'inactif') {
      throw new UnauthorizedException('Session invalide');
    }

    return { id: user.id, email: user.email, role_id: user.role_id };
  }
}
