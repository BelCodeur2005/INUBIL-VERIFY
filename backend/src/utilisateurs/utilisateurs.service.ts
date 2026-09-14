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
import { AssignerDepartementsDto } from './dto/assigner-departements.dto';
import { ChangerStatutUtilisateurDto } from './dto/changer-statut-utilisateur.dto';
import { UtilisateurQueryDto } from './dto/utilisateur-query.dto';
import {
  UtilisateurListResponseDto,
  UtilisateurResponseDto,
} from './dto/utilisateur-response.dto';

/** Champs Prisma a inclure systematiquement pour construire UtilisateurResponseDto. */
const INCLUDE_BRIEF = {
  roles_utilisateurs_role_idToroles: { select: { id: true, nom: true } },
  universites_utilisateurs_universite_idTouniversites: {
    select: { id: true, nom: true },
  },
  departements: { select: { id: true, nom: true } },
} as const;

@Injectable()
export class UtilisateursService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Universite de l'acteur, ou null UNIQUEMENT si son role est explicitement
   * "super_admin" ou "admin_istama" (supervision inter-universites) — verifie
   * par nom de role, jamais devine depuis l'absence d'universite. Tout autre
   * utilisateur sans universite est refuse.
   */
  private async getActeurUniversiteId(
    acteurId: string,
  ): Promise<string | null> {
    const u = await this.prisma.utilisateurs.findFirst({
      where: { id: acteurId },
      select: {
        universite_id: true,
        roles_utilisateurs_role_idToroles: { select: { nom: true } },
      },
    });
    const nomRole = u?.roles_utilisateurs_role_idToroles?.nom;
    if (nomRole === 'super_admin' || nomRole === 'admin_istama') return null;
    if (!u?.universite_id) {
      throw new ForbiddenException("Vous n'êtes pas associé à une université");
    }
    return u.universite_id;
  }

  /**
   * Distinct de getActeurUniversiteId : celui-ci traite super_admin ET
   * admin_istama comme "global" (universite_id null), alors qu'ici on a besoin
   * de distinguer precisement super_admin seul (cf. Fix SEC-5).
   */
  private async estSuperAdmin(acteurId: string): Promise<boolean> {
    const u = await this.prisma.utilisateurs.findFirst({
      where: { id: acteurId },
      select: { roles_utilisateurs_role_idToroles: { select: { nom: true } } },
    });
    return u?.roles_utilisateurs_role_idToroles?.nom === 'super_admin';
  }

  // ─── LISTE ──────────────────────────────────────────────────────────
  async lister(
    query: UtilisateurQueryDto,
    acteurId: string,
  ): Promise<UtilisateurListResponseDto> {
    const acteurUnivId = await this.getActeurUniversiteId(acteurId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.utilisateursWhereInput = { deleted_at: null };

    // Scoping multi-tenant : un responsable_universite ne voit que les comptes
    // de sa propre universite, quoi que le query param demande.
    if (acteurUnivId !== null) {
      where.universite_id = acteurUnivId;
    } else if (query.universite_id) {
      where.universite_id = query.universite_id;
    }

    if (query.statut) where.statut = query.statut;
    if (query.role_id) where.role_id = query.role_id;
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
  async findOne(id: string, acteurId: string): Promise<UtilisateurResponseDto> {
    const acteurUnivId = await this.getActeurUniversiteId(acteurId);
    const u = await this.prisma.utilisateurs.findFirst({
      where: { id, deleted_at: null },
      include: INCLUDE_BRIEF,
    });
    if (!u) throw new NotFoundException('Utilisateur introuvable');
    if (acteurUnivId !== null && u.universite_id !== acteurUnivId) {
      throw new ForbiddenException(
        "Accès refusé : utilisateur d'une autre université",
      );
    }
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

    const acteurUnivId = await this.getActeurUniversiteId(acteurId);
    const u = await this.prisma.utilisateurs.findFirst({
      where: { id, deleted_at: null },
    });
    if (!u) throw new NotFoundException('Utilisateur introuvable');
    if (acteurUnivId !== null && u.universite_id !== acteurUnivId) {
      throw new ForbiddenException(
        "Accès refusé : utilisateur d'une autre université",
      );
    }

    // Le statut en_attente_email est geré par le flux email - pas modifiable manuellement.
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
    const acteurUnivId = await this.getActeurUniversiteId(acteurId);
    const u = await this.prisma.utilisateurs.findFirst({
      where: { id, deleted_at: null },
    });
    if (!u) throw new NotFoundException('Utilisateur introuvable');
    if (acteurUnivId !== null && u.universite_id !== acteurUnivId) {
      throw new ForbiddenException(
        "Accès refusé : utilisateur d'une autre université",
      );
    }

    const role = await this.prisma.roles.findFirst({
      where: { id: dto.role_id },
    });
    if (!role) throw new NotFoundException('Rôle introuvable');

    // Fix SEC-5 : seul un super_admin peut assigner le role super_admin a un
    // utilisateur existant. admin_istama et responsable_universite ont tous
    // les deux la permission user:assign_role mais ne doivent pas pouvoir
    // s'auto-promouvoir (ou promouvoir un tiers) a ce niveau via ce endpoint —
    // meme faille que Fix SEC-4 sur invitations.service.ts, ici exploitable
    // directement sur un compte deja existant, sans passer par une invitation.
    if (role.nom === 'super_admin' && !(await this.estSuperAdmin(acteurId))) {
      throw new ForbiddenException(
        'Seul un super administrateur peut assigner le rôle super_admin',
      );
    }

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

  // ─── ASSIGNER DEPARTEMENTS (scope chef de departement / scolarite) ──
  async assignerDepartements(
    id: string,
    dto: AssignerDepartementsDto,
    acteurId: string,
    ip?: string,
  ): Promise<UtilisateurResponseDto> {
    const acteurUnivId = await this.getActeurUniversiteId(acteurId);
    const u = await this.prisma.utilisateurs.findFirst({
      where: { id, deleted_at: null },
    });
    if (!u) throw new NotFoundException('Utilisateur introuvable');
    if (acteurUnivId !== null && u.universite_id !== acteurUnivId) {
      throw new ForbiddenException(
        "Accès refusé : utilisateur d'une autre université",
      );
    }

    if (dto.departement_ids.length > 0) {
      const count = await this.prisma.departements.count({
        where: {
          id: { in: dto.departement_ids },
          universite_id: u.universite_id ?? undefined,
        },
      });
      if (count !== dto.departement_ids.length) {
        throw new BadRequestException(
          "Un ou plusieurs départements sont introuvables ou n'appartiennent pas à l'université de cet utilisateur",
        );
      }
    }

    const updated = await this.prisma.utilisateurs.update({
      where: { id },
      data: {
        departements: {
          set: dto.departement_ids.map((depId) => ({ id: depId })),
        },
      },
      include: INCLUDE_BRIEF,
    });

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'UTILISATEUR_DEPARTEMENTS_ASSIGNES',
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
      departements: u.departements ?? [],
      created_at: u.created_at,
    };
  }
}
