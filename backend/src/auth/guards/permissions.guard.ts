import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { Permission } from '../constants/permissions.constant';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../strategies/jwt.strategy';

/**
 * Verifie que l'utilisateur courant possede les permissions requises (RBAC).
 * A utiliser APRES JwtAuthGuard (qui pose `request.user`) :
 *   @UseGuards(JwtAuthGuard, PermissionsGuard)
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requises = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Aucune permission exigee : la route est simplement protegee par l'auth.
    if (!requises || requises.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user || !user.role_id) {
      throw new ForbiddenException('Acces refuse : aucun role attribue');
    }

    // Permissions du role de l'utilisateur, restreintes a celles demandees.
    const liens = await this.prisma.role_permissions.findMany({
      where: {
        role_id: user.role_id,
        permissions: { nom: { in: requises as string[] } },
      },
      select: { permissions: { select: { nom: true } } },
    });

    const possedees = new Set(liens.map((lien) => lien.permissions.nom));
    const aToutesLesPermissions = requises.every((p) => possedees.has(p));

    if (!aToutesLesPermissions) {
      throw new ForbiddenException('Permissions insuffisantes');
    }
    return true;
  }
}
