import { Test, TestingModule } from '@nestjs/testing';
import { AdminStatsService } from './admin-stats.service';
import { PrismaService } from '../prisma/prisma.service';

const makePrisma = () => ({
  universites:       { count: jest.fn() },
  documents:         { count: jest.fn() },
  verifications:     { count: jest.fn(), $queryRawUnsafe: jest.fn() },
  etudiants:         { count: jest.fn() },
  utilisateurs:      { count: jest.fn() },
  partages_document: { count: jest.fn() },
  $queryRawUnsafe:   jest.fn(),
});

describe('AdminStatsService', () => {
  let service: AdminStatsService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(async () => {
    prisma = makePrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminStatsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(AdminStatsService);
  });

  // ── statistiquesGlobales ──────────────────────────────────────────────────

  describe('statistiquesGlobales', () => {
    it('retourne tous les compteurs', async () => {
      prisma.universites.count
        .mockResolvedValueOnce(5)   // actives
        .mockResolvedValueOnce(7);  // total
      prisma.documents.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(80)  // actifs
        .mockResolvedValueOnce(10)  // en_validation
        .mockResolvedValueOnce(10); // revoques
      prisma.verifications.count
        .mockResolvedValueOnce(500) // total
        .mockResolvedValueOnce(42); // ce_mois
      prisma.etudiants.count.mockResolvedValue(200);
      prisma.utilisateurs.count.mockResolvedValue(15);
      prisma.partages_document.count.mockResolvedValue(30);

      const result = await service.statistiquesGlobales();

      expect(result.universites.actives).toBe(5);
      expect(result.universites.total).toBe(7);
      expect(result.documents.total).toBe(100);
      expect(result.documents.actifs).toBe(80);
      expect(result.documents.en_validation).toBe(10);
      expect(result.documents.revoques).toBe(10);
      expect(result.verifications.total).toBe(500);
      expect(result.verifications.ce_mois).toBe(42);
      expect(result.etudiants).toBe(200);
      expect(result.utilisateurs).toBe(15);
      expect(result.partages.actifs).toBe(30);
    });

    it('retourne des zéros si la base est vide', async () => {
      prisma.universites.count.mockResolvedValue(0);
      prisma.documents.count.mockResolvedValue(0);
      prisma.verifications.count.mockResolvedValue(0);
      prisma.etudiants.count.mockResolvedValue(0);
      prisma.utilisateurs.count.mockResolvedValue(0);
      prisma.partages_document.count.mockResolvedValue(0);

      const result = await service.statistiquesGlobales();

      expect(result.documents.total).toBe(0);
      expect(result.verifications.total).toBe(0);
    });
  });

  // ── graphe ────────────────────────────────────────────────────────────────

  describe('graphe', () => {
    const verifsRows = [
      { date: new Date('2026-06-01T00:00:00Z'), nb: BigInt(10) },
      { date: new Date('2026-06-02T00:00:00Z'), nb: BigInt(5) },
    ];
    const docsRows = [
      { date: new Date('2026-06-01T00:00:00Z'), nb: BigInt(3) },
    ];

    it('fusionne les séries vérifications et documents par date', async () => {
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce(verifsRows)
        .mockResolvedValueOnce(docsRows);

      const result = await service.graphe({
        granularite: 'jour',
        debut: '2026-06-01',
        fin:   '2026-06-30',
      });

      expect(result).toHaveLength(2);
      const juin1 = result.find((p) => p.date === '2026-06-01');
      expect(juin1?.verifications).toBe(10);
      expect(juin1?.documents_emis).toBe(3);

      const juin2 = result.find((p) => p.date === '2026-06-02');
      expect(juin2?.verifications).toBe(5);
      expect(juin2?.documents_emis).toBe(0);
    });

    it('utilise granularite "mois" → format YYYY-MM', async () => {
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([{ date: new Date('2026-06-01T00:00:00Z'), nb: BigInt(20) }])
        .mockResolvedValueOnce([]);

      const result = await service.graphe({ granularite: 'mois' });

      expect(result[0].date).toMatch(/^\d{4}-\d{2}$/);
    });

    it('retourne un tableau vide si aucune donnée', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([]);

      const result = await service.graphe({});

      expect(result).toEqual([]);
    });

    it('trie par date croissante', async () => {
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([
          { date: new Date('2026-06-03T00:00:00Z'), nb: BigInt(1) },
          { date: new Date('2026-06-01T00:00:00Z'), nb: BigInt(2) },
        ])
        .mockResolvedValueOnce([]);

      const result = await service.graphe({ granularite: 'jour' });

      expect(result[0].date).toBe('2026-06-01');
      expect(result[1].date).toBe('2026-06-03');
    });
  });
});
