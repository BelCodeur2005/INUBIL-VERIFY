import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { FilieresService } from './filieres.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const ADMIN_ID = 'admin-000-000-000-000000000001';
const UNIV_ID = 'univ-000-000-000-000000000001';
const AUTRE_UNIV_ID = 'univ-000-000-000-000000000002';
const FILIERE_ID = 'fili-000-000-000-000000000001';

const makeFiliere = (overrides = {}) => ({
  id: FILIERE_ID,
  code: 'GLSI',
  nom: "Génie Logiciel et Systèmes d'Information",
  universite_id: UNIV_ID,
  est_actif: true,
  ordre: 1,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

const makePrisma = () => ({
  utilisateurs: {
    findFirst: jest.fn().mockResolvedValue({ universite_id: UNIV_ID }),
  },
  universites: {
    findFirst: jest.fn().mockResolvedValue({ id: UNIV_ID, statut: 'active' }),
  },
  filieres: {
    findMany: jest.fn().mockResolvedValue([makeFiliere()]),
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue(makeFiliere()),
    update: jest.fn().mockResolvedValue(makeFiliere()),
    delete: jest.fn().mockResolvedValue(makeFiliere()),
  },
  documents: {
    count: jest.fn().mockResolvedValue(0),
  },
});

const makeAudit = () => ({ log: jest.fn() });

describe('FilieresService', () => {
  let service: FilieresService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(async () => {
    prisma = makePrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilieresService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: makeAudit() },
      ],
    }).compile();
    service = module.get(FilieresService);
  });

  describe('lister', () => {
    it('scopes par universite quand acteur est lie a une universite', async () => {
      const result = await service.lister({}, ADMIN_ID);
      expect(prisma.filieres.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ universite_id: UNIV_ID }),
        }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('GLSI');
    });

    it('un utilisateur sans université ET sans rôle super_admin est refusé, pas bypassé (pas de fail-open)', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValueOnce({
        universite_id: null,
        roles_utilisateurs_role_idToroles: { nom: 'agent_saisie' },
      });

      await expect(service.lister({}, ADMIN_ID)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.filieres.findMany).not.toHaveBeenCalled();
    });

    it('super-admin voit toutes les filieres sans filtre par defaut', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValueOnce({
        universite_id: null,
        roles_utilisateurs_role_idToroles: { nom: 'super_admin' },
      });
      await service.lister({}, ADMIN_ID);
      const where = prisma.filieres.findMany.mock.calls[0][0].where;
      expect(where.universite_id).toBeUndefined();
    });
  });

  describe('creer', () => {
    it('cree une filiere et la retourne', async () => {
      prisma.filieres.findFirst.mockResolvedValueOnce(null);
      const dto = {
        code: 'GLSI',
        nom: "Génie Logiciel et Systèmes d'Information",
        universite_id: UNIV_ID,
      };
      const result = await service.creer(dto as any, ADMIN_ID);
      expect(prisma.filieres.create).toHaveBeenCalled();
      expect(result.id).toBe(FILIERE_ID);
    });

    it('leve ConflictException si le code existe deja', async () => {
      prisma.filieres.findFirst.mockResolvedValueOnce(makeFiliere());
      const dto = { code: 'GLSI', nom: 'Doublon', universite_id: UNIV_ID };
      await expect(service.creer(dto as any, ADMIN_ID)).rejects.toThrow(
        ConflictException,
      );
    });

    it('leve ForbiddenException si acteur tente de creer pour une autre universite', async () => {
      const dto = {
        code: 'RT',
        nom: 'Réseaux et Télécommunications',
        universite_id: AUTRE_UNIV_ID,
      };
      await expect(service.creer(dto as any, ADMIN_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('leve NotFoundException si universite inactive', async () => {
      prisma.universites.findFirst.mockResolvedValueOnce(null);
      const dto = { code: 'RT', nom: 'Réseaux et Télécommunications', universite_id: UNIV_ID };
      await expect(service.creer(dto as any, ADMIN_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('supprimer', () => {
    it('supprime physiquement si aucun document ne l utilise', async () => {
      prisma.filieres.findFirst.mockResolvedValueOnce(makeFiliere());
      prisma.documents.count.mockResolvedValueOnce(0);
      await service.supprimer(FILIERE_ID, ADMIN_ID);
      expect(prisma.filieres.delete).toHaveBeenCalledWith({
        where: { id: FILIERE_ID },
      });
    });

    it('desactive doucement si des documents utilisent cette filiere', async () => {
      prisma.filieres.findFirst.mockResolvedValueOnce(makeFiliere());
      prisma.documents.count.mockResolvedValueOnce(5);
      await service.supprimer(FILIERE_ID, ADMIN_ID);
      expect(prisma.filieres.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { est_actif: false } }),
      );
    });

    it('leve NotFoundException si filiere inexistante', async () => {
      prisma.filieres.findFirst.mockResolvedValueOnce(null);
      await expect(service.supprimer(FILIERE_ID, ADMIN_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
