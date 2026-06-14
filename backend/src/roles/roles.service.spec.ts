import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { RolesService } from './roles.service';

const ACTEUR_ID = 'user-uuid-1';
const ROLE_ID = 'role-uuid-1';
const PERM_ID_1 = 'perm-uuid-1';
const PERM_ID_2 = 'perm-uuid-2';

const makeRole = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: ROLE_ID,
  nom: 'Responsable diplômes',
  description: null,
  est_systeme: false,
  universite_id: 'univ-uuid-1',
  created_by: ACTEUR_ID,
  created_at: new Date(),
  updated_at: new Date(),
  role_permissions: [],
  ...overrides,
});

describe('RolesService', () => {
  let service: RolesService;
  let prisma: {
    roles: jest.Mocked<any>;
    utilisateurs: jest.Mocked<any>;
    permissions: jest.Mocked<any>;
    role_permissions: jest.Mocked<any>;
    $transaction: jest.Mock;
  };
  let audit: { log: jest.Mock };

  beforeEach(async () => {
    prisma = {
      roles: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      utilisateurs: { count: jest.fn() },
      permissions: { findMany: jest.fn() },
      role_permissions: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(RolesService);
  });

  describe('lister', () => {
    it('filtre par universite_id quand fourni', async () => {
      prisma.roles.findMany.mockResolvedValue([makeRole()]);
      await service.lister('univ-uuid-1');
      expect(prisma.roles.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { universite_id: 'univ-uuid-1' } }),
      );
    });

    it('retourne tous les rôles si aucun filtre', async () => {
      prisma.roles.findMany.mockResolvedValue([]);
      await service.lister();
      expect(prisma.roles.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined }),
      );
    });
  });

  describe('creer', () => {
    it('crée avec est_systeme=false et created_by', async () => {
      prisma.roles.findFirst.mockResolvedValue(null);
      prisma.roles.create.mockResolvedValue(makeRole());

      await service.creer({ nom: 'Responsable diplômes', universite_id: 'univ-uuid-1' }, ACTEUR_ID);

      expect(prisma.roles.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ est_systeme: false, created_by: ACTEUR_ID }),
        }),
      );
    });

    it('lève ConflictException si le nom est déjà pris dans l\'université', async () => {
      prisma.roles.findFirst.mockResolvedValue(makeRole());
      await expect(
        service.creer({ nom: 'Responsable diplômes', universite_id: 'univ-uuid-1' }, ACTEUR_ID),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('modifier', () => {
    it('modifie un rôle système (est_systeme=true) - autorisé', async () => {
      const roleSysteme = makeRole({ est_systeme: true });
      prisma.roles.findUnique
        .mockResolvedValueOnce(roleSysteme)
        .mockResolvedValueOnce({ ...roleSysteme, role_permissions: [] });
      prisma.roles.findFirst.mockResolvedValue(null);
      prisma.roles.update.mockResolvedValue({ ...roleSysteme, nom: 'Super Admin Modifié', role_permissions: [] });

      const result = await service.modifier(ROLE_ID, { nom: 'Super Admin Modifié' }, ACTEUR_ID);
      expect(result.nom).toBe('Super Admin Modifié');
    });

    it('lève NotFoundException si rôle inexistant', async () => {
      prisma.roles.findUnique.mockResolvedValue(null);
      await expect(service.modifier(ROLE_ID, { nom: 'X' }, ACTEUR_ID)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('supprimer', () => {
    it('lève ForbiddenException si est_systeme=true', async () => {
      prisma.roles.findUnique.mockResolvedValue(makeRole({ est_systeme: true }));
      await expect(service.supprimer(ROLE_ID, ACTEUR_ID)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('lève ConflictException si le rôle est assigné à des utilisateurs', async () => {
      prisma.roles.findUnique.mockResolvedValue(makeRole({ est_systeme: false }));
      prisma.utilisateurs.count.mockResolvedValue(3);
      await expect(service.supprimer(ROLE_ID, ACTEUR_ID)).rejects.toBeInstanceOf(ConflictException);
    });

    it('supprime le rôle si conditions réunies', async () => {
      prisma.roles.findUnique.mockResolvedValue(makeRole({ est_systeme: false }));
      prisma.utilisateurs.count.mockResolvedValue(0);
      prisma.roles.delete.mockResolvedValue({});

      await service.supprimer(ROLE_ID, ACTEUR_ID);
      expect(prisma.roles.delete).toHaveBeenCalledWith({ where: { id: ROLE_ID } });
    });
  });

  describe('assignerPermissions', () => {
    it('lève BadRequestException si un permission_id est inconnu', async () => {
      prisma.roles.findUnique.mockResolvedValue(makeRole());
      prisma.permissions.findMany.mockResolvedValue([{ id: PERM_ID_1 }]);

      await expect(
        service.assignerPermissions(ROLE_ID, { permission_ids: [PERM_ID_1, PERM_ID_2] }, ACTEUR_ID),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('remplace les permissions en transaction atomique', async () => {
      prisma.roles.findUnique
        .mockResolvedValueOnce(makeRole())
        .mockResolvedValueOnce({ ...makeRole(), role_permissions: [] });
      prisma.permissions.findMany.mockResolvedValue([{ id: PERM_ID_1 }, { id: PERM_ID_2 }]);
      prisma.$transaction.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops));
      prisma.role_permissions.deleteMany.mockResolvedValue({});
      prisma.role_permissions.createMany.mockResolvedValue({});

      await service.assignerPermissions(
        ROLE_ID,
        { permission_ids: [PERM_ID_1, PERM_ID_2] },
        ACTEUR_ID,
      );

      expect(prisma.role_permissions.deleteMany).toHaveBeenCalledWith({ where: { role_id: ROLE_ID } });
      expect(prisma.role_permissions.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ role_id: ROLE_ID, permission_id: PERM_ID_1, accordee_par: ACTEUR_ID }),
          ]),
        }),
      );
    });
  });
});
