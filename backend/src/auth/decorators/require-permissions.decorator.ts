import { SetMetadata } from '@nestjs/common';
import { Permission } from '../constants/permissions.constant';

/** Cle de metadonnees lue par le PermissionsGuard. */
export const PERMISSIONS_KEY = 'required_permissions';

/**
 * Declare les permissions requises pour acceder a une route.
 * L'utilisateur doit posseder TOUTES les permissions listees.
 *
 * @example
 * @UseGuards(JwtAuthGuard, PermissionsGuard)
 * @RequirePermissions(Permission.GERER_UTILISATEURS)
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
