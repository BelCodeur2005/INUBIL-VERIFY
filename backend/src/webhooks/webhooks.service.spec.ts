import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

jest.mock('./webhook-url-guard', () => ({
  assertSafeWebhookUrl: jest.fn().mockResolvedValue(undefined),
  safeWebhookFetch: jest.fn().mockResolvedValue({ ok: true, status: 200 }),
}));

const ACTEUR_ID = 'usr-0000-0000-0000-000000000001';
const SUPER_ADMIN_ID = 'usr-0000-0000-0000-000000000099';
const UNIV_ID = 'univ-0000-0000-0000-000000000001';
const AUTRE_UNIV_ID = 'univ-0000-0000-0000-000000000002';
const WEBHOOK_ID = 'wh-0000-0000-0000-000000000001';

const makeWebhook = (overrides: any = {}) => ({
  id: WEBHOOK_ID,
  universite_id: UNIV_ID,
  nom: 'Webhook ERP',
  url: 'https://erp.exemple.cm/webhooks/inubil',
  evenements: ['diplome.valide'],
  statut: 'actif',
  secret: 'secret',
  nb_succes: 0,
  nb_echecs: 0,
  derniere_livraison: null,
  created_at: new Date('2026-01-01'),
  ...overrides,
});

const makePrisma = () => ({
  utilisateurs: { findFirst: jest.fn() },
  webhooks: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  webhook_livraisons: { findMany: jest.fn(), create: jest.fn() },
});

describe('WebhooksService', () => {
  let service: WebhooksService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(async () => {
    prisma = makePrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: { log: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    service = module.get(WebhooksService);
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
      prisma.webhooks.findMany.mockResolvedValue([]);

      await service.lister(ACTEUR_ID);

      expect(prisma.webhooks.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { universite_id: UNIV_ID } }),
      );
    });

    it('super-admin (universite_id=null) voit tous les webhooks, sans filtre', async () => {
      asSuperAdmin();
      prisma.webhooks.findMany.mockResolvedValue([]);

      await service.lister(SUPER_ADMIN_ID);

      expect(prisma.webhooks.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined }),
      );
    });
  });

  describe('findOne', () => {
    it('lève ForbiddenException si le webhook appartient à une autre université', async () => {
      asActeurDeUniv();
      prisma.webhooks.findFirst.mockResolvedValue(makeWebhook({ universite_id: AUTRE_UNIV_ID }));

      await expect(service.findOne(WEBHOOK_ID, ACTEUR_ID)).rejects.toThrow(ForbiddenException);
    });

    it('lève NotFoundException si le webhook n\'existe pas', async () => {
      asActeurDeUniv();
      prisma.webhooks.findFirst.mockResolvedValue(null);

      await expect(service.findOne(WEBHOOK_ID, ACTEUR_ID)).rejects.toThrow(NotFoundException);
    });

    it('super-admin peut consulter un webhook de n\'importe quelle université', async () => {
      asSuperAdmin();
      prisma.webhooks.findFirst.mockResolvedValue(makeWebhook({ universite_id: AUTRE_UNIV_ID }));

      await expect(service.findOne(WEBHOOK_ID, SUPER_ADMIN_ID)).resolves.toBeDefined();
    });
  });

  describe('creer', () => {
    it('rattache le webhook à l\'université de l\'acteur normal', async () => {
      asActeurDeUniv();
      prisma.webhooks.create.mockResolvedValue(makeWebhook());

      await service.creer({ nom: 'Test', url: 'https://exemple.cm/hook', evenements: ['diplome.valide'] }, ACTEUR_ID);

      expect(prisma.webhooks.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ universite_id: UNIV_ID }) }),
      );
    });

    it('lève ForbiddenException pour un super-admin (aucune université à laquelle rattacher la ressource)', async () => {
      asSuperAdmin();

      await expect(
        service.creer({ nom: 'Test', url: 'https://exemple.cm/hook', evenements: ['diplome.valide'] }, SUPER_ADMIN_ID),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.webhooks.create).not.toHaveBeenCalled();
    });
  });

  describe('modifier / supprimer / listerLivraisons / tester', () => {
    it('super-admin peut modifier un webhook d\'une autre université', async () => {
      asSuperAdmin();
      prisma.webhooks.findFirst.mockResolvedValue(makeWebhook({ universite_id: AUTRE_UNIV_ID }));
      prisma.webhooks.update.mockResolvedValue(makeWebhook({ universite_id: AUTRE_UNIV_ID, nom: 'Renommé' }));

      await expect(
        service.modifier(WEBHOOK_ID, { nom: 'Renommé' }, SUPER_ADMIN_ID),
      ).resolves.toBeDefined();
    });

    it('super-admin peut supprimer un webhook d\'une autre université', async () => {
      asSuperAdmin();
      prisma.webhooks.findFirst.mockResolvedValue(makeWebhook({ universite_id: AUTRE_UNIV_ID }));

      await expect(service.supprimer(WEBHOOK_ID, SUPER_ADMIN_ID)).resolves.toBeUndefined();
      expect(prisma.webhooks.delete).toHaveBeenCalledWith({ where: { id: WEBHOOK_ID } });
    });

    it('super-admin peut lister les livraisons d\'un webhook d\'une autre université', async () => {
      asSuperAdmin();
      prisma.webhooks.findFirst.mockResolvedValue(makeWebhook({ universite_id: AUTRE_UNIV_ID }));
      prisma.webhook_livraisons.findMany.mockResolvedValue([]);

      await expect(service.listerLivraisons(WEBHOOK_ID, SUPER_ADMIN_ID)).resolves.toEqual([]);
    });

    it('super-admin peut tester un webhook d\'une autre université', async () => {
      asSuperAdmin();
      prisma.webhooks.findFirst.mockResolvedValue(makeWebhook({ universite_id: AUTRE_UNIV_ID }));
      prisma.webhook_livraisons.create.mockResolvedValue({});
      prisma.webhooks.update.mockResolvedValue({});

      const result = await service.tester(WEBHOOK_ID, SUPER_ADMIN_ID);

      expect(result.succes).toBe(true);
    });

    it('acteur normal ne peut pas agir sur un webhook d\'une autre université', async () => {
      asActeurDeUniv();
      prisma.webhooks.findFirst.mockResolvedValue(makeWebhook({ universite_id: AUTRE_UNIV_ID }));

      await expect(service.supprimer(WEBHOOK_ID, ACTEUR_ID)).rejects.toThrow(ForbiddenException);
    });

    it('un utilisateur sans université ET sans rôle super_admin est refusé, pas bypassé (pas de fail-open)', async () => {
      asUtilisateurOrphelin();

      await expect(service.lister('orphelin')).rejects.toThrow(ForbiddenException);
      expect(prisma.webhooks.findMany).not.toHaveBeenCalled();
    });
  });
});
