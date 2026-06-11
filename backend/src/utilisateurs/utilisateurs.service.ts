import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { AssignerRoleDto } from './dto/assigner-role.dto';
import { ChangerStatutUtilisateurDto } from './dto/changer-statut-utilisateur.dto';
import { UtilisateurQueryDto } from './dto/utilisateur-query.dto';
import {
  UtilisateurListResponseDto,
  UtilisateurResponseDto,
} from './dto/utilisateur-response.dto';

/** Champs Prisma a inclure systematiquement pour construire UtilisateurResponseDto. */
const INCLUDE_BRIEF = {
  roles_utilisateurs_role_idToroles: { select: { id: true, nom: true } },
  universites_utilisateurs_universite_idTouniversites: { select: { id: true, nom: true } },
} as const;

@Injectable()
export class UtilisateursService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ─── LISTE ──────────────────────────────────────────────────────────
  async lister(query: UtilisateurQueryDto): Promise<UtilisateurListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.utilisateursWhereInput = { deleted_at: null };

    if (query.statut) where.statut = query.statut;
    if (query.role_id) where.role_id = query.role_id;
    if (query.universite_id) where.universite_id = query.universite_id;
    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { nom: { contains: term, mode: 'insensitive' } },
        { prenom: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [utilisateurs, total] = await this.prisma.$transaction([
      this.prisma.utilisateurs.findMany({
        where,
        include: INCLUDE_BRIEF,
        orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.utilisateurs.count({ where }),
    ]);

    return {
      data: utilisateurs.map((u) => this.formater(u)),
      total,
      page,
      limit,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
  }

  // ─── DETAIL ─────────────────────────────────────────────────────────
  async findOne(id: string): Promise<UtilisateurResponseDto> {
    const u = await this.prisma.utilisateurs.findFirst({
      where: { id, deleted_at: null },
      include: INCLUDE_BRIEF,
    });
    if (!u) throw new NotFoundException('Utilisateur introuvable');
    return this.formater(u);
  }

  // ─── CHANGER STATUT ─────────────────────────────────────────────────
  async changerStatut(
    id: string,
    dto: ChangerStatutUtilisateurDto,
    acteurId: string,
    ip?: string,
  ): Promise<UtilisateurResponseDto> {
    if (id === acteurId) {
      throw new ForbiddenException(
        'Vous ne pouvez pas modifier votre propre statut',
      );
    }

    const u = await this.prisma.utilisateurs.findFirst({
      where: { id, deleted_at: null },
    });
    if (!u) throw new NotFoundException('Utilisateur introuvable');

    // Le statut en_attente_email est geré par le flux email — pas modifiable manuellement.
    if (u.statut === 'en_attente_email') {
      throw new BadRequestException(
        'Le statut "en_attente_email" ne peut pas etre modifie manuellement',
      );
    }

    const updated = await this.prisma.utilisateurs.update({
      where: { id },
      data: { statut: dto.statut as any },
      include: INCLUDE_BRIEF,
    });

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'UTILISATEUR_STATUT_CHANGE',
      module: 'utilisateurs',
      enregistrementId: id,
      tableConcernee: 'utilisateurs',
      ip,
    });

    return this.formater(updated);
  }

  // ─── ASSIGNER ROLE ──────────────────────────────────────────────────
  async assignerRole(
    id: string,
    dto: AssignerRoleDto,
    acteurId: string,
    ip?: string,
  ): Promise<UtilisateurResponseDto> {
    const u = await this.prisma.utilisateurs.findFirst({
      where: { id, deleted_at: null },
    });
    if (!u) throw new NotFoundException('Utilisateur introuvable');

    const role = await this.prisma.roles.findFirst({
      where: { id: dto.role_id },
    });
    if (!role) throw new NotFoundException('Rôle introuvable');

    const updated = await this.prisma.utilisateurs.update({
      where: { id },
      data: { role_id: dto.role_id },
      include: INCLUDE_BRIEF,
    });

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'UTILISATEUR_ROLE_ASSIGNE',
      module: 'utilisateurs',
      enregistrementId: id,
      tableConcernee: 'utilisateurs',
      ip,
    });

    return this.formater(updated);
  }

  // ─── Helpers ────────────────────────────────────────────────────────
  private formater(u: any): UtilisateurResponseDto {
    return {
      id: u.id,
      nom: u.nom,
      prenom: u.prenom,
      email: u.email,
      email_verifie: u.email_verifie,
      statut: u.statut,
      avatar_url: u.avatar_url ?? null,
      langue: u.langue,
      derniere_connexion: u.derniere_connexion ?? null,
      role: u.roles_utilisateurs_role_idToroles ?? null,
      universite: u.universites_utilisateurs_universite_idTouniversites ?? null,
      created_at: u.created_at,
    };
  }
}
