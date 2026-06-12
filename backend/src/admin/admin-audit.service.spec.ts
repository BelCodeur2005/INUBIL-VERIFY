import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AdminAuditService } from './admin-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const ACTEUR_ID = 'usr-0000-0000-0000-000000000001';
const CIBLE_ID  = 'usr-0000-0000-0000-000000000002';

const makeUser = (overrides = {}) => ({
  id:                   CIBLE_ID,
  nom:                  'KAMGA',
  prenom:               'Bertrand',
  email:                'bertrand@istama.cm',
  statut:               'actif',
  derniere_connexion:   null,
  created_at:           new Date('2026-01-01'),
  roles_utilisateurs_role_idToroles:                   { id: 'role-1', nom: 'Secretaire' },
  universites_utilisateurs_universite_idTouniversites: { id: 'univ-1', nom: 'ISTAMA INUBIL' },
  ...overrides,
});

const makeAuditEntry = (overrides = {}) => ({
  id:                'aud-0000-0000-0000-000000000001',
  utilisateur_id:    ACTEUR_ID,
  nom_utilisateur:   'admin@istama.cm',
  action:            'ADMIN_PATCH_ADMIN_UTILISATEURS__ID__ACTIVER',
  module:            'admin',
  table_concernee:   'utilisateurs',
  enregistrement_id: CIBLE_ID,
  ip_address:        '127.0.0.1',
  user_agent:        'jest-test',
  created_at:        new Date('2026-06-01'),
  ...overrides,
});

const makePrisma = () => ({
  journal_audit: {
    findMany: jest.fn(),
    count:    jest.fn(),
  },
  utilisateurs: {
    findFirst: jest.fn(),
    update:    jest.fn(),
  },
});

const makeAudit = () => ({
  log: jest.fn().mockResolvedValue(undefined),
});

describe('AdminAuditService', () => {
  let service: AdminAuditService;
  let prisma: ReturnType<typeof makePrisma>;
  let audit: ReturnType<typeof makeAudit>;

  beforeEach(async () => {
    prisma = makePrisma();
    audit  = makeAudit();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAuditService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService,  useValue: audit  },
      ],
    }).compile();

    service = module.get(AdminAuditService);
  });

  // ── lireJournal ───────────────────────────────────────────────────────────

  describe('lireJournal', () => {
    it('retourne le journal paginé', async () => {
      prisma.journal_audit.findMany.mockResolvedValue([makeAuditEntry()]);
      prisma.journal_audit.count.mockResolvedValue(1);

      const result = await service.lireJournal({ page: 1, limit: 50 });

      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].action).toContain('ADMIN');
    });

    it('filtre par utilisateur_id', async () => {
      prisma.journal_audit.findMany.mockResolvedValue([]);
      prisma.journal_audit.count.mockResolvedValue(0);

      await service.lireJournal({ utilisateur_id: ACTEUR_ID });

      expect(prisma.journal_audit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ utilisateur_id: ACTEUR_ID }),
        }),
      );
    });

    it('filtre par plage de dates', async () => {
      prisma.journal_audit.findMany.mockResolvedValue([]);
      prisma.journal_audit.count.mockResolvedValue(0);

      await service.lireJournal({
        date_debut: '2026-06-01',
        date_fin:   '2026-06-30',
      });

      expect(prisma.journal_audit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            created_at: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it('filtre par action (insensitive)', async () => {
      prisma.journal_audit.findMany.mockResolvedValue([]);
      prisma.journal_audit.count.mockResolvedValue(0);

      await service.lireJournal({ action: 'ADMIN' });

      expect(prisma.journal_audit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: { contains: 'ADMIN', mode: 'insensitive' },
          }),
        }),
      );
    });
  });

  // ── activerUtilisateur ────────────────────────────────────────────────────

  describe('activerUtilisateur', () => {
    it('passe le statut à "actif" et logue dans l\'audit', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValue(makeUser({ statut: 'suspendu' }));
      prisma.utilisateurs.update.mockResolvedValue(makeUser({ statut: 'actif' }));

      const result = await service.activerUtilisateur(CIBLE_ID, ACTEUR_ID, '1.2.3.4');

      expect(result.statut).toBe('actif');
      expect(prisma.utilisateurs.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { statut: 'actif' } }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ADMIN_UTILISATEUR_ACTIVE' }),
      );
    });

    it('lève ForbiddenException si acteur == cible', async () => {
      await expect(service.activerUtilisateur(ACTEUR_ID, ACTEUR_ID))
        .rejects.toThrow(ForbiddenException);
    });

    it('lève NotFoundException si utilisateur introuvable', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValue(null);
      await expect(service.activerUtilisateur(CIBLE_ID, ACTEUR_ID))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ── desactiverUtilisateur ─────────────────────────────────────────────────

  describe('desactiverUtilisateur', () => {
    it('passe le statut à "suspendu" et logue dans l\'audit', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValue(makeUser({ statut: 'actif' }));
      prisma.utilisateurs.update.mockResolvedValue(makeUser({ statut: 'suspendu' }));

      const result = await service.desactiverUtilisateur(CIBLE_ID, ACTEUR_ID, '1.2.3.4');

      expect(result.statut).toBe('suspendu');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ADMIN_UTILISATEUR_DESACTIVE' }),
      );
    });

    it('lève ForbiddenException si acteur == cible', async () => {
      await expect(service.desactiverUtilisateur(ACTEUR_ID, ACTEUR_ID))
        .rejects.toThrow(ForbiddenException);
    });
  });
});
