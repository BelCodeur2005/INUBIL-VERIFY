import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditQueryDto } from './dto/audit-query.dto';
import { AuditEntryDto, AuditListDto } from './dto/audit-response.dto';

@Injectable()
export class AdminAuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ─── Journal d'audit ────────────────────────────────────────────────────────

  /**
   * Universite de l'acteur, ou null UNIQUEMENT si son role est explicitement
   * "super_admin" ou "admin_istama" (supervision inter-universites) — verifie
   * par nom de role, jamais devine depuis l'absence d'universite.
   */
  private async getActeurUniversiteId(acteurId: string): Promise<string | null> {
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

  async lireJournal(query: AuditQueryDto, acteurId: string): Promise<AuditListDto> {
    const acteurUnivId = await this.getActeurUniversiteId(acteurId);
    const page  = query.page  ?? 1;
    const limit = query.limit ?? 50;
    const skip  = (page - 1) * limit;

    const where: Prisma.journal_auditWhereInput = {};

    // Scoping multi-tenant : un responsable_universite ne voit que les entrees
    // dont l'auteur appartient a sa propre universite (les entrees sans auteur
    // trace, ou dont l'auteur est admin_istama/super_admin, restent invisibles —
    // meme logique que partout ailleurs dans l'app : scope par l'acteur, pas par
    // l'entite affectee).
    if (acteurUnivId !== null) {
      where.utilisateurs = { universite_id: acteurUnivId };
    }

    if (query.utilisateur_id)        where.utilisateur_id   = query.utilisateur_id;
    if (query.action)                where.action            = { contains: query.action, mode: 'insensitive' };
    if (query.module)                where.module            = { contains: query.module, mode: 'insensitive' };
    if (query.date_debut || query.date_fin) {
      where.created_at = {};
      if (query.date_debut) where.created_at.gte = new Date(query.date_debut);
      if (query.date_fin)   where.created_at.lte = new Date(query.date_fin);
    }

    const [entries, total] = await Promise.all([
      this.prisma.journal_audit.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.journal_audit.count({ where }),
    ]);

    return {
      data: entries.map((e) => ({
        id:               e.id,
        utilisateur_id:   e.utilisateur_id ?? null,
        nom_utilisateur:  e.nom_utilisateur ?? null,
        action:           e.action,
        module:           e.module,
        table_concernee:  e.table_concernee ?? null,
        enregistrement_id: e.enregistrement_id ?? null,
        ip_address:       e.ip_address ?? null,
        user_agent:       e.user_agent ?? null,
        created_at:       e.created_at,
      } satisfies AuditEntryDto)),
      total,
      page,
      limit,
    };
  }

  // ─── Gestion utilisateurs admin ─────────────────────────────────────────────

  async activerUtilisateur(id: string, acteurId: string, ip?: string) {
    return this.changerStatutUtilisateur(id, 'actif', acteurId, ip);
  }

  async desactiverUtilisateur(id: string, acteurId: string, ip?: string) {
    return this.changerStatutUtilisateur(id, 'suspendu', acteurId, ip);
  }

  private async changerStatutUtilisateur(
    id: string,
    nouveauStatut: 'actif' | 'suspendu',
    acteurId: string,
    ip?: string,
  ) {
    if (id === acteurId) {
      throw new ForbiddenException('Vous ne pouvez pas modifier votre propre statut');
    }

    const u = await this.prisma.utilisateurs.findFirst({
      where: { id, deleted_at: null },
      include: {
        roles_utilisateurs_role_idToroles:                    { select: { id: true, nom: true } },
        universites_utilisateurs_universite_idTouniversites:  { select: { id: true, nom: true } },
      },
    });

    if (!u) throw new NotFoundException('Utilisateur introuvable');

    const updated = await this.prisma.utilisateurs.update({
      where: { id },
      data: { statut: nouveauStatut as any },
      include: {
        roles_utilisateurs_role_idToroles:                    { select: { id: true, nom: true } },
        universites_utilisateurs_universite_idTouniversites:  { select: { id: true, nom: true } },
      },
    });

    await this.audit.log({
      utilisateurId: acteurId,
      action:        nouveauStatut === 'actif' ? 'ADMIN_UTILISATEUR_ACTIVE' : 'ADMIN_UTILISATEUR_DESACTIVE',
      module:        'admin',
      tableConcernee: 'utilisateurs',
      enregistrementId: id,
      ip,
    });

    return {
      id:                 updated.id,
      nom:                updated.nom,
      prenom:             updated.prenom,
      email:              updated.email,
      statut:             updated.statut,
      role:               (updated as any).roles_utilisateurs_role_idToroles ?? null,
      universite:         (updated as any).universites_utilisateurs_universite_idTouniversites ?? null,
      derniere_connexion: updated.derniere_connexion ?? null,
      created_at:         updated.created_at,
    };
  }
}
