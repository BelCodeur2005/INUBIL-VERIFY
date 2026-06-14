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
import { RegisterDto } from './dto/register.dto';
import { AuthTokensDto } from './dto/auth-response.dto';
import { SessionResponseDto } from './dto/session-response.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtPayload } from './strategies/jwt.strategy';

const MAX_TENTATIVES = 5;
const DUREE_BLOCAGE_MIN = 15;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;       // 1h
const EMAIL_VERIF_TTL_MS = 24 * 60 * 60 * 1000;  // 24h

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private dummyHash: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
  ) {}

  // ─── REGISTER ───────────────────────────────────────────────────────
  async register(dto: RegisterDto): Promise<{ message: string }> {
    const email = dto.email.toLowerCase();

    const existant = await this.prisma.utilisateurs.findFirst({
      where: { email, deleted_at: null },
    });
    if (existant) {
      // Reponse volontairement vague pour ne pas confirmer l'existence du compte.
      return { message: 'Si cette adresse est valide, un email de verification vient d\'etre envoye.' };
    }

    const rounds = Number(this.config.get<number>('BCRYPT_SALT_ROUNDS'));
    const motDePasseHache = await bcrypt.hash(dto.mot_de_passe, rounds);
    const tokenBrut = randomBytes(32).toString('hex');

    await this.prisma.utilisateurs.create({
      data: {
        nom: dto.nom,
        prenom: dto.prenom,
        email,
        mot_de_passe: motDePasseHache,
        statut: 'en_attente_email',
        email_verifie: false,
        token_verification_email: this.hash(tokenBrut),
        token_verification_expiry: new Date(Date.now() + EMAIL_VERIF_TTL_MS),
      },
    });

    const verifyUrl = `${this.config.get<string>('FRONTEND_URL')}/verifier-email?token=${tokenBrut}`;
    await this.mail.sendEmailVerification(email, verifyUrl);

    return { message: 'Compte cree. Verifiez votre email pour activer votre compte.' };
  }

  // ─── VERIFY EMAIL ───────────────────────────────────────────────────
  async verifierEmail(token: string): Promise<{ message: string }> {
    const tokenHash = this.hash(token);

    const user = await this.prisma.utilisateurs.findFirst({
      where: {
        token_verification_email: tokenHash,
        token_verification_expiry: { gt: new Date() },
        deleted_at: null,
      },
    });
    if (!user) {
      throw new BadRequestException('Token de verification invalide ou expire');
    }

    if (user.email_en_attente) {
      // Flux changement d'email : on applique la nouvelle adresse.
      await this.prisma.utilisateurs.update({
        where: { id: user.id },
        data: {
          email: user.email_en_attente,
          email_en_attente: null,
          email_verifie: true,
          token_verification_email: null,
          token_verification_expiry: null,
        },
      });
      await this.audit.log({
        utilisateurId: user.id,
        nomUtilisateur: `${user.prenom} ${user.nom}`,
        action: 'email_change_confirme',
        module: 'auth',
        enregistrementId: user.id,
        tableConcernee: 'utilisateurs',
      });
      return { message: 'Email mis a jour et verifie avec succes.' };
    }

    // Flux creation de compte : on active le compte.
    await this.prisma.utilisateurs.update({
      where: { id: user.id },
      data: {
        email_verifie: true,
        statut: 'actif',
        token_verification_email: null,
        token_verification_expiry: null,
      },
    });
    await this.audit.log({
      utilisateurId: user.id,
      nomUtilisateur: `${user.prenom} ${user.nom}`,
      action: 'email_verifie',
      module: 'auth',
      enregistrementId: user.id,
      tableConcernee: 'utilisateurs',
    });

    return { message: 'Email verifie. Votre compte est maintenant actif.' };
  }

  // ─── RESEND VERIFICATION ────────────────────────────────────────────
  async renvoyerVerification(email: string): Promise<void> {
    const user = await this.prisma.utilisateurs.findFirst({
      where: { email: email.toLowerCase(), deleted_at: null },
    });

    // Reponse identique qu'on trouve le compte ou non (anti-enumeration).
    if (!user || user.email_verifie) {
      return;
    }

    const tokenBrut = randomBytes(32).toString('hex');
    await this.prisma.utilisateurs.update({
      where: { id: user.id },
      data: {
        token_verification_email: this.hash(tokenBrut),
        token_verification_expiry: new Date(Date.now() + EMAIL_VERIF_TTL_MS),
      },
    });

    const destinataire = user.email_en_attente ?? user.email;
    const verifyUrl = `${this.config.get<string>('FRONTEND_URL')}/verifier-email?token=${tokenBrut}`;
    await this.mail.sendEmailVerification(destinataire, verifyUrl);
  }

  // ─── LOGIN ──────────────────────────────────────────────────────────
  async login(dto: LoginDto, ip?: string, userAgent?: string): Promise<AuthTokensDto> {
    const user = await this.prisma.utilisateurs.findFirst({
      where: { email: dto.email.toLowerCase(), deleted_at: null },
    });

    if (!user) {
      await bcrypt.compare(dto.mot_de_passe, await this.getDummyHash());
      await this.tracerTentative(dto.email, ip, userAgent, false, 'utilisateur_inconnu');
      throw new UnauthorizedException('Identifiants invalides');
    }

    if (user.statut === 'en_attente_email') {
      throw new ForbiddenException('Veuillez verifier votre email avant de vous connecter');
    }

    if (user.statut === 'suspendu' || user.statut === 'inactif') {
      throw new ForbiddenException('Compte desactive');
    }

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

    await this.prisma.utilisateurs.update({
      where: { id: user.id },
      data: { tentatives_connexion: 0, bloque_jusqu: null, derniere_connexion: new Date() },
    });
    await this.tracerTentative(dto.email, ip, userAgent, true, null);

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

    await this.prisma.sessions.updateMany({
      where: { utilisateur_id: user.id, revoquee: false },
      data: { revoquee: true, revoquee_le: new Date() },
    });
  }

  // ─── PERMISSIONS (RBAC) ─────────────────────────────────────────────
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

  /**
   * Met a jour nom / prenom / email.
   * Un changement d'email est mis en attente dans `email_en_attente` et ne
   * prend effet qu'apres verification du token envoye a la nouvelle adresse.
   * L'ancienne adresse est notifiee pour securite.
   */
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
      email_en_attente?: string;
      token_verification_email?: string;
      token_verification_expiry?: Date;
    } = {};
    if (dto.nom !== undefined) data.nom = dto.nom;
    if (dto.prenom !== undefined) data.prenom = dto.prenom;

    let verifToken: string | null = null;
    let nouvelEmail: string | null = null;

    if (dto.email !== undefined && dto.email.toLowerCase() !== user.email) {
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
      // Le nouvel email est stocke en attente - l'email actuel reste actif
      // jusqu'a la confirmation via le lien de verification.
      data.email_en_attente = nouvelEmail;
      data.token_verification_email = this.hash(verifToken);
      data.token_verification_expiry = new Date(Date.now() + EMAIL_VERIF_TTL_MS);
    }

    await this.prisma.utilisateurs.update({ where: { id: userId }, data });

    if (verifToken && nouvelEmail) {
      // Revocation des sessions : le changement d'email est une op sensible.
      await this.prisma.sessions.updateMany({
        where: { utilisateur_id: userId, revoquee: false },
        data: { revoquee: true, revoquee_le: new Date() },
      });

      // Envoyer la verification au NOUVEL email.
      const verifyUrl = `${this.config.get<string>('FRONTEND_URL')}/verifier-email?token=${verifToken}`;
      await this.mail.sendEmailVerification(nouvelEmail, verifyUrl);

      // Notifier l'ANCIENNE adresse (alerte securite).
      await this.mail.sendEmailChangeNotification(user.email, nouvelEmail);

      await this.audit.log({
        utilisateurId: userId,
        nomUtilisateur: `${user.prenom} ${user.nom}`,
        action: 'changement_email_demande',
        module: 'auth',
        enregistrementId: userId,
        tableConcernee: 'utilisateurs',
      });
    }

    return this.getProfile(userId);
  }

  // ─── CHANGE PASSWORD ────────────────────────────────────────────────
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

  // ─── JWT PUBLIC (utilisé par InvitationsService pour l'auto-login) ──
  async genererJwtDepuisUtilisateur(
    user: utilisateurs,
    ip?: string,
    userAgent?: string,
  ): Promise<AuthTokensDto> {
    return this.genererTokens(user, ip, userAgent);
  }

  // ─── Helpers prives ─────────────────────────────────────────────────

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

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private async getDummyHash(): Promise<string> {
    if (!this.dummyHash) {
      const rounds = Number(this.config.get<number>('BCRYPT_SALT_ROUNDS'));
      this.dummyHash = await bcrypt.hash('timing-attack-mitigation', rounds);
    }
    return this.dummyHash;
  }
}
