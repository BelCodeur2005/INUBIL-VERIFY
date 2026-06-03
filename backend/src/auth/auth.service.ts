import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { utilisateurs } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { AuditService } from '../audit/audit.service';
import { LoginDto } from './dto/login.dto';
import { AuthTokensDto } from './dto/auth-response.dto';
import { SessionResponseDto } from './dto/session-response.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtPayload } from './strategies/jwt.strategy';

/** Nombre d'echecs avant blocage temporaire du compte. */
const MAX_TENTATIVES = 5;
/** Duree du blocage apres MAX_TENTATIVES echecs (minutes). */
const DUREE_BLOCAGE_MIN = 15;
/** Duree de validite du token de reinitialisation (millisecondes). */
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h
/** Duree de validite du token de verification d'email (millisecondes). */
const EMAIL_VERIF_TTL_MS = 24 * 60 * 60 * 1000; // 24h

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  /** Hash bcrypt factice (calcule une fois) pour neutraliser le timing. */
  private dummyHash: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
  ) {}

  // ─── LOGIN ──────────────────────────────────────────────────────────
  async login(dto: LoginDto, ip?: string, userAgent?: string): Promise<AuthTokensDto> {
    const user = await this.prisma.utilisateurs.findFirst({
      where: { email: dto.email.toLowerCase(), deleted_at: null },
    });

    // Compte introuvable : meme reponse qu'un mauvais mot de passe (anti-enumeration).
    if (!user) {
      // Anti-timing : on execute un bcrypt.compare factice pour que cette branche
      // coute le meme temps que la branche "mot de passe errone" (sinon l'ecart
      // de duree revele si l'email existe ou non).
      await bcrypt.compare(dto.mot_de_passe, await this.getDummyHash());
      await this.tracerTentative(dto.email, ip, userAgent, false, 'utilisateur_inconnu');
      throw new UnauthorizedException('Identifiants invalides');
    }

    if (user.statut === 'suspendu' || user.statut === 'inactif') {
      throw new ForbiddenException('Compte desactive');
    }

    // Compte temporairement bloque (trop d'echecs) -> 429.
    if (user.bloque_jusqu && user.bloque_jusqu > new Date()) {
      throw new HttpException(
        'Compte temporairement bloque suite a trop de tentatives. Reessayez plus tard.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const motDePasseOk = await bcrypt.compare(dto.mot_de_passe, user.mot_de_passe);
    if (!motDePasseOk) {
      await this.gererEchec(user);
      await this.tracerTentative(dto.email, ip, userAgent, false, 'mot_de_passe_invalide');
      throw new UnauthorizedException('Identifiants invalides');
    }

    // Succes : on remet le compteur a zero et on note la connexion.
    await this.prisma.utilisateurs.update({
      where: { id: user.id },
      data: { tentatives_connexion: 0, bloque_jusqu: null, derniere_connexion: new Date() },
    });
    await this.tracerTentative(dto.email, ip, userAgent, true, null);

    // Nettoyage des sessions deja expirees + trace dans le journal d'audit.
    await this.revoquerSessionsExpirees(user.id);
    await this.audit.log({
      utilisateurId: user.id,
      nomUtilisateur: `${user.prenom} ${user.nom}`,
      action: 'connexion',
      module: 'auth',
      ip,
      userAgent,
    });

    return this.genererTokens(user, ip, userAgent);
  }

  // ─── REFRESH ────────────────────────────────────────────────────────
  async refresh(refreshToken: string, ip?: string, userAgent?: string): Promise<AuthTokensDto> {
    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync<{ sub: string }>(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token invalide');
    }

    const tokenHash = this.hash(refreshToken);
    const session = await this.prisma.sessions.findFirst({
      where: {
        token_hash: tokenHash,
        utilisateur_id: payload.sub,
        revoquee: false,
        expires_at: { gt: new Date() },
      },
    });
    if (!session) {
      throw new UnauthorizedException('Session invalide ou expiree');
    }

    const user = await this.prisma.utilisateurs.findFirst({
      where: { id: payload.sub, deleted_at: null },
    });
    if (!user) {
      throw new UnauthorizedException('Session invalide');
    }

    // Rotation : l'ancienne session est revoquee, une nouvelle est creee.
    await this.prisma.sessions.update({
      where: { id: session.id },
      data: { revoquee: true, revoquee_le: new Date() },
    });

    return this.genererTokens(user, ip, userAgent);
  }

  // ─── LOGOUT ─────────────────────────────────────────────────────────
  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hash(refreshToken);
    const session = await this.prisma.sessions.findFirst({
      where: { token_hash: tokenHash },
    });

    // Idempotent : revoque la session si elle existe, sans erreur sinon.
    await this.prisma.sessions.updateMany({
      where: { token_hash: tokenHash, revoquee: false },
      data: { revoquee: true, revoquee_le: new Date() },
    });

    if (session) {
      await this.audit.log({
        utilisateurId: session.utilisateur_id,
        action: 'deconnexion',
        module: 'auth',
        ip: session.ip_address ?? undefined,
        userAgent: session.user_agent ?? undefined,
      });
    }
  }

  // ─── FORGOT PASSWORD ────────────────────────────────────────────────
  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.utilisateurs.findFirst({
      where: { email: email.toLowerCase(), deleted_at: null },
    });

    // Reponse toujours identique, qu'on trouve le compte ou non (anti-enumeration).
    if (user) {
      const tokenBrut = randomBytes(32).toString('hex');
      await this.prisma.utilisateurs.update({
        where: { id: user.id },
        data: {
          token_reset_password: this.hash(tokenBrut),
          token_reset_expiry: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      });
      const resetUrl = `${this.config.get<string>('FRONTEND_URL')}/reset-password?token=${tokenBrut}`;
      await this.mail.sendPasswordReset(user.email, resetUrl);
    }
  }

  // ─── RESET PASSWORD ─────────────────────────────────────────────────
  async resetPassword(token: string, nouveauMotDePasse: string): Promise<void> {
    const user = await this.prisma.utilisateurs.findFirst({
      where: {
        token_reset_password: this.hash(token),
        token_reset_expiry: { gt: new Date() },
        deleted_at: null,
      },
    });
    if (!user) {
      throw new BadRequestException('Token de reinitialisation invalide ou expire');
    }

    const rounds = Number(this.config.get<number>('BCRYPT_SALT_ROUNDS'));
    const hash = await bcrypt.hash(nouveauMotDePasse, rounds);

    await this.prisma.utilisateurs.update({
      where: { id: user.id },
      data: {
        mot_de_passe: hash,
        token_reset_password: null,
        token_reset_expiry: null,
        tentatives_connexion: 0,
        bloque_jusqu: null,
      },
    });

    // Securite : on revoque toutes les sessions actives apres un reset.
    await this.prisma.sessions.updateMany({
      where: { utilisateur_id: user.id, revoquee: false },
      data: { revoquee: true, revoquee_le: new Date() },
    });
  }

  // ─── PERMISSIONS (RBAC) ─────────────────────────────────────────────
  /** Retourne les noms des permissions accordees au role donne. */
  async getPermissions(roleId: string | null): Promise<string[]> {
    if (!roleId) {
      return [];
    }
    const liens = await this.prisma.role_permissions.findMany({
      where: { role_id: roleId },
      select: { permissions: { select: { nom: true } } },
    });
    return liens.map((lien) => lien.permissions.nom);
  }

  // ─── PROFIL ─────────────────────────────────────────────────────────
  /** Profil complet de l'utilisateur (avec role et universite). */
  async getProfile(userId: string): Promise<ProfileResponseDto> {
    const user = await this.prisma.utilisateurs.findFirst({
      where: { id: userId, deleted_at: null },
      include: {
        roles_utilisateurs_role_idToroles: { select: { id: true, nom: true } },
        universites_utilisateurs_universite_idTouniversites: {
          select: { id: true, nom: true },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    return {
      id: user.id,
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      email_verifie: user.email_verifie,
      avatar_url: user.avatar_url,
      langue: user.langue,
      role: user.roles_utilisateurs_role_idToroles ?? null,
      universite: user.universites_utilisateurs_universite_idTouniversites ?? null,
      created_at: user.created_at,
    };
  }

  /** Met a jour nom / prenom / email. Un changement d'email force une re-verification. */
  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<ProfileResponseDto> {
    const user = await this.prisma.utilisateurs.findFirst({
      where: { id: userId, deleted_at: null },
    });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const data: {
      nom?: string;
      prenom?: string;
      email?: string;
      email_verifie?: boolean;
      token_verification_email?: string;
      token_verification_expiry?: Date;
    } = {};
    if (dto.nom !== undefined) data.nom = dto.nom;
    if (dto.prenom !== undefined) data.prenom = dto.prenom;

    let verifToken: string | null = null;
    let nouvelEmail: string | null = null;
    if (dto.email !== undefined && dto.email.toLowerCase() !== user.email) {
      // Step-up auth : changer l'email est une operation sensible (risque de
      // prise de controle si un access token est vole). On exige donc le mot
      // de passe actuel.
      if (!dto.mot_de_passe_actuel) {
        throw new BadRequestException(
          "Le mot de passe actuel est requis pour changer l'email",
        );
      }
      const motDePasseOk = await bcrypt.compare(
        dto.mot_de_passe_actuel,
        user.mot_de_passe,
      );
      if (!motDePasseOk) {
        throw new BadRequestException('Mot de passe actuel incorrect');
      }

      nouvelEmail = dto.email.toLowerCase();
      const dejaPris = await this.prisma.utilisateurs.findFirst({
        where: { email: nouvelEmail, deleted_at: null },
      });
      if (dejaPris) {
        throw new ConflictException('Cet email est deja utilise');
      }
      verifToken = randomBytes(32).toString('hex');
      data.email = nouvelEmail;
      data.email_verifie = false;
      data.token_verification_email = this.hash(verifToken);
      data.token_verification_expiry = new Date(Date.now() + EMAIL_VERIF_TTL_MS);
    }

    await this.prisma.utilisateurs.update({ where: { id: userId }, data });

    // Changement d'email : on declenche la re-verification (l'endpoint de
    // validation du token est la tache #69).
    if (verifToken && nouvelEmail) {
      // Securite : un changement d'email revoque toutes les sessions actives.
      await this.prisma.sessions.updateMany({
        where: { utilisateur_id: userId, revoquee: false },
        data: { revoquee: true, revoquee_le: new Date() },
      });

      const verifyUrl = `${this.config.get<string>('FRONTEND_URL')}/verifier-email?token=${verifToken}`;
      await this.mail.sendEmailVerification(nouvelEmail, verifyUrl);
      await this.audit.log({
        utilisateurId: userId,
        nomUtilisateur: `${user.prenom} ${user.nom}`,
        action: 'changement_email',
        module: 'auth',
      });
    }

    return this.getProfile(userId);
  }

  /** Change le mot de passe apres verification de l'ancien. */
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    if (dto.nouveau_mot_de_passe !== dto.confirmation_mot_de_passe) {
      throw new BadRequestException(
        'La confirmation ne correspond pas au nouveau mot de passe',
      );
    }

    const user = await this.prisma.utilisateurs.findFirst({
      where: { id: userId, deleted_at: null },
    });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const ancienOk = await bcrypt.compare(dto.ancien_mot_de_passe, user.mot_de_passe);
    if (!ancienOk) {
      throw new BadRequestException('Ancien mot de passe incorrect');
    }

    const rounds = Number(this.config.get<number>('BCRYPT_SALT_ROUNDS'));
    const hash = await bcrypt.hash(dto.nouveau_mot_de_passe, rounds);

    await this.prisma.utilisateurs.update({
      where: { id: userId },
      data: { mot_de_passe: hash },
    });

    // Securite : un changement de mot de passe revoque toutes les sessions.
    await this.prisma.sessions.updateMany({
      where: { utilisateur_id: userId, revoquee: false },
      data: { revoquee: true, revoquee_le: new Date() },
    });

    await this.audit.log({
      utilisateurId: userId,
      nomUtilisateur: `${user.prenom} ${user.nom}`,
      action: 'changement_mot_de_passe',
      module: 'auth',
    });
  }

  // ─── SESSIONS ───────────────────────────────────────────────────────
  /** Liste les sessions actives (non revoquees, non expirees) d'un utilisateur. */
  async listerSessions(userId: string): Promise<SessionResponseDto[]> {
    return this.prisma.sessions.findMany({
      where: {
        utilisateur_id: userId,
        revoquee: false,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        ip_address: true,
        user_agent: true,
        created_at: true,
        expires_at: true,
      },
    });
  }

  /** Revoque une session precise, apres verif qu'elle appartient a l'utilisateur. */
  async revoquerSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.prisma.sessions.findFirst({
      where: { id: sessionId, utilisateur_id: userId },
    });
    if (!session) {
      throw new NotFoundException('Session introuvable');
    }
    if (!session.revoquee) {
      await this.prisma.sessions.update({
        where: { id: session.id },
        data: { revoquee: true, revoquee_le: new Date() },
      });
    }
  }

  // ─── Helpers prives ─────────────────────────────────────────────────

  /** Revoque les sessions deja expirees d'un utilisateur (nettoyage). */
  private async revoquerSessionsExpirees(userId: string): Promise<void> {
    await this.prisma.sessions.updateMany({
      where: {
        utilisateur_id: userId,
        revoquee: false,
        expires_at: { lte: new Date() },
      },
      data: { revoquee: true, revoquee_le: new Date() },
    });
  }

  /** Incremente le compteur d'echecs et bloque le compte au-dela du seuil. */
  private async gererEchec(user: utilisateurs): Promise<void> {
    const tentatives = user.tentatives_connexion + 1;
    const data: { tentatives_connexion: number; bloque_jusqu?: Date } = {
      tentatives_connexion: tentatives,
    };
    if (tentatives >= MAX_TENTATIVES) {
      data.bloque_jusqu = new Date(Date.now() + DUREE_BLOCAGE_MIN * 60 * 1000);
    }
    await this.prisma.utilisateurs.update({ where: { id: user.id }, data });
  }

  /** Journalise une tentative de connexion (sans jamais bloquer l'auth). */
  private async tracerTentative(
    email: string,
    ip: string | undefined,
    userAgent: string | undefined,
    succes: boolean,
    raison: string | null,
  ): Promise<void> {
    try {
      await this.prisma.tentatives_connexion.create({
        data: {
          email: email.toLowerCase(),
          ip_address: ip,
          user_agent: userAgent,
          succes,
          raison_echec: raison ?? undefined,
        },
      });
    } catch (err) {
      this.logger.warn(`Echec de journalisation de tentative: ${String(err)}`);
    }
  }

  /** Genere access + refresh tokens et cree la session correspondante. */
  private async genererTokens(
    user: utilisateurs,
    ip?: string,
    userAgent?: string,
  ): Promise<AuthTokensDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role_id: user.role_id,
    };

    const access_token = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('JWT_SECRET'),
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN'),
    });

    const refresh_token = await this.jwt.signAsync(
      { sub: user.id },
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN'),
      },
    );

    const accessDecoded = this.jwt.decode(access_token) as { exp: number };

    // Fenetre d'inactivite glissante : la session expire si aucun refresh
    // n'intervient dans ce delai -> deconnexion automatique apres inactivite.
    // (Le refresh token JWT garde son propre plafond absolu via JWT_REFRESH_EXPIRES_IN.)
    const idleMinutes = Number(this.config.get<number>('SESSION_IDLE_MINUTES'));
    const sessionExpiresAt = new Date(Date.now() + idleMinutes * 60 * 1000);

    await this.prisma.sessions.create({
      data: {
        utilisateur_id: user.id,
        token_hash: this.hash(refresh_token),
        ip_address: ip,
        user_agent: userAgent,
        expires_at: sessionExpiresAt,
      },
    });

    return {
      access_token,
      refresh_token,
      token_type: 'Bearer',
      expires_in: accessDecoded.exp - Math.floor(Date.now() / 1000),
      user: {
        id: user.id,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
        role_id: user.role_id,
      },
    };
  }

  /** Hash SHA-256 (pour stocker tokens/sessions sans jamais garder le clair). */
  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  /** Hash bcrypt factice (au cout configure), mis en cache apres le 1er appel. */
  private async getDummyHash(): Promise<string> {
    if (!this.dummyHash) {
      const rounds = Number(this.config.get<number>('BCRYPT_SALT_ROUNDS'));
      this.dummyHash = await bcrypt.hash('timing-attack-mitigation', rounds);
    }
    return this.dummyHash;
  }
}
