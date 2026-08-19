import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreerMentionDto } from './dto/creer-mention.dto';
import { UpdateMentionDto } from './dto/update-mention.dto';
import { MentionQueryDto } from './dto/mention-query.dto';
import { MentionResponseDto } from './dto/mention-response.dto';

@Injectable()
export class MentionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Universite de l'acteur, ou null UNIQUEMENT si son role est explicitement
   * "super_admin" (verifie par nom de role, jamais devine depuis l'absence
   * d'universite). Tout autre utilisateur sans universite est refuse — ne pas
   * inferer un statut privilegie a partir d'un champ nullable.
   */
  private async getActeurUniversiteId(acteurId: string): Promise<string | null> {
    const u = await this.prisma.utilisateurs.findFirst({
      where: { id: acteurId },
      select: {
        universite_id: true,
        roles_utilisateurs_role_idToroles: { select: { nom: true } },
      },
    });
    if (u?.roles_utilisateurs_role_idToroles?.nom === 'super_admin') return null;
    if (!u?.universite_id) {
      throw new ForbiddenException("Vous n'êtes pas associé à une université");
    }
    return u.universite_id;
  }

  private toDto(m: any): MentionResponseDto {
    return {
      id: m.id,
      code: m.code,
      nom: m.nom,
      note_min: m.note_min ? Number(m.note_min) : null,
      note_max: m.note_max ? Number(m.note_max) : null,
      universite_id: m.universite_id,
      est_actif: m.est_actif,
      ordre: m.ordre,
      created_at: m.created_at,
    };
  }

  async lister(query: MentionQueryDto, acteurId: string): Promise<MentionResponseDto[]> {
    const acteurUnivId = await this.getActeurUniversiteId(acteurId);

    const where: any = {};

    if (acteurUnivId !== null) {
      where.universite_id = acteurUnivId;
    } else if (query.universite_id) {
      where.universite_id = query.universite_id;
    }

    if (query.est_actif !== undefined) where.est_actif = query.est_actif;

    const mentions = await this.prisma.mentions_document.findMany({
      where,
      orderBy: [{ ordre: 'asc' }, { note_min: 'desc' }],
    });

    return mentions.map((m) => this.toDto(m));
  }

  async findOne(id: string, acteurId: string): Promise<MentionResponseDto> {
    const acteurUnivId = await this.getActeurUniversiteId(acteurId);

    const mention = await this.prisma.mentions_document.findFirst({ where: { id } });
    if (!mention) throw new NotFoundException(`Mention ${id} introuvable`);

    if (acteurUnivId !== null && mention.universite_id !== acteurUnivId) {
      throw new ForbiddenException('Accès refusé : mention d\'une autre université');
    }

    return this.toDto(mention);
  }

  async creer(dto: CreerMentionDto, acteurId: string, ip?: string): Promise<MentionResponseDto> {
    const acteurUnivId = await this.getActeurUniversiteId(acteurId);

    if (acteurUnivId !== null && dto.universite_id !== acteurUnivId) {
      throw new ForbiddenException('Vous ne pouvez créer des mentions que pour votre propre université');
    }

    const universite = await this.prisma.universites.findFirst({
      where: { id: dto.universite_id, statut: 'active', deleted_at: null },
    });
    if (!universite) throw new NotFoundException('Université introuvable ou non active');

    const existant = await this.prisma.mentions_document.findFirst({
      where: { code: dto.code, universite_id: dto.universite_id },
    });
    if (existant) throw new ConflictException(`Le code "${dto.code}" est déjà utilisé pour cette université`);

    const mention = await this.prisma.mentions_document.create({
      data: {
        code: dto.code,
        nom: dto.nom,
        note_min: dto.note_min ?? null,
        note_max: dto.note_max ?? null,
        universite_id: dto.universite_id,
        est_actif: true,
        ordre: dto.ordre ?? 0,
      },
    });

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'MENTION_CREER',
      module: 'mentions',
      tableConcernee: 'mentions_document',
      enregistrementId: mention.id,
      ip,
    });

    return this.toDto(mention);
  }

  async modifier(id: string, dto: UpdateMentionDto, acteurId: string, ip?: string): Promise<MentionResponseDto> {
    const acteurUnivId = await this.getActeurUniversiteId(acteurId);

    const mention = await this.prisma.mentions_document.findFirst({ where: { id } });
    if (!mention) throw new NotFoundException(`Mention ${id} introuvable`);

    if (acteurUnivId !== null && mention.universite_id !== acteurUnivId) {
      throw new ForbiddenException('Accès refusé : mention d\'une autre université');
    }

    if (dto.code) {
      const doublon = await this.prisma.mentions_document.findFirst({
        where: { code: dto.code, universite_id: mention.universite_id, id: { not: id } },
      });
      if (doublon) throw new ConflictException(`Le code "${dto.code}" est déjà utilisé pour cette université`);
    }

    const updated = await this.prisma.mentions_document.update({
      where: { id },
      data: {
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.nom !== undefined && { nom: dto.nom }),
        ...(dto.note_min !== undefined && { note_min: dto.note_min }),
        ...(dto.note_max !== undefined && { note_max: dto.note_max }),
        ...(dto.est_actif !== undefined && { est_actif: dto.est_actif }),
        ...(dto.ordre !== undefined && { ordre: dto.ordre }),
      },
    });

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'MENTION_MODIFIER',
      module: 'mentions',
      tableConcernee: 'mentions_document',
      enregistrementId: id,
      ip,
    });

    return this.toDto(updated);
  }

  async supprimer(id: string, acteurId: string, ip?: string): Promise<void> {
    const acteurUnivId = await this.getActeurUniversiteId(acteurId);

    const mention = await this.prisma.mentions_document.findFirst({ where: { id } });
    if (!mention) throw new NotFoundException(`Mention ${id} introuvable`);

    if (acteurUnivId !== null && mention.universite_id !== acteurUnivId) {
      throw new ForbiddenException('Accès refusé : mention d\'une autre université');
    }

    const enUsage = await this.prisma.documents.count({ where: { mention_id: id } });
    if (enUsage > 0) {
      await this.prisma.mentions_document.update({ where: { id }, data: { est_actif: false } });
    } else {
      await this.prisma.mentions_document.delete({ where: { id } });
    }

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'MENTION_SUPPRIMER',
      module: 'mentions',
      tableConcernee: 'mentions_document',
      enregistrementId: id,
      ip,
    });
  }
}
