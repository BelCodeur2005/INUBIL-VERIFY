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

  async lireJournal(query: AuditQueryDto): Promise<AuditListDto> {
    const page  = query.page  ?? 1;
    const limit = query.limit ?? 50;
    const skip  = (page - 1) * limit;

    const where: Prisma.journal_auditWhereInput = {};

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
