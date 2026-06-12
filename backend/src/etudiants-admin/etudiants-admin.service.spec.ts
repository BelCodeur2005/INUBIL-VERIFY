import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EtudiantsAdminService } from './etudiants-admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const ADMIN_ID = 'admin-000-000-000-000000000001';
const UNIV_ID = 'univ-000-000-000-000000000001';
const AUTRE_UNIV_ID = 'univ-000-000-000-000000000002';
const ETU_ID = 'etu-0000-0000-0000-000000000001';
const MATRICULE = 'ISTAMA-2023-0001';

const makeEtudiant = (overrides: Record<string, unknown> = {}) => ({
  id: ETU_ID,
  numero_etudiant: MATRICULE,
  nom: 'KAMGA',
  prenom: 'Bertrand',
  email: 'bertrand.kamga@istama.cm',
  telephone: null,
  date_naissance: new Date('2001-03-15'),
  lieu_naissance: 'Douala',
  nationalite: 'Camerounaise',
  photo_url: null,
  annee_entree: 2023,
  universite_id: UNIV_ID,
  universites: { nom: 'ISTAMA INUBIL', nom_court: 'ISTAMA' },
  _count: { documents: 0 },
  deleted_at: null,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

const makePrisma = () => ({
  utilisateurs: {
    findFirst: jest.fn().mockResolvedValue({ universite_id: UNIV_ID }),
  },
  universites: {
    findFirst: jest.fn().mockResolvedValue({ id: UNIV_ID, statut: 'active', deleted_at: null }),
  },
  etudiants: {
    count: jest.fn().mockResolvedValue(1),
    findMany: jest.fn().mockResolvedValue([makeEtudiant()]),
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue(makeEtudiant()),
    update: jest.fn().mockResolvedValue(makeEtudiant()),
  },
});

const makeAudit = () => ({ log: jest.fn() });

describe('EtudiantsAdminService', () => {
  let service: EtudiantsAdminService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(async () => {
    prisma = makePrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EtudiantsAdminService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: makeAudit() },
      ],
    }).compile();
    service = module.get(EtudiantsAdminService);
  });

  // ─── lister ────────────────────────────────────────────────────────────────

  describe('lister', () => {
    it('scopes par universite quand acteur est lie a une universite', async () => {
      const result = await service.lister({}, ADMIN_ID);
      expect(prisma.etudiants.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ universite_id: UNIV_ID }),
        }),
      );
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('super-admin voit tous sans filtre par defaut', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValueOnce({ universite_id: null });
      await service.lister({}, ADMIN_ID);
      const where = prisma.etudiants.findMany.mock.calls[0][0].where;
      expect(where.universite_id).toBeUndefined();
    });

    it('super-admin peut filtrer par universite_id explicite', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValueOnce({ universite_id: null });
      await service.lister({ universite_id: AUTRE_UNIV_ID }, ADMIN_ID);
      const where = prisma.etudiants.findMany.mock.calls[0][0].where;
      expect(where.universite_id).toBe(AUTRE_UNIV_ID);
    });

    it('applique la pagination correctement', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValueOnce({ universite_id: null });
      await service.lister({ page: 3, limit: 10 }, ADMIN_ID);
      expect(prisma.etudiants.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });
  });

  // ─── findOne ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('retourne un etudiant de la meme universite', async () => {
      prisma.etudiants.findFirst.mockResolvedValueOnce(makeEtudiant());
      const result = await service.findOne(ETU_ID, ADMIN_ID);
      expect(result.id).toBe(ETU_ID);
    });

    it('leve NotFoundException si etudiant inexistant', async () => {
      prisma.etudiants.findFirst.mockResolvedValueOnce(null);
      await expect(service.findOne(ETU_ID, ADMIN_ID)).rejects.toThrow(NotFoundException);
    });

    it('leve ForbiddenException si etudiant appartient a une autre universite', async () => {
      prisma.etudiants.findFirst.mockResolvedValueOnce(makeEtudiant({ universite_id: AUTRE_UNIV_ID }));
      await expect(service.findOne(ETU_ID, ADMIN_ID)).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── creer ─────────────────────────────────────────────────────────────────

  describe('creer', () => {
    const dto = { numero_etudiant: MATRICULE, nom: 'KAMGA', prenom: 'Bertrand', universite_id: UNIV_ID };

    it('cree un etudiant et retourne le DTO', async () => {
      const result = await service.creer(dto as any, ADMIN_ID);
      expect(prisma.etudiants.create).toHaveBeenCalled();
      expect(result.numero_etudiant).toBe(MATRICULE);
    });

    it('leve ConflictException si matricule deja utilise', async () => {
      prisma.etudiants.findFirst.mockResolvedValueOnce(makeEtudiant());
      await expect(service.creer(dto as any, ADMIN_ID)).rejects.toThrow(ConflictException);
    });

    it('leve ForbiddenException si acteur tente de creer pour une autre universite', async () => {
      const dtoAutreUniv = { ...dto, universite_id: AUTRE_UNIV_ID };
      await expect(service.creer(dtoAutreUniv as any, ADMIN_ID)).rejects.toThrow(ForbiddenException);
    });

    it('leve NotFoundException si universite inexistante ou inactive', async () => {
      prisma.universites.findFirst.mockResolvedValueOnce(null);
      await expect(service.creer(dto as any, ADMIN_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── modifier ──────────────────────────────────────────────────────────────

  describe('modifier', () => {
    it('met a jour les champs et retourne le DTO', async () => {
      prisma.etudiants.findFirst.mockResolvedValueOnce(makeEtudiant());
      const result = await service.modifier(ETU_ID, { nom: 'KAMGA II' } as any, ADMIN_ID);
      expect(prisma.etudiants.update).toHaveBeenCalled();
      expect(result.id).toBe(ETU_ID);
    });

    it('leve NotFoundException si etudiant inexistant', async () => {
      prisma.etudiants.findFirst.mockResolvedValueOnce(null);
      await expect(service.modifier(ETU_ID, {} as any, ADMIN_ID)).rejects.toThrow(NotFoundException);
    });

    it('leve ConflictException si nouveau matricule deja pris', async () => {
      prisma.etudiants.findFirst
        .mockResolvedValueOnce(makeEtudiant())
        .mockResolvedValueOnce(makeEtudiant({ id: 'autre-id', numero_etudiant: 'NOUVEAU' }));
      await expect(
        service.modifier(ETU_ID, { numero_etudiant: 'NOUVEAU' } as any, ADMIN_ID),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── supprimer ─────────────────────────────────────────────────────────────

  describe('supprimer', () => {
    it('soft-delete quand aucun document', async () => {
      prisma.etudiants.findFirst.mockResolvedValueOnce(makeEtudiant({ _count: { documents: 0 } }));
      await service.supprimer(ETU_ID, ADMIN_ID);
      expect(prisma.etudiants.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ deleted_at: expect.any(Date) }) }),
      );
    });

    it('leve ConflictException si etudiant possede des documents', async () => {
      prisma.etudiants.findFirst.mockResolvedValueOnce(makeEtudiant({ _count: { documents: 3 } }));
      await expect(service.supprimer(ETU_ID, ADMIN_ID)).rejects.toThrow(ConflictException);
    });

    it('leve NotFoundException si etudiant inexistant', async () => {
      prisma.etudiants.findFirst.mockResolvedValueOnce(null);
      await expect(service.supprimer(ETU_ID, ADMIN_ID)).rejects.toThrow(NotFoundException);
    });
  });
});
