import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { Permission } from '../constants/permissions.constant';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;
  let prisma: { role_permissions: { findMany: jest.Mock } };

  /** Fabrique un ExecutionContext minimal portant l'utilisateur donne. */
  const contexte = (user: unknown): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
      getHandler: () => null,
      getClass: () => null,
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = new Reflector();
    prisma = { role_permissions: { findMany: jest.fn() } };
    guard = new PermissionsGuard(reflector, prisma as unknown as PrismaService);
  });

  it('laisse passer si aucune permission n est requise', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    await expect(
      guard.canActivate(contexte({ id: '1', role_id: 'r1' })),
    ).resolves.toBe(true);
  });

  it('renvoie 403 si la permission requise est absente', async () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Permission.GERER_UTILISATEURS]);
    prisma.role_permissions.findMany.mockResolvedValue([]);
    await expect(
      guard.canActivate(contexte({ id: '1', role_id: 'r1' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('laisse passer si la permission requise est presente', async () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Permission.GERER_UTILISATEURS]);
    prisma.role_permissions.findMany.mockResolvedValue([
      { permissions: { nom: Permission.GERER_UTILISATEURS } },
    ]);
    await expect(
      guard.canActivate(contexte({ id: '1', role_id: 'r1' })),
    ).resolves.toBe(true);
  });

  it('renvoie 403 si l utilisateur n a pas de role', async () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Permission.VOIR_AUDIT]);
    await expect(
      guard.canActivate(contexte({ id: '1', role_id: null })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
