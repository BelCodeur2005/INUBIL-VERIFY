import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { VerificationsService } from './verifications.service';

const USER_ID = 'user-uuid-1';
const ETU_ID = 'etu-uuid-1';
const DOC_ID = 'doc-uuid-1';
const AUTRE_DOC_ID = 'doc-uuid-2';

const makeVerif = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'verif-uuid-1',
  type_verification: 'qr_code',
  resultat: 'authentique',
  document_id: DOC_ID,
  partage_id: null,
  hash_soumis: null,
  ip_address: null,
  user_agent: null,
  pays: 'CM',
  ville: 'Douala',
  organisation: null,
  utilisateur_id: USER_ID,
  rapport_genere: false,
  rapport_pdf_url: null,
  created_at: new Date('2026-06-01T10:00:00Z'),
  ...overrides,
});

describe('VerificationsService', () => {
  let service: VerificationsService;
  let prisma: {
    verifications: jest.Mocked<any>;
    etudiants: jest.Mocked<any>;
    documents: jest.Mocked<any>;
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      verifications: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      etudiants: { findFirst: jest.fn() },
      documents: { findFirst: jest.fn() },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerificationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(VerificationsService);
  });

  // ─── mesVerifications ────────────────────────────────────────────────────────

  describe('mesVerifications', () => {
    it('retourne les vérifications filtrées par utilisateur_id', async () => {
      prisma.$transaction.mockResolvedValue([[makeVerif()], 1]);

      const result = await service.mesVerifications(USER_ID, {});

      expect(prisma.verifications.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ utilisateur_id: USER_ID }),
          orderBy: { created_at: 'desc' },
        }),
      );
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('retourne une page vide si aucune vérification', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      const result = await service.mesVerifications(USER_ID, {});

      expect(result.data).toHaveLength(0);
      expect(result.totalPages).toBe(0);
    });

    it('applique le filtre resultat', async () => {
      prisma.verifications.findMany.mockResolvedValue([makeVerif()]);
      prisma.verifications.count.mockResolvedValue(1);
      prisma.$transaction.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops));

      await service.mesVerifications(USER_ID, { resultat: 'authentique' });

      expect(prisma.verifications.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ resultat: 'authentique' }),
        }),
      );
    });

    it('applique les filtres date_debut et date_fin', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      await service.mesVerifications(USER_ID, {
        date_debut: '2026-01-01T00:00:00.000Z',
        date_fin: '2026-12-31T23:59:59.000Z',
      });

      expect(prisma.verifications.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            created_at: {
              gte: new Date('2026-01-01T00:00:00.000Z'),
              lte: new Date('2026-12-31T23:59:59.000Z'),
            },
          }),
        }),
      );
    });
  });

  // ─── mesDiplomes ─────────────────────────────────────────────────────────────

  describe('mesDiplomes', () => {
    it('retourne les vérifications pour les documents de l\'étudiant', async () => {
      prisma.etudiants.findFirst.mockResolvedValue({ id: ETU_ID });
      prisma.$transaction.mockResolvedValue([[makeVerif()], 1]);

      const result = await service.mesDiplomes(USER_ID, {});

      expect(prisma.verifications.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            document_id: { not: null },
            documents: { etudiant_id: ETU_ID },
          }),
        }),
      );
      expect(result.data).toHaveLength(1);
    });

    it('retourne une liste vide si aucun espace étudiant associé au compte', async () => {
      prisma.etudiants.findFirst.mockResolvedValue(null);

      const result = await service.mesDiplomes(USER_ID, {});

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('filtre sur document_id si appartient à l\'étudiant', async () => {
      prisma.etudiants.findFirst.mockResolvedValue({ id: ETU_ID });
      prisma.documents.findFirst.mockResolvedValue({ id: DOC_ID, etudiant_id: ETU_ID });
      prisma.$transaction.mockResolvedValue([[makeVerif()], 1]);

      await service.mesDiplomes(USER_ID, { document_id: DOC_ID });

      expect(prisma.verifications.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ document_id: DOC_ID }),
        }),
      );
    });

    it('lève ForbiddenException si document_id n\'appartient pas à l\'étudiant', async () => {
      prisma.etudiants.findFirst.mockResolvedValue({ id: ETU_ID });
      prisma.documents.findFirst.mockResolvedValue(null); // document introuvable pour cet étudiant

      await expect(
        service.mesDiplomes(USER_ID, { document_id: AUTRE_DOC_ID }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  // ─── toutesVerifications (admin) ─────────────────────────────────────────────

  describe('toutesVerifications', () => {
    it('retourne toutes les vérifications sans filtre de scope', async () => {
      prisma.$transaction.mockResolvedValue([[makeVerif(), makeVerif({ id: 'verif-2' })], 2]);

      const result = await service.toutesVerifications({});

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('inclut les champs sensibles (ip_address, utilisateur_id) dans la réponse admin', async () => {
      prisma.$transaction.mockResolvedValue([
        [makeVerif({ ip_address: '192.168.1.1', utilisateur_id: USER_ID })],
        1,
      ]);

      const result = await service.toutesVerifications({});

      expect(result.data[0]).toHaveProperty('ip_address', '192.168.1.1');
      expect(result.data[0]).toHaveProperty('utilisateur_id', USER_ID);
    });

    it('applique le filtre utilisateur_id', async () => {
      prisma.verifications.findMany.mockResolvedValue([makeVerif()]);
      prisma.verifications.count.mockResolvedValue(1);
      prisma.$transaction.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops));

      await service.toutesVerifications({ utilisateur_id: USER_ID });

      expect(prisma.verifications.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ utilisateur_id: USER_ID }),
        }),
      );
    });

    it('applique le filtre type_verification', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      await service.toutesVerifications({ type_verification: 'qr_code' });

      expect(prisma.verifications.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type_verification: 'qr_code' }),
        }),
      );
    });

    it('calcule totalPages correctement', async () => {
      prisma.$transaction.mockResolvedValue([Array(20).fill(makeVerif()), 45]);

      const result = await service.toutesVerifications({ limit: 20 });

      expect(result.totalPages).toBe(3);
    });
  });
});
