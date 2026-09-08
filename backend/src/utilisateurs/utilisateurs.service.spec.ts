import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { UtilisateursService } from './utilisateurs.service';
import { StatutModifiable } from './dto/changer-statut-utilisateur.dto';

const ACTEUR_ID = 'acteur-uuid-1';
const USER_ID = 'user-uuid-1';
const ROLE_ID = 'role-uuid-1';

const makeUser = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: USER_ID,
  nom: 'Doe',
  prenom: 'John',
  email: 'john@inubil.com',
  email_verifie: true,
  statut: 'actif',
  avatar_url: null,
  langue: 'fr',
  derniere_connexion: null,
  role_id: null,
  universite_id: null,
  deleted_at: null,
  created_at: new Date(),
  updated_at: new Date(),
  roles_utilisateurs_role_idToroles: null,
  universites_utilisateurs_universite_idTouniversites: null,
  departements: [],
  ...overrides,
});

// L'acteur par defaut est un super_admin (bypass le scoping universite) —
// les tests qui n'exercent pas explicitement le scoping restent inchanges.
const makeActeur = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: ACTEUR_ID,
  universite_id: null,
  roles_utilisateurs_role_idToroles: { nom: 'super_admin' },
  ...overrides,
});

describe('UtilisateursService', () => {
  let service: UtilisateursService;
  let prisma: {
    utilisateurs: jest.Mocked<any>;
    roles: jest.Mocked<any>;
    departements: jest.Mocked<any>;
    $transaction: jest.Mock;
  };
  let audit: { log: jest.Mock };
  let targetUser: any;

  beforeEach(async () => {
    targetUser = null;
    prisma = {
      utilisateurs: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn().mockImplementation(async ({ where }: any) => {
          if (where.id === ACTEUR_ID) return makeActeur();
          return targetUser;
        }),
        update: jest.fn(),
      },
      roles: { findFirst: jest.fn() },
      departements: { count: jest.fn() },
      $transaction: jest.fn(),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UtilisateursService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(UtilisateursService);
  });

  // ─── lister ──────────────────────────────────────────────────────────────

  describe('lister', () => {
    it('retourne une page vide si aucun utilisateur', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      const result = await service.lister({ page: 1, limit: 20 }, ACTEUR_ID);

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('applique le filtre statut', async () => {
      prisma.utilisateurs.findMany.mockResolvedValue([makeUser()]);
      prisma.utilisateurs.count.mockResolvedValue(1);
      prisma.$transaction.mockImplementation((ops: Promise<unknown>[]) =>
        Promise.all(ops),
      );

      await service.lister({ statut: 'actif' as any }, ACTEUR_ID);

      expect(prisma.utilisateurs.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ statut: 'actif' }),
        }),
      );
    });

    it('applique le filtre search sur nom / prenom / email', async () => {
      prisma.utilisateurs.findMany.mockResolvedValue([]);
      prisma.utilisateurs.count.mockResolvedValue(0);
      prisma.$transaction.mockImplementation((ops: Promise<unknown>[]) =>
        Promise.all(ops),
      );

      await service.lister({ search: 'dupont' }, ACTEUR_ID);

      expect(prisma.utilisateurs.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ email: expect.objectContaining({ contains: 'dupont' }) }),
            ]),
          }),
        }),
      );
    });

    it('calcule totalPages correctement', async () => {
      prisma.$transaction.mockResolvedValue([
        Array(20).fill(makeUser()),
        45,
      ]);

      const result = await service.lister({ page: 1, limit: 20 }, ACTEUR_ID);

      expect(result.total).toBe(45);
      expect(result.totalPages).toBe(3);
    });

    it('restreint a l\'universite de l\'acteur si celui-ci n\'est pas super_admin/admin_istama', async () => {
      prisma.utilisateurs.findFirst.mockImplementation(async ({ where }: any) => {
        if (where.id === ACTEUR_ID) {
          return makeActeur({
            universite_id: 'univ-acteur',
            roles_utilisateurs_role_idToroles: { nom: 'responsable_universite' },
          });
        }
        return targetUser;
      });
      prisma.$transaction.mockResolvedValue([[], 0]);

      await service.lister({ universite_id: 'autre-univ' as any }, ACTEUR_ID);

      expect(prisma.utilisateurs.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ universite_id: 'univ-acteur' }),
        }),
      );
    });
  });

  // ─── findOne ─────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('retourne l\'utilisateur si trouvé', async () => {
      targetUser = makeUser();

      const result = await service.findOne(USER_ID, ACTEUR_ID);

      expect(result.id).toBe(USER_ID);
      expect(result.email).toBe('john@inubil.com');
    });

    it('lève NotFoundException si introuvable', async () => {
      targetUser = null;

      await expect(service.findOne(USER_ID, ACTEUR_ID)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lève ForbiddenException si l\'utilisateur cible est d\'une autre université', async () => {
      prisma.utilisateurs.findFirst.mockImplementation(async ({ where }: any) => {
        if (where.id === ACTEUR_ID) {
          return makeActeur({
            universite_id: 'univ-acteur',
            roles_utilisateurs_role_idToroles: { nom: 'responsable_universite' },
          });
        }
        return targetUser;
      });
      targetUser = makeUser({ universite_id: 'autre-univ' });

      await expect(service.findOne(USER_ID, ACTEUR_ID)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  // ─── changerStatut ────────────────────────────────────────────────────────

  describe('changerStatut', () => {
    it('lève ForbiddenException si l\'acteur modifie son propre statut', async () => {
      await expect(
        service.changerStatut(ACTEUR_ID, { statut: StatutModifiable.SUSPENDU }, ACTEUR_ID),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('lève NotFoundException si l\'utilisateur cible est introuvable', async () => {
      targetUser = null;

      await expect(
        service.changerStatut(USER_ID, { statut: StatutModifiable.INACTIF }, ACTEUR_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lève BadRequestException si le statut actuel est en_attente_email', async () => {
      targetUser = makeUser({ statut: 'en_attente_email' });

      await expect(
        service.changerStatut(USER_ID, { statut: StatutModifiable.ACTIF }, ACTEUR_ID),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('met à jour le statut et trace dans l\'audit', async () => {
      targetUser = makeUser({ statut: 'actif' });
      prisma.utilisateurs.update.mockResolvedValue(makeUser({ statut: 'suspendu' }));

      const result = await service.changerStatut(
        USER_ID,
        { statut: StatutModifiable.SUSPENDU },
        ACTEUR_ID,
      );

      expect(prisma.utilisateurs.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ statut: StatutModifiable.SUSPENDU }),
        }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'UTILISATEUR_STATUT_CHANGE' }),
      );
      expect(result.statut).toBe('suspendu');
    });
  });

  // ─── assignerRole ─────────────────────────────────────────────────────────

  describe('assignerRole', () => {
    it('lève NotFoundException si l\'utilisateur est introuvable', async () => {
      targetUser = null;

      await expect(
        service.assignerRole(USER_ID, { role_id: ROLE_ID }, ACTEUR_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lève NotFoundException si le rôle est introuvable', async () => {
      targetUser = makeUser();
      prisma.roles.findFirst.mockResolvedValue(null);

      await expect(
        service.assignerRole(USER_ID, { role_id: ROLE_ID }, ACTEUR_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('assigne le rôle et trace dans l\'audit', async () => {
      targetUser = makeUser();
      prisma.roles.findFirst.mockResolvedValue({ id: ROLE_ID, nom: 'responsable' });
      prisma.utilisateurs.update.mockResolvedValue(
        makeUser({
          role_id: ROLE_ID,
          roles_utilisateurs_role_idToroles: { id: ROLE_ID, nom: 'responsable' },
        }),
      );

      const result = await service.assignerRole(
        USER_ID,
        { role_id: ROLE_ID },
        ACTEUR_ID,
      );

      expect(prisma.utilisateurs.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role_id: ROLE_ID }),
        }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'UTILISATEUR_ROLE_ASSIGNE' }),
      );
      expect(result.role?.id).toBe(ROLE_ID);
    });
  });

  // ─── assignerDepartements ───────────────────────────────────────────────────

  describe('assignerDepartements', () => {
    it('lève NotFoundException si l\'utilisateur est introuvable', async () => {
      targetUser = null;

      await expect(
        service.assignerDepartements(USER_ID, { departement_ids: [] }, ACTEUR_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lève BadRequestException si un departement n\'appartient pas a l\'universite de la cible', async () => {
      targetUser = makeUser({ universite_id: 'univ-1' });
      prisma.departements.count.mockResolvedValue(0);

      await expect(
        service.assignerDepartements(USER_ID, { departement_ids: ['dep-1'] }, ACTEUR_ID),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('remplace les departements et trace dans l\'audit', async () => {
      targetUser = makeUser({ universite_id: 'univ-1' });
      prisma.departements.count.mockResolvedValue(2);
      prisma.utilisateurs.update.mockResolvedValue(
        makeUser({ departements: [{ id: 'dep-1', nom: 'GI' }, { id: 'dep-2', nom: 'Meca' }] }),
      );

      const result = await service.assignerDepartements(
        USER_ID,
        { departement_ids: ['dep-1', 'dep-2'] },
        ACTEUR_ID,
      );

      expect(prisma.utilisateurs.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { departements: { set: [{ id: 'dep-1' }, { id: 'dep-2' }] } },
        }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'UTILISATEUR_DEPARTEMENTS_ASSIGNES' }),
      );
      expect(result.departements).toHaveLength(2);
    });
  });
});
