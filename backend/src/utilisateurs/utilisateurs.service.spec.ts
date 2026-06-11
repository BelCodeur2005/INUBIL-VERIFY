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
  ...overrides,
});

describe('UtilisateursService', () => {
  let service: UtilisateursService;
  let prisma: {
    utilisateurs: jest.Mocked<any>;
    roles: jest.Mocked<any>;
    $transaction: jest.Mock;
  };
  let audit: { log: jest.Mock };

  beforeEach(async () => {
    prisma = {
      utilisateurs: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      roles: { findFirst: jest.fn() },
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

      const result = await service.lister({ page: 1, limit: 20 });

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

      await service.lister({ statut: 'actif' as any });

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

      await service.lister({ search: 'dupont' });

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

      const result = await service.lister({ page: 1, limit: 20 });

      expect(result.total).toBe(45);
      expect(result.totalPages).toBe(3);
    });
  });

  // ─── findOne ─────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('retourne l\'utilisateur si trouvé', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValue(makeUser());

      const result = await service.findOne(USER_ID);

      expect(result.id).toBe(USER_ID);
      expect(result.email).toBe('john@inubil.com');
    });

    it('lève NotFoundException si introuvable', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValue(null);

      await expect(service.findOne(USER_ID)).rejects.toBeInstanceOf(NotFoundException);
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
      prisma.utilisateurs.findFirst.mockResolvedValue(null);

      await expect(
        service.changerStatut(USER_ID, { statut: StatutModifiable.INACTIF }, ACTEUR_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lève BadRequestException si le statut actuel est en_attente_email', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValue(
        makeUser({ statut: 'en_attente_email' }),
      );

      await expect(
        service.changerStatut(USER_ID, { statut: StatutModifiable.ACTIF }, ACTEUR_ID),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('met à jour le statut et trace dans l\'audit', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValue(makeUser({ statut: 'actif' }));
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
      prisma.utilisateurs.findFirst.mockResolvedValue(null);

      await expect(
        service.assignerRole(USER_ID, { role_id: ROLE_ID }, ACTEUR_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lève NotFoundException si le rôle est introuvable', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValue(makeUser());
      prisma.roles.findFirst.mockResolvedValue(null);

      await expect(
        service.assignerRole(USER_ID, { role_id: ROLE_ID }, ACTEUR_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('assigne le rôle et trace dans l\'audit', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValue(makeUser());
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
});
