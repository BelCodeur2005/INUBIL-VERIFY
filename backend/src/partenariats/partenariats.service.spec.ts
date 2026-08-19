import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PartenariatsService } from './partenariats.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const ACTEUR_ID = 'usr-0000-0000-0000-000000000001';
const SUPER_ADMIN_ID = 'usr-0000-0000-0000-000000000099';
const UNIV_ID = 'univ-0000-0000-0000-000000000001';
const AUTRE_UNIV_ID = 'univ-0000-0000-0000-000000000002';
const LIEE_ID = 'univ-0000-0000-0000-000000000003';
const PARTENARIAT_ID = 'par-0000-0000-0000-000000000001';

const makePartenariat = (overrides: any = {}) => ({
  id: PARTENARIAT_ID,
  universite_id: UNIV_ID,
  universite_liee_id: LIEE_ID,
  type_partenariat: 'echange_diplomes',
  date_debut: null,
  date_fin: null,
  description: null,
  document_url: null,
  statut: 'actif',
  created_at: new Date('2026-01-01'),
  ...overrides,
});

const makePrisma = () => ({
  utilisateurs: { findFirst: jest.fn() },
  universites: { findFirst: jest.fn().mockResolvedValue({ id: LIEE_ID }) },
  partenariats_universite: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
});

describe('PartenariatsService', () => {
  let service: PartenariatsService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(async () => {
    prisma = makePrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartenariatsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: { log: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    service = module.get(PartenariatsService);
  });

  const asActeurDeUniv = () =>
    prisma.utilisateurs.findFirst.mockResolvedValue({ universite_id: UNIV_ID });
  const asSuperAdmin = () =>
    prisma.utilisateurs.findFirst.mockResolvedValue({ universite_id: null });

  describe('lister', () => {
    it('filtre par universite pour un acteur normal', async () => {
      asActeurDeUniv();
      prisma.partenariats_universite.findMany.mockResolvedValue([]);

      await service.lister(ACTEUR_ID);

      expect(prisma.partenariats_universite.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { universite_id: UNIV_ID } }),
      );
    });

    it('super-admin voit tous les partenariats, sans filtre', async () => {
      asSuperAdmin();
      prisma.partenariats_universite.findMany.mockResolvedValue([]);

      await service.lister(SUPER_ADMIN_ID);

      expect(prisma.partenariats_universite.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined }),
      );
    });
  });

  describe('findOne', () => {
    it('lève ForbiddenException si le partenariat appartient à une autre université', async () => {
      asActeurDeUniv();
      prisma.partenariats_universite.findFirst.mockResolvedValue(
        makePartenariat({ universite_id: AUTRE_UNIV_ID }),
      );

      await expect(service.findOne(PARTENARIAT_ID, ACTEUR_ID)).rejects.toThrow(ForbiddenException);
    });

    it('lève NotFoundException si le partenariat n\'existe pas', async () => {
      asActeurDeUniv();
      prisma.partenariats_universite.findFirst.mockResolvedValue(null);

      await expect(service.findOne(PARTENARIAT_ID, ACTEUR_ID)).rejects.toThrow(NotFoundException);
    });

    it('super-admin peut consulter un partenariat de n\'importe quelle université', async () => {
      asSuperAdmin();
      prisma.partenariats_universite.findFirst.mockResolvedValue(
        makePartenariat({ universite_id: AUTRE_UNIV_ID }),
      );

      await expect(service.findOne(PARTENARIAT_ID, SUPER_ADMIN_ID)).resolves.toBeDefined();
    });
  });

  describe('creer', () => {
    it('rattache le partenariat à l\'université de l\'acteur normal', async () => {
      asActeurDeUniv();
      prisma.partenariats_universite.findFirst.mockResolvedValue(null); // pas de doublon
      prisma.partenariats_universite.create.mockResolvedValue(makePartenariat());

      await service.creer({ universite_liee_id: LIEE_ID, type_partenariat: 'echange_diplomes' }, ACTEUR_ID);

      expect(prisma.partenariats_universite.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ universite_id: UNIV_ID }) }),
      );
    });

    it('lève ForbiddenException pour un super-admin (aucune université à laquelle rattacher la ressource)', async () => {
      asSuperAdmin();

      await expect(
        service.creer({ universite_liee_id: LIEE_ID, type_partenariat: 'echange_diplomes' }, SUPER_ADMIN_ID),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.partenariats_universite.create).not.toHaveBeenCalled();
    });
  });

  describe('modifier / supprimer', () => {
    it('super-admin peut modifier un partenariat d\'une autre université', async () => {
      asSuperAdmin();
      prisma.partenariats_universite.findFirst.mockResolvedValue(
        makePartenariat({ universite_id: AUTRE_UNIV_ID }),
      );
      prisma.partenariats_universite.update.mockResolvedValue(
        makePartenariat({ universite_id: AUTRE_UNIV_ID, statut: 'suspendu' }),
      );

      await expect(
        service.modifier(PARTENARIAT_ID, { statut: 'suspendu' } as any, SUPER_ADMIN_ID),
      ).resolves.toBeDefined();
    });

    it('super-admin peut supprimer un partenariat d\'une autre université', async () => {
      asSuperAdmin();
      prisma.partenariats_universite.findFirst.mockResolvedValue(
        makePartenariat({ universite_id: AUTRE_UNIV_ID }),
      );

      await expect(service.supprimer(PARTENARIAT_ID, SUPER_ADMIN_ID)).resolves.toBeUndefined();
      expect(prisma.partenariats_universite.delete).toHaveBeenCalledWith({ where: { id: PARTENARIAT_ID } });
    });

    it('acteur normal ne peut pas supprimer un partenariat d\'une autre université', async () => {
      asActeurDeUniv();
      prisma.partenariats_universite.findFirst.mockResolvedValue(
        makePartenariat({ universite_id: AUTRE_UNIV_ID }),
      );

      await expect(service.supprimer(PARTENARIAT_ID, ACTEUR_ID)).rejects.toThrow(ForbiddenException);
    });
  });
});
