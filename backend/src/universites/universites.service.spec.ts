import { ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { statut_universite, type_universite } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { UniversitesService } from './universites.service';

const ACTEUR_ID = 'user-uuid-1';
const UNIV_ID = 'univ-uuid-1';

const makeUniversite = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: UNIV_ID,
  nom: 'IUT Douala',
  nom_court: 'IUT-DLA',
  pays: 'Cameroun',
  ville: 'Douala',
  adresse: null,
  type: type_universite.privee,
  logo_url: null,
  site_web: null,
  email_contact: null,
  telephone: null,
  description: null,
  statut: statut_universite.en_attente,
  approuvee_par: null,
  approuvee_le: null,
  raison_rejet: null,
  config: {},
  metadata: {},
  deleted_at: null,
  created_by: ACTEUR_ID,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

describe('UniversitesService', () => {
  let service: UniversitesService;
  let prisma: { universites: jest.Mocked<any>; $transaction: jest.Mock };
  let audit: { log: jest.Mock };

  beforeEach(async () => {
    prisma = {
      universites: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UniversitesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(UniversitesService);
  });

  describe('lister', () => {
    it('retourne une page vide si aucune université', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);
      const result = await service.lister({ page: 1, limit: 20 });
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('applique le filtre statut dans le where', async () => {
      prisma.universites.findMany.mockResolvedValue([makeUniversite()]);
      prisma.universites.count.mockResolvedValue(1);
      prisma.$transaction.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops));

      await service.lister({ statut: statut_universite.en_attente });

      expect(prisma.universites.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ statut: statut_universite.en_attente }) }),
      );
    });
  });

  describe('creer', () => {
    it('crée avec statut en_attente et created_by', async () => {
      const univ = makeUniversite();
      prisma.universites.create.mockResolvedValue(univ);

      const result = await service.creer(
        { nom: 'IUT Douala', type: type_universite.privee },
        ACTEUR_ID,
      );

      expect(prisma.universites.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            statut: statut_universite.en_attente,
            created_by: ACTEUR_ID,
          }),
        }),
      );
      expect(result.id).toBe(UNIV_ID);
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'UNIVERSITE_CREEE' }));
    });
  });

  describe('approuver', () => {
    it('passe en_attente → approuvee', async () => {
      const univ = makeUniversite({ statut: statut_universite.en_attente });
      prisma.universites.findFirst.mockResolvedValue(univ);
      prisma.universites.update.mockResolvedValue({ ...univ, statut: statut_universite.approuvee });

      const result = await service.approuver(UNIV_ID, ACTEUR_ID);

      expect(prisma.universites.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            statut: statut_universite.approuvee,
            approuvee_par: ACTEUR_ID,
          }),
        }),
      );
      expect(result.statut).toBe(statut_universite.approuvee);
    });

    it('lève ConflictException si déjà active', async () => {
      prisma.universites.findFirst.mockResolvedValue(makeUniversite({ statut: statut_universite.active }));
      await expect(service.approuver(UNIV_ID, ACTEUR_ID)).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('rejeter', () => {
    it('lève BadRequestException si raison_rejet absente', async () => {
      prisma.universites.findFirst.mockResolvedValue(makeUniversite({ statut: statut_universite.en_attente }));
      await expect(service.rejeter(UNIV_ID, {}, ACTEUR_ID)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('passe en_attente → rejetee avec la raison', async () => {
      const univ = makeUniversite({ statut: statut_universite.en_attente });
      prisma.universites.findFirst.mockResolvedValue(univ);
      prisma.universites.update.mockResolvedValue({ ...univ, statut: statut_universite.rejetee });

      await service.rejeter(UNIV_ID, { raison_rejet: 'Documents incomplets pour le dossier.' }, ACTEUR_ID);

      expect(prisma.universites.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ statut: statut_universite.rejetee }),
        }),
      );
    });
  });

  describe('supprimer', () => {
    it('applique un soft delete (deleted_at)', async () => {
      prisma.universites.findFirst.mockResolvedValue(makeUniversite({ statut: statut_universite.en_attente }));
      prisma.universites.update.mockResolvedValue({});

      await service.supprimer(UNIV_ID, ACTEUR_ID);

      expect(prisma.universites.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ deleted_at: expect.any(Date) }) }),
      );
    });

    it('lève ConflictException pour une université active', async () => {
      prisma.universites.findFirst.mockResolvedValue(makeUniversite({ statut: statut_universite.active }));
      await expect(service.supprimer(UNIV_ID, ACTEUR_ID)).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('findOne', () => {
    it('lève NotFoundException si deleted_at est renseigné', async () => {
      prisma.universites.findFirst.mockResolvedValue(null);
      await expect(service.findOne(UNIV_ID)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
