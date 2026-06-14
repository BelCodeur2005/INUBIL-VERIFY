import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

// Mock bcryptjs pour controler compare/hash sans calcul reel
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('$2a$04$hashed'),
}));
import * as bcrypt from 'bcryptjs';

const USER_ID = 'user-uuid-1';
const HASH_MOT_DE_PASSE = '$2a$04$fixedhashfixedhashfixedhashfixedhashfixedha'; // bcrypt valide format

const makeUser = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: USER_ID,
  nom: 'Doe',
  prenom: 'John',
  email: 'john@inubil.com',
  mot_de_passe: HASH_MOT_DE_PASSE,
  statut: 'actif',
  email_verifie: true,
  email_en_attente: null,
  token_verification_email: null,
  token_verification_expiry: null,
  token_reset_password: null,
  token_reset_expiry: null,
  role_id: null,
  tentatives_connexion: 0,
  bloque_jusqu: null,
  deleted_at: null,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    utilisateurs: jest.Mocked<any>;
    sessions: jest.Mocked<any>;
    tentatives_connexion: jest.Mocked<any>;
    role_permissions: jest.Mocked<any>;
  };
  let mail: { sendEmailVerification: jest.Mock; sendEmailChangeNotification: jest.Mock };
  let audit: { log: jest.Mock };
  let config: { get: jest.Mock };
  let jwt: { signAsync: jest.Mock; verifyAsync: jest.Mock; decode: jest.Mock };

  beforeEach(async () => {
    prisma = {
      utilisateurs: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      sessions: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findMany: jest.fn(),
      },
      tentatives_connexion: { create: jest.fn() },
      role_permissions: { findMany: jest.fn() },
    };
    mail = {
      sendEmailVerification: jest.fn().mockResolvedValue(undefined),
      sendEmailChangeNotification: jest.fn().mockResolvedValue(undefined),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    config = {
      get: jest.fn().mockImplementation((key: string) => {
        const cfg: Record<string, unknown> = {
          BCRYPT_SALT_ROUNDS: 4,
          FRONTEND_URL: 'http://localhost:3000',
          JWT_SECRET: 'test-secret',
          JWT_REFRESH_SECRET: 'test-refresh-secret',
          JWT_EXPIRES_IN: '15m',
          JWT_REFRESH_EXPIRES_IN: '7d',
          SESSION_IDLE_MINUTES: 30,
        };
        return cfg[key];
      }),
    };
    jwt = {
      signAsync: jest.fn().mockResolvedValue('fake-token'),
      verifyAsync: jest.fn(),
      decode: jest.fn().mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 900 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mail },
        { provide: AuditService, useValue: audit },
        { provide: ConfigService, useValue: config },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  // ─── register ─────────────────────────────────────────────────────────────

  describe('register', () => {
    it('cree un compte avec statut en_attente_email et envoie un email', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValue(null);
      prisma.utilisateurs.create.mockResolvedValue(makeUser({ statut: 'en_attente_email', email_verifie: false }));

      const result = await service.register({
        nom: 'Doe',
        prenom: 'John',
        email: 'john@inubil.com',
        mot_de_passe: 'MonMotDePasse1!',
      });

      expect(prisma.utilisateurs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            statut: 'en_attente_email',
            email_verifie: false,
          }),
        }),
      );
      expect(mail.sendEmailVerification).toHaveBeenCalledWith(
        'john@inubil.com',
        expect.stringContaining('/verifier-email?token='),
      );
      expect(result.message).toBeDefined();
    });

    it('retourne un message generique si l\'email est deja utilise (anti-enumeration)', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValue(makeUser());

      const result = await service.register({
        nom: 'Doe',
        prenom: 'John',
        email: 'john@inubil.com',
        mot_de_passe: 'MonMotDePasse1!',
      });

      expect(prisma.utilisateurs.create).not.toHaveBeenCalled();
      expect(mail.sendEmailVerification).not.toHaveBeenCalled();
      expect(result.message).toBeDefined();
    });
  });

  // ─── verifierEmail ────────────────────────────────────────────────────────

  describe('verifierEmail', () => {
    it('active le compte (flux creation) - statut passe a actif', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValue(
        makeUser({
          statut: 'en_attente_email',
          email_verifie: false,
          email_en_attente: null,
          token_verification_email: 'hash-token',
          token_verification_expiry: new Date(Date.now() + 3_600_000),
        }),
      );
      prisma.utilisateurs.update.mockResolvedValue({});

      const result = await service.verifierEmail('valid-token-hex');

      expect(prisma.utilisateurs.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email_verifie: true,
            statut: 'actif',
            token_verification_email: null,
            token_verification_expiry: null,
          }),
        }),
      );
      expect(result.message).toBeDefined();
    });

    it('applique le changement d\'email (flux email_en_attente)', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValue(
        makeUser({
          email_en_attente: 'new@inubil.com',
          token_verification_email: 'hash-token',
          token_verification_expiry: new Date(Date.now() + 3_600_000),
        }),
      );
      prisma.utilisateurs.update.mockResolvedValue({});

      await service.verifierEmail('valid-token-hex');

      expect(prisma.utilisateurs.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'new@inubil.com',
            email_en_attente: null,
            email_verifie: true,
          }),
        }),
      );
    });

    it('leve BadRequestException si token invalide ou expire', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValue(null);

      await expect(service.verifierEmail('bad-token')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  // ─── renvoyerVerification ─────────────────────────────────────────────────

  describe('renvoyerVerification', () => {
    it('regenere un token et renvoie l\'email', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValue(
        makeUser({ email_verifie: false, email_en_attente: null }),
      );
      prisma.utilisateurs.update.mockResolvedValue({});

      await service.renvoyerVerification('john@inubil.com');

      expect(prisma.utilisateurs.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            token_verification_email: expect.any(String),
            token_verification_expiry: expect.any(Date),
          }),
        }),
      );
      expect(mail.sendEmailVerification).toHaveBeenCalled();
    });

    it('ne fait rien si le compte est deja verifie (silencieux)', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValue(makeUser({ email_verifie: true }));

      await service.renvoyerVerification('john@inubil.com');

      expect(prisma.utilisateurs.update).not.toHaveBeenCalled();
    });

    it('ne fait rien si l\'email est inconnu (anti-enumeration)', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValue(null);

      await service.renvoyerVerification('inconnu@inubil.com');

      expect(prisma.utilisateurs.update).not.toHaveBeenCalled();
    });
  });

  // ─── login ────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('bloque un compte en_attente_email avec ForbiddenException', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValue(
        makeUser({ statut: 'en_attente_email' }),
      );

      await expect(
        service.login({ email: 'john@inubil.com', mot_de_passe: 'any' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('leve UnauthorizedException pour identifiants invalides', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValue(null);
      prisma.tentatives_connexion.create.mockResolvedValue({});

      await expect(
        service.login({ email: 'inconnu@inubil.com', mot_de_passe: 'any' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  // ─── updateProfile (changement d'email) ──────────────────────────────────

  describe('updateProfile - changement d\'email', () => {
    it('stocke le nouvel email dans email_en_attente et notifie les deux adresses', async () => {
      const user = makeUser({ email: 'old@inubil.com' });
      prisma.utilisateurs.findFirst
        .mockResolvedValueOnce(user)           // findFirst dans updateProfile
        .mockResolvedValueOnce(null)           // check unicite nouvel email
        .mockResolvedValueOnce(user);          // getProfile a la fin
      prisma.utilisateurs.update.mockResolvedValue({});
      prisma.sessions.updateMany.mockResolvedValue({});
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.updateProfile(USER_ID, {
        email: 'new@inubil.com',
        mot_de_passe_actuel: 'MonMotDePasse1!',
      });

      expect(prisma.utilisateurs.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email_en_attente: 'new@inubil.com',
            token_verification_email: expect.any(String),
          }),
        }),
      );
      // Verification envoyee au NOUVEL email
      expect(mail.sendEmailVerification).toHaveBeenCalledWith(
        'new@inubil.com',
        expect.stringContaining('/verifier-email?token='),
      );
      // Notification a l'ANCIENNE adresse
      expect(mail.sendEmailChangeNotification).toHaveBeenCalledWith(
        'old@inubil.com',
        'new@inubil.com',
      );
      // Sessions revoquees
      expect(prisma.sessions.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ revoquee: true }) }),
      );
    });

    it('leve ConflictException si le nouvel email est deja pris', async () => {
      prisma.utilisateurs.findFirst
        .mockResolvedValueOnce(makeUser())
        .mockResolvedValueOnce(makeUser({ id: 'autre-id', email: 'new@inubil.com' }));
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.updateProfile(USER_ID, {
          email: 'new@inubil.com',
          mot_de_passe_actuel: 'MonMotDePasse1!',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('leve BadRequestException si mot_de_passe_actuel absent lors d\'un changement d\'email', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValue(makeUser());

      await expect(
        service.updateProfile(USER_ID, { email: 'new@inubil.com' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('leve NotFoundException si l\'utilisateur n\'existe pas', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValue(null);

      await expect(
        service.updateProfile(USER_ID, { nom: 'Nouveau' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
