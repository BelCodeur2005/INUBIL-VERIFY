import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { InvitationsService } from './invitations.service';

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2a$04$hashed'),
  compare: jest.fn(),
}));

const ACTEUR_ID = 'acteur-uuid-1';
const INV_ID = 'inv-uuid-1';
const ROLE_ID = 'role-uuid-1';
const UNIV_ID = 'univ-uuid-1';
const AUTRE_UNIV_ID = 'univ-uuid-2';
const USER_ID = 'user-uuid-1';
const TOKEN_BRUT = 'a'.repeat(64);

const makeInvitation = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: INV_ID,
  token: 'hashed-token',
  cible: 'collaborateur',
  email: 'invite@istama.cm',
  role_id: ROLE_ID,
  universite_id: UNIV_ID,
  statut: 'en_attente',
  expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000),
  accepted_at: null,
  nb_relances: 0,
  created_by: ACTEUR_ID,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

const makeUser = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: USER_ID,
  nom: 'Doe',
  prenom: 'John',
  email: 'invite@istama.cm',
  mot_de_passe: '$2a$04$hashed',
  email_verifie: true,
  statut: 'actif',
  role_id: ROLE_ID,
  universite_id: UNIV_ID,
  deleted_at: null,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

describe('InvitationsService', () => {
  let service: InvitationsService;
  let prisma: {
    invitations: jest.Mocked<any>;
    universites: jest.Mocked<any>;
    roles: jest.Mocked<any>;
    utilisateurs: jest.Mocked<any>;
    $transaction: jest.Mock;
  };
  let mail: { sendInvitation: jest.Mock };
  let audit: { log: jest.Mock };
  let auth: { genererJwtDepuisUtilisateur: jest.Mock };
  let config: { get: jest.Mock };

  beforeEach(async () => {
    prisma = {
      invitations: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      universites: { findFirst: jest.fn() },
      roles: { findFirst: jest.fn() },
      utilisateurs: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    mail = { sendInvitation: jest.fn().mockResolvedValue(undefined) };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    auth = {
      genererJwtDepuisUtilisateur: jest
        .fn()
        .mockResolvedValue({ access_token: 'jwt-token', refresh_token: 'refresh' }),
    };
    config = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'FRONTEND_URL') return 'http://localhost:3001';
        if (key === 'BCRYPT_SALT_ROUNDS') return 4;
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mail },
        { provide: AuditService, useValue: audit },
        { provide: AuthService, useValue: auth },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get(InvitationsService);
  });

  // ─── creer ──────────────────────────────────────────────────────────────────

  describe('creer', () => {
    it('crée une invitation et envoie l\'email', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValueOnce({ universite_id: UNIV_ID }); // acteur
      prisma.universites.findFirst.mockResolvedValue({ id: UNIV_ID });
      prisma.roles.findFirst.mockResolvedValue({ id: ROLE_ID });
      prisma.invitations.findFirst.mockResolvedValue(null);
      prisma.invitations.create.mockResolvedValue(makeInvitation());

      const result = await service.creer(
        { email: 'invite@istama.cm', role_id: ROLE_ID, universite_id: UNIV_ID },
        ACTEUR_ID,
      );

      expect(prisma.invitations.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ cible: 'collaborateur', email: 'invite@istama.cm' }),
        }),
      );
      expect(mail.sendInvitation).toHaveBeenCalledWith(
        'invite@istama.cm',
        expect.stringContaining('/invitations/activer?token='),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'INVITATION_CREEE' }),
      );
      expect(result.email).toBe('invite@istama.cm');
    });

    it('lève ForbiddenException si l\'acteur essaie de créer pour une autre université', async () => {
      // Acteur lié à UNIV_ID, mais dto.universite_id = AUTRE_UNIV_ID
      prisma.utilisateurs.findFirst.mockResolvedValueOnce({ universite_id: UNIV_ID });

      await expect(
        service.creer(
          { email: 'x@x.cm', role_id: ROLE_ID, universite_id: AUTRE_UNIV_ID },
          ACTEUR_ID,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('super-admin (universite_id=null) peut créer pour n\'importe quelle université', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValueOnce({ universite_id: null, roles_utilisateurs_role_idToroles: { nom: 'super_admin' } }); // super-admin
      prisma.universites.findFirst.mockResolvedValue({ id: AUTRE_UNIV_ID });
      prisma.roles.findFirst.mockResolvedValue({ id: ROLE_ID });
      prisma.invitations.findFirst.mockResolvedValue(null);
      prisma.invitations.create.mockResolvedValue(makeInvitation({ universite_id: AUTRE_UNIV_ID }));

      await expect(
        service.creer(
          { email: 'x@x.cm', role_id: ROLE_ID, universite_id: AUTRE_UNIV_ID },
          ACTEUR_ID,
        ),
      ).resolves.toBeDefined();
    });

    it('un utilisateur sans université ET sans rôle super_admin est refusé, pas bypassé (pas de fail-open)', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValueOnce({
        universite_id: null,
        roles_utilisateurs_role_idToroles: { nom: 'agent_saisie' },
      });

      await expect(
        service.creer({ email: 'x@x.cm', role_id: ROLE_ID, universite_id: UNIV_ID }, ACTEUR_ID),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.invitations.create).not.toHaveBeenCalled();
    });

    it('lève NotFoundException si université introuvable', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValueOnce({ universite_id: UNIV_ID });
      prisma.universites.findFirst.mockResolvedValue(null);

      await expect(
        service.creer({ email: 'x@x.cm', role_id: ROLE_ID, universite_id: UNIV_ID }, ACTEUR_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lève NotFoundException si rôle introuvable', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValueOnce({ universite_id: UNIV_ID });
      prisma.universites.findFirst.mockResolvedValue({ id: UNIV_ID });
      prisma.roles.findFirst.mockResolvedValue(null);

      await expect(
        service.creer({ email: 'x@x.cm', role_id: ROLE_ID, universite_id: UNIV_ID }, ACTEUR_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lève ConflictException si invitation en attente déjà existante', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValueOnce({ universite_id: UNIV_ID });
      prisma.universites.findFirst.mockResolvedValue({ id: UNIV_ID });
      prisma.roles.findFirst.mockResolvedValue({ id: ROLE_ID });
      prisma.invitations.findFirst.mockResolvedValue(makeInvitation());

      await expect(
        service.creer({ email: 'invite@istama.cm', role_id: ROLE_ID, universite_id: UNIV_ID }, ACTEUR_ID),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  // ─── lister ─────────────────────────────────────────────────────────────────

  describe('lister', () => {
    it('retourne une page vide si aucune invitation', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValueOnce({ universite_id: null, roles_utilisateurs_role_idToroles: { nom: 'super_admin' } }); // super-admin
      prisma.$transaction.mockResolvedValue([[], 0]);

      const result = await service.lister({ page: 1, limit: 20 }, ACTEUR_ID);

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('force universite_id de l\'acteur dans le filtre (non super-admin)', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValueOnce({ universite_id: UNIV_ID });
      prisma.invitations.findMany.mockResolvedValue([makeInvitation()]);
      prisma.invitations.count.mockResolvedValue(1);
      prisma.$transaction.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops));

      // L'acteur fournit AUTRE_UNIV_ID dans la query → doit être ignoré
      await service.lister({ universite_id: AUTRE_UNIV_ID }, ACTEUR_ID);

      expect(prisma.invitations.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ universite_id: UNIV_ID }),
        }),
      );
    });

    it('le super-admin peut filtrer par universite_id arbitraire', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValueOnce({ universite_id: null, roles_utilisateurs_role_idToroles: { nom: 'super_admin' } }); // super-admin
      prisma.invitations.findMany.mockResolvedValue([]);
      prisma.invitations.count.mockResolvedValue(0);
      prisma.$transaction.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops));

      await service.lister({ universite_id: AUTRE_UNIV_ID }, ACTEUR_ID);

      expect(prisma.invitations.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ universite_id: AUTRE_UNIV_ID }),
        }),
      );
    });
  });

  // ─── annuler ─────────────────────────────────────────────────────────────────

  describe('annuler', () => {
    it('supprime l\'invitation en attente et trace dans l\'audit', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValueOnce({ universite_id: UNIV_ID }); // acteur
      prisma.invitations.findFirst.mockResolvedValue(makeInvitation());
      prisma.invitations.delete.mockResolvedValue(undefined);

      await service.annuler(INV_ID, ACTEUR_ID);

      expect(prisma.invitations.delete).toHaveBeenCalledWith({ where: { id: INV_ID } });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'INVITATION_ANNULEE' }),
      );
    });

    it('lève ForbiddenException si invitation appartient à une autre université', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValueOnce({ universite_id: AUTRE_UNIV_ID }); // acteur autre univ
      prisma.invitations.findFirst.mockResolvedValue(makeInvitation({ universite_id: UNIV_ID }));

      await expect(service.annuler(INV_ID, ACTEUR_ID)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('lève NotFoundException si invitation introuvable', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValueOnce({ universite_id: UNIV_ID });
      prisma.invitations.findFirst.mockResolvedValue(null);

      await expect(service.annuler(INV_ID, ACTEUR_ID)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lève BadRequestException si statut != en_attente', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValueOnce({ universite_id: UNIV_ID });
      prisma.invitations.findFirst.mockResolvedValue(makeInvitation({ statut: 'acceptee' }));

      await expect(service.annuler(INV_ID, ACTEUR_ID)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  // ─── renvoyer ────────────────────────────────────────────────────────────────

  describe('renvoyer', () => {
    it('régénère le token, incrémente nb_relances et renvoie l\'email', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValueOnce({ universite_id: UNIV_ID }); // acteur
      prisma.invitations.findFirst.mockResolvedValue(makeInvitation({ statut: 'expiree' }));
      prisma.invitations.update.mockResolvedValue(makeInvitation({ nb_relances: 1 }));

      const result = await service.renvoyer(INV_ID, ACTEUR_ID);

      expect(prisma.invitations.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ nb_relances: { increment: 1 }, statut: 'en_attente' }),
        }),
      );
      expect(mail.sendInvitation).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'INVITATION_RENVOYEE' }),
      );
      expect(result.nb_relances).toBe(1);
    });

    it('lève ForbiddenException si invitation appartient à une autre université', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValueOnce({ universite_id: AUTRE_UNIV_ID }); // acteur autre univ
      prisma.invitations.findFirst.mockResolvedValue(makeInvitation({ universite_id: UNIV_ID }));

      await expect(service.renvoyer(INV_ID, ACTEUR_ID)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('lève NotFoundException si invitation introuvable', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValueOnce({ universite_id: UNIV_ID });
      prisma.invitations.findFirst.mockResolvedValue(null);

      await expect(service.renvoyer(INV_ID, ACTEUR_ID)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lève BadRequestException si invitation déjà acceptée', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValueOnce({ universite_id: UNIV_ID });
      prisma.invitations.findFirst.mockResolvedValue(makeInvitation({ statut: 'acceptee' }));

      await expect(service.renvoyer(INV_ID, ACTEUR_ID)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  // ─── activer ─────────────────────────────────────────────────────────────────

  describe('activer', () => {
    it('crée un nouveau compte et retourne JWT', async () => {
      prisma.invitations.findFirst.mockResolvedValue(makeInvitation());
      prisma.utilisateurs.findFirst.mockResolvedValue(null); // pas de compte existant
      prisma.utilisateurs.create.mockResolvedValue(makeUser());
      prisma.invitations.update.mockResolvedValue(makeInvitation({ statut: 'acceptee' }));

      const result = await service.activer({
        token: TOKEN_BRUT,
        nom: 'Doe',
        prenom: 'John',
        mot_de_passe: 'Azerty@1234',
      });

      expect(prisma.utilisateurs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: 'invite@istama.cm', statut: 'actif', email_verifie: true }),
        }),
      );
      expect(prisma.invitations.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ statut: 'acceptee' }) }),
      );
      expect(auth.genererJwtDepuisUtilisateur).toHaveBeenCalled();
      expect(result.access_token).toBe('jwt-token');
    });

    it('assigne le rôle à un compte existant sans rôle et retourne JWT', async () => {
      prisma.invitations.findFirst.mockResolvedValue(makeInvitation());
      prisma.utilisateurs.findFirst.mockResolvedValue(makeUser({ role_id: null }));
      prisma.utilisateurs.update.mockResolvedValue(makeUser());
      prisma.invitations.update.mockResolvedValue(makeInvitation({ statut: 'acceptee' }));

      const result = await service.activer({ token: TOKEN_BRUT });

      expect(prisma.utilisateurs.create).not.toHaveBeenCalled();
      expect(prisma.utilisateurs.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role_id: ROLE_ID }),
        }),
      );
      expect(result.access_token).toBe('jwt-token');
    });

    it('lève BadRequestException si le compte est déjà actif avec un rôle (Fix SEC-2)', async () => {
      prisma.invitations.findFirst.mockResolvedValue(makeInvitation());
      // Compte actif avec rôle déjà assigné → refus d'écrasement silencieux
      prisma.utilisateurs.findFirst.mockResolvedValue(makeUser({ statut: 'actif', role_id: ROLE_ID }));

      await expect(service.activer({ token: TOKEN_BRUT })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lève BadRequestException si token invalide ou expiré', async () => {
      prisma.invitations.findFirst.mockResolvedValue(null);

      await expect(service.activer({ token: TOKEN_BRUT })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lève BadRequestException si champs manquants pour nouveau compte', async () => {
      prisma.invitations.findFirst.mockResolvedValue(makeInvitation());
      prisma.utilisateurs.findFirst.mockResolvedValue(null);

      await expect(service.activer({ token: TOKEN_BRUT })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lève BadRequestException si le compte existant est suspendu', async () => {
      prisma.invitations.findFirst.mockResolvedValue(makeInvitation());
      prisma.utilisateurs.findFirst.mockResolvedValue(makeUser({ statut: 'suspendu' }));

      await expect(service.activer({ token: TOKEN_BRUT })).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
