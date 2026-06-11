import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import { AuthTokensDto } from '../auth/dto/auth-response.dto';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { ActiverInvitationDto } from './dto/activer-invitation.dto';
import { CreerInvitationDto } from './dto/creer-invitation.dto';
import { InvitationQueryDto } from './dto/invitation-query.dto';
import {
  InvitationListResponseDto,
  InvitationResponseDto,
} from './dto/invitation-response.dto';

const INVITATION_TTL_MS = 72 * 60 * 60 * 1000; // 72h

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  // ─── CRÉER ──────────────────────────────────────────────────────────
  async creer(
    dto: CreerInvitationDto,
    createurId: string,
    ip?: string,
  ): Promise<InvitationResponseDto> {
    const universite = await this.prisma.universites.findFirst({
      where: { id: dto.universite_id },
    });
    if (!universite) throw new NotFoundException('Université introuvable');

    const role = await this.prisma.roles.findFirst({ where: { id: dto.role_id } });
    if (!role) throw new NotFoundException('Rôle introuvable');

    const email = dto.email.toLowerCase();

    const dejaEnAttente = await this.prisma.invitations.findFirst({
      where: {
        email,
        universite_id: dto.universite_id,
        statut: 'en_attente',
        expires_at: { gt: new Date() },
      },
    });
    if (dejaEnAttente) {
      throw new ConflictException(
        'Une invitation en attente existe déjà pour cet email et cette université',
      );
    }

    const tokenBrut = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);

    const invitation = await this.prisma.invitations.create({
      data: {
        token: this.hash(tokenBrut),
        cible: 'collaborateur' as any,
        email,
        role_id: dto.role_id,
        universite_id: dto.universite_id,
        statut: 'en_attente' as any,
        expires_at: expiresAt,
        nb_relances: 0,
        created_by: createurId,
      },
    });

    const activerUrl = `${this.config.get<string>('FRONTEND_URL')}/invitations/activer?token=${tokenBrut}`;
    await this.mail.sendInvitation(email, activerUrl);

    await this.audit.log({
      utilisateurId: createurId,
      action: 'INVITATION_CREEE',
      module: 'invitations',
      enregistrementId: invitation.id,
      tableConcernee: 'invitations',
      ip,
    });

    return this.formater(invitation);
  }

  // ─── LISTER ─────────────────────────────────────────────────────────
  async lister(query: InvitationQueryDto): Promise<InvitationListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { cible: 'collaborateur' };
    if (query.statut) where.statut = query.statut;
    if (query.universite_id) where.universite_id = query.universite_id;

    const [invitations, total] = await this.prisma.$transaction([
      this.prisma.invitations.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.invitations.count({ where }),
    ]);

    return {
      data: invitations.map((i) => this.formater(i)),
      total,
      page,
      limit,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
  }

  // ─── ANNULER ─────────────────────────────────────────────────────────
  async annuler(id: string, acteurId: string, ip?: string): Promise<void> {
    const invitation = await this.prisma.invitations.findFirst({ where: { id } });
    if (!invitation) throw new NotFoundException('Invitation introuvable');

    if (invitation.statut !== 'en_attente') {
      throw new BadRequestException(
        'Seules les invitations en attente peuvent être annulées',
      );
    }

    await this.prisma.invitations.delete({ where: { id } });

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'INVITATION_ANNULEE',
      module: 'invitations',
      enregistrementId: id,
      tableConcernee: 'invitations',
      ip,
    });
  }

  // ─── RENVOYER ────────────────────────────────────────────────────────
  async renvoyer(
    id: string,
    acteurId: string,
    ip?: string,
  ): Promise<InvitationResponseDto> {
    const invitation = await this.prisma.invitations.findFirst({ where: { id } });
    if (!invitation) throw new NotFoundException('Invitation introuvable');

    if (invitation.statut === 'acceptee') {
      throw new BadRequestException('Cette invitation a déjà été acceptée');
    }

    const tokenBrut = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);

    const updated = await this.prisma.invitations.update({
      where: { id },
      data: {
        token: this.hash(tokenBrut),
        statut: 'en_attente' as any,
        expires_at: expiresAt,
        nb_relances: { increment: 1 },
      },
    });

    const activerUrl = `${this.config.get<string>('FRONTEND_URL')}/invitations/activer?token=${tokenBrut}`;
    await this.mail.sendInvitation(invitation.email, activerUrl);

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'INVITATION_RENVOYEE',
      module: 'invitations',
      enregistrementId: id,
      tableConcernee: 'invitations',
      ip,
    });

    return this.formater(updated);
  }

  // ─── ACTIVER ─────────────────────────────────────────────────────────
  async activer(
    dto: ActiverInvitationDto,
    ip?: string,
    userAgent?: string,
  ): Promise<AuthTokensDto> {
    const invitation = await this.prisma.invitations.findFirst({
      where: {
        token: this.hash(dto.token),
        statut: 'en_attente',
        expires_at: { gt: new Date() },
      },
    });
    if (!invitation) {
      throw new BadRequestException("Token d'invitation invalide ou expiré");
    }

    const existant = await this.prisma.utilisateurs.findFirst({
      where: { email: invitation.email, deleted_at: null },
    });

    let utilisateur: any;

    if (existant) {
      if (existant.statut === 'suspendu' || existant.statut === 'inactif') {
        throw new BadRequestException(
          'Ce compte est désactivé et ne peut pas accepter une invitation',
        );
      }
      utilisateur = await this.prisma.utilisateurs.update({
        where: { id: existant.id },
        data: {
          role_id: invitation.role_id,
          universite_id: invitation.universite_id,
          statut: existant.statut === 'en_attente_email' ? ('actif' as any) : existant.statut,
          email_verifie: true,
        },
      });
    } else {
      if (!dto.nom || !dto.prenom || !dto.mot_de_passe) {
        throw new BadRequestException(
          'nom, prenom et mot_de_passe sont requis pour créer un nouveau compte',
        );
      }

      const rounds = Number(this.config.get<number>('BCRYPT_SALT_ROUNDS'));
      const motDePasseHache = await bcrypt.hash(dto.mot_de_passe, rounds);

      utilisateur = await this.prisma.utilisateurs.create({
        data: {
          nom: dto.nom,
          prenom: dto.prenom,
          email: invitation.email,
          mot_de_passe: motDePasseHache,
          statut: 'actif' as any,
          email_verifie: true,
          role_id: invitation.role_id,
          universite_id: invitation.universite_id,
        },
      });
    }

    await this.prisma.invitations.update({
      where: { id: invitation.id },
      data: { statut: 'acceptee' as any, accepted_at: new Date() },
    });

    await this.audit.log({
      utilisateurId: utilisateur.id,
      nomUtilisateur: `${utilisateur.prenom} ${utilisateur.nom}`,
      action: 'INVITATION_ACCEPTEE',
      module: 'invitations',
      enregistrementId: invitation.id,
      tableConcernee: 'invitations',
      ip,
    });

    return this.auth.genererJwtDepuisUtilisateur(utilisateur, ip, userAgent);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private formater(i: any): InvitationResponseDto {
    return {
      id: i.id,
      email: i.email,
      cible: i.cible,
      statut: i.statut,
      expires_at: i.expires_at,
      accepted_at: i.accepted_at ?? null,
      nb_relances: i.nb_relances,
      role_id: i.role_id ?? null,
      universite_id: i.universite_id ?? null,
      created_at: i.created_at,
    };
  }
}
