import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ClesApiService } from './cles-api.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const ACTEUR_ID = 'usr-0000-0000-0000-000000000001';
const SUPER_ADMIN_ID = 'usr-0000-0000-0000-000000000099';
const UNIV_ID = 'univ-0000-0000-0000-000000000001';
const AUTRE_UNIV_ID = 'univ-0000-0000-0000-000000000002';
const CLE_ID = 'cle-0000-0000-0000-000000000001';

const makeCle = (overrides: any = {}) => ({
  id: CLE_ID,
  universite_id: UNIV_ID,
  nom: 'Integration ERP',
  prefix: 'inub_ab12',
  permissions: [],
  expiration: null,
  est_active: true,
  ip_whitelist: [],
  derniere_utilisation: null,
  nb_utilisations: 0,
  created_at: new Date('2026-01-01'),
  ...overrides,
});

const makePrisma = () => ({
  utilisateurs: { findFirst: jest.fn() },
  cles_api: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
});

describe('ClesApiService', () => {
  let service: ClesApiService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(async () => {
    prisma = makePrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClesApiService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: { log: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    service = module.get(ClesApiService);
  });

  const asActeurDeUniv = () =>
    prisma.utilisateurs.findFirst.mockResolvedValue({
      universite_id: UNIV_ID,
      roles_utilisateurs_role_idToroles: { nom: 'responsable_universite' },
    });
  const asSuperAdmin = () =>
    prisma.utilisateurs.findFirst.mockResolvedValue({
      universite_id: null,
      roles_utilisateurs_role_idToroles: { nom: 'super_admin' },
    });
  /** Cas cible du finding securite : sans universite ET sans role super_admin -> refuse, pas bypass. */
  const asUtilisateurOrphelin = () =>
    prisma.utilisateurs.findFirst.mockResolvedValue({
      universite_id: null,
      roles_utilisateurs_role_idToroles: { nom: 'agent_saisie' },
    });

  describe('lister', () => {
    it('filtre par universite pour un acteur normal', async () => {
      asActeurDeUniv();
      prisma.cles_api.findMany.mockResolvedValue([]);

      await service.lister(ACTEUR_ID);

      expect(prisma.cles_api.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { universite_id: UNIV_ID } }),
      );
    });

    it('super-admin voit toutes les clés API, sans filtre', async () => {
      asSuperAdmin();
      prisma.cles_api.findMany.mockResolvedValue([]);

      await service.lister(SUPER_ADMIN_ID);

      expect(prisma.cles_api.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined }),
      );
    });
  });

  describe('findOne', () => {
    it('lève ForbiddenException si la clé appartient à une autre université', async () => {
      asActeurDeUniv();
      prisma.cles_api.findFirst.mockResolvedValue(makeCle({ universite_id: AUTRE_UNIV_ID }));

      await expect(service.findOne(CLE_ID, ACTEUR_ID)).rejects.toThrow(ForbiddenException);
    });

    it('lève NotFoundException si la clé n\'existe pas', async () => {
      asActeurDeUniv();
      prisma.cles_api.findFirst.mockResolvedValue(null);

      await expect(service.findOne(CLE_ID, ACTEUR_ID)).rejects.toThrow(NotFoundException);
    });

    it('super-admin peut consulter une clé de n\'importe quelle université', async () => {
      asSuperAdmin();
      prisma.cles_api.findFirst.mockResolvedValue(makeCle({ universite_id: AUTRE_UNIV_ID }));

      await expect(service.findOne(CLE_ID, SUPER_ADMIN_ID)).resolves.toBeDefined();
    });
  });

  describe('creer', () => {
    it('rattache la clé à l\'université de l\'acteur normal', async () => {
      asActeurDeUniv();
      prisma.cles_api.create.mockResolvedValue(makeCle());

      await service.creer({ nom: 'Test' }, ACTEUR_ID);

      expect(prisma.cles_api.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ universite_id: UNIV_ID }) }),
      );
    });

    it('lève ForbiddenException pour un super-admin (aucune université à laquelle rattacher la ressource)', async () => {
      asSuperAdmin();

      await expect(service.creer({ nom: 'Test' }, SUPER_ADMIN_ID)).rejects.toThrow(ForbiddenException);
      expect(prisma.cles_api.create).not.toHaveBeenCalled();
    });
  });

  describe('modifier / revoquer', () => {
    it('super-admin peut modifier une clé d\'une autre université', async () => {
      asSuperAdmin();
      prisma.cles_api.findFirst.mockResolvedValue(makeCle({ universite_id: AUTRE_UNIV_ID }));
      prisma.cles_api.update.mockResolvedValue(makeCle({ universite_id: AUTRE_UNIV_ID, nom: 'Renommé' }));

      await expect(service.modifier(CLE_ID, { nom: 'Renommé' }, SUPER_ADMIN_ID)).resolves.toBeDefined();
    });

    it('super-admin peut révoquer une clé d\'une autre université', async () => {
      asSuperAdmin();
      prisma.cles_api.findFirst.mockResolvedValue(makeCle({ universite_id: AUTRE_UNIV_ID }));

      await expect(service.revoquer(CLE_ID, SUPER_ADMIN_ID)).resolves.toBeUndefined();
      expect(prisma.cles_api.delete).toHaveBeenCalledWith({ where: { id: CLE_ID } });
    });

    it('acteur normal ne peut pas révoquer une clé d\'une autre université', async () => {
      asActeurDeUniv();
      prisma.cles_api.findFirst.mockResolvedValue(makeCle({ universite_id: AUTRE_UNIV_ID }));

      await expect(service.revoquer(CLE_ID, ACTEUR_ID)).rejects.toThrow(ForbiddenException);
    });

    it('un utilisateur sans université ET sans rôle super_admin est refusé, pas bypassé (pas de fail-open)', async () => {
      asUtilisateurOrphelin();

      await expect(service.lister('orphelin')).rejects.toThrow(ForbiddenException);
      expect(prisma.cles_api.findMany).not.toHaveBeenCalled();
    });
  });
});
