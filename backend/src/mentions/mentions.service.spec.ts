import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MentionsService } from './mentions.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const ADMIN_ID = 'admin-000-000-000-000000000001';
const UNIV_ID = 'univ-000-000-000-000000000001';
const AUTRE_UNIV_ID = 'univ-000-000-000-000000000002';
const MENTION_ID = 'ment-000-000-000-000000000001';

const makeMention = (overrides = {}) => ({
  id: MENTION_ID,
  code: 'AB',
  nom: 'Assez Bien',
  note_min: 12,
  note_max: 14,
  universite_id: UNIV_ID,
  est_actif: true,
  ordre: 3,
  created_at: new Date(),
  ...overrides,
});

const makePrisma = () => ({
  utilisateurs: {
    findFirst: jest.fn().mockResolvedValue({ universite_id: UNIV_ID }),
  },
  universites: {
    findFirst: jest.fn().mockResolvedValue({ id: UNIV_ID, statut: 'active' }),
  },
  mentions_document: {
    findMany: jest.fn().mockResolvedValue([makeMention()]),
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue(makeMention()),
    update: jest.fn().mockResolvedValue(makeMention()),
    delete: jest.fn().mockResolvedValue(makeMention()),
  },
  documents: {
    count: jest.fn().mockResolvedValue(0),
  },
});

const makeAudit = () => ({ log: jest.fn() });

describe('MentionsService', () => {
  let service: MentionsService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(async () => {
    prisma = makePrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MentionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: makeAudit() },
      ],
    }).compile();
    service = module.get(MentionsService);
  });

  describe('lister', () => {
    it('scopes par universite quand acteur est lie a une universite', async () => {
      const result = await service.lister({}, ADMIN_ID);
      expect(prisma.mentions_document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ universite_id: UNIV_ID }) }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('AB');
    });

    it('un utilisateur sans université ET sans rôle super_admin est refusé, pas bypassé (pas de fail-open)', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValueOnce({
        universite_id: null,
        roles_utilisateurs_role_idToroles: { nom: 'agent_saisie' },
      });

      await expect(service.lister({}, ADMIN_ID)).rejects.toThrow(ForbiddenException);
      expect(prisma.mentions_document.findMany).not.toHaveBeenCalled();
    });

    it('super-admin voit toutes les mentions sans filtre par defaut', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValueOnce({ universite_id: null, roles_utilisateurs_role_idToroles: { nom: 'super_admin' } });
      await service.lister({}, ADMIN_ID);
      const where = prisma.mentions_document.findMany.mock.calls[0][0].where;
      expect(where.universite_id).toBeUndefined();
    });
  });

  describe('creer', () => {
    it('cree une mention et la retourne', async () => {
      prisma.mentions_document.findFirst.mockResolvedValueOnce(null);
      const dto = { code: 'AB', nom: 'Assez Bien', note_min: 12, note_max: 14, universite_id: UNIV_ID };
      const result = await service.creer(dto as any, ADMIN_ID);
      expect(prisma.mentions_document.create).toHaveBeenCalled();
      expect(result.id).toBe(MENTION_ID);
    });

    it('leve ConflictException si le code existe deja', async () => {
      prisma.mentions_document.findFirst.mockResolvedValueOnce(makeMention());
      const dto = { code: 'AB', nom: 'Doublon', universite_id: UNIV_ID };
      await expect(service.creer(dto as any, ADMIN_ID)).rejects.toThrow(ConflictException);
    });

    it('leve ForbiddenException si acteur tente de creer pour une autre universite', async () => {
      const dto = { code: 'TB', nom: 'Tres Bien', universite_id: AUTRE_UNIV_ID };
      await expect(service.creer(dto as any, ADMIN_ID)).rejects.toThrow(ForbiddenException);
    });

    it('leve NotFoundException si universite inactive', async () => {
      prisma.universites.findFirst.mockResolvedValueOnce(null);
      const dto = { code: 'TB', nom: 'Tres Bien', universite_id: UNIV_ID };
      await expect(service.creer(dto as any, ADMIN_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('supprimer', () => {
    it('supprime physiquement si aucun document ne l utilise', async () => {
      prisma.mentions_document.findFirst.mockResolvedValueOnce(makeMention());
      prisma.documents.count.mockResolvedValueOnce(0);
      await service.supprimer(MENTION_ID, ADMIN_ID);
      expect(prisma.mentions_document.delete).toHaveBeenCalledWith({ where: { id: MENTION_ID } });
    });

    it('desactive doucement si des documents utilisent cette mention', async () => {
      prisma.mentions_document.findFirst.mockResolvedValueOnce(makeMention());
      prisma.documents.count.mockResolvedValueOnce(5);
      await service.supprimer(MENTION_ID, ADMIN_ID);
      expect(prisma.mentions_document.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { est_actif: false } }),
      );
    });

    it('leve NotFoundException si mention inexistante', async () => {
      prisma.mentions_document.findFirst.mockResolvedValueOnce(null);
      await expect(service.supprimer(MENTION_ID, ADMIN_ID)).rejects.toThrow(NotFoundException);
    });
  });
});
