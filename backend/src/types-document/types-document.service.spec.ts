import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TypesDocumentService } from './types-document.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const ADMIN_ID = 'admin-000-000-000-000000000001';
const UNIV_ID = 'univ-000-000-000-000000000001';
const AUTRE_UNIV_ID = 'univ-000-000-000-000000000002';
const TYPE_ID = 'type-000-000-000-000000000001';

const makeType = (overrides = {}) => ({
  id: TYPE_ID,
  code: 'LIC-INFO',
  nom: 'Licence en Informatique',
  nom_court: 'Licence',
  categorie: 'diplome',
  niveau_bac_plus: 3,
  pays: 'Cameroun',
  universite_id: UNIV_ID,
  a_matieres: true,
  est_partage: false,
  est_actif: true,
  ordre: 0,
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
  types_document: {
    findMany: jest.fn().mockResolvedValue([makeType()]),
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue(makeType()),
    update: jest.fn().mockResolvedValue(makeType()),
    delete: jest.fn().mockResolvedValue(makeType()),
  },
  documents: {
    count: jest.fn().mockResolvedValue(0),
  },
});

const makeAudit = () => ({ log: jest.fn() });

describe('TypesDocumentService', () => {
  let service: TypesDocumentService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(async () => {
    prisma = makePrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TypesDocumentService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: makeAudit() },
      ],
    }).compile();
    service = module.get(TypesDocumentService);
  });

  describe('lister', () => {
    it('scopes par universite quand acteur est lie a une universite', async () => {
      const result = await service.lister({}, ADMIN_ID);
      expect(prisma.types_document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ universite_id: UNIV_ID }) }),
      );
      expect(result).toHaveLength(1);
    });

    it('un utilisateur sans université ET sans rôle super_admin est refusé, pas bypassé (pas de fail-open)', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValueOnce({
        universite_id: null,
        roles_utilisateurs_role_idToroles: { nom: 'agent_saisie' },
      });

      await expect(service.lister({}, ADMIN_ID)).rejects.toThrow(ForbiddenException);
      expect(prisma.types_document.findMany).not.toHaveBeenCalled();
    });

    it('super-admin voit tous les types sans filtre par defaut', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValueOnce({ universite_id: null, roles_utilisateurs_role_idToroles: { nom: 'super_admin' } });
      await service.lister({}, ADMIN_ID);
      const where = prisma.types_document.findMany.mock.calls[0][0].where;
      expect(where.universite_id).toBeUndefined();
    });
  });

  describe('creer', () => {
    it('cree un type et le retourne', async () => {
      prisma.types_document.findFirst.mockResolvedValueOnce(null); // pas de doublon
      const dto = { code: 'lic-info', nom: 'Licence en Informatique', categorie: 'diplome', universite_id: UNIV_ID };
      const result = await service.creer(dto as any, ADMIN_ID);
      expect(prisma.types_document.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ code: 'LIC-INFO' }) }), // code en majuscules
      );
      expect(result.id).toBe(TYPE_ID);
    });

    it('leve ConflictException si le code existe deja', async () => {
      prisma.types_document.findFirst.mockResolvedValueOnce(makeType());
      const dto = { code: 'LIC-INFO', nom: 'Autre', categorie: 'diplome', universite_id: UNIV_ID };
      await expect(service.creer(dto as any, ADMIN_ID)).rejects.toThrow(ConflictException);
    });

    it('leve ForbiddenException si acteur tente de creer pour une autre universite', async () => {
      const dto = { code: 'MASTER', nom: 'Master', categorie: 'diplome', universite_id: AUTRE_UNIV_ID };
      await expect(service.creer(dto as any, ADMIN_ID)).rejects.toThrow(ForbiddenException);
    });

    it('leve NotFoundException si universite inactive', async () => {
      prisma.universites.findFirst.mockResolvedValueOnce(null);
      const dto = { code: 'NEW', nom: 'Nouveau', categorie: 'diplome', universite_id: UNIV_ID };
      await expect(service.creer(dto as any, ADMIN_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('supprimer', () => {
    it('supprime physiquement si aucun document ne l utilise', async () => {
      prisma.types_document.findFirst.mockResolvedValueOnce(makeType());
      prisma.documents.count.mockResolvedValueOnce(0);
      await service.supprimer(TYPE_ID, ADMIN_ID);
      expect(prisma.types_document.delete).toHaveBeenCalledWith({ where: { id: TYPE_ID } });
    });

    it('desactive doucement si des documents utilisent ce type', async () => {
      prisma.types_document.findFirst.mockResolvedValueOnce(makeType());
      prisma.documents.count.mockResolvedValueOnce(3);
      await service.supprimer(TYPE_ID, ADMIN_ID);
      expect(prisma.types_document.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { est_actif: false } }),
      );
    });

    it('leve NotFoundException si type inexistant', async () => {
      prisma.types_document.findFirst.mockResolvedValueOnce(null);
      await expect(service.supprimer(TYPE_ID, ADMIN_ID)).rejects.toThrow(NotFoundException);
    });
  });
});
