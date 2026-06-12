import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreerTypeDocumentDto } from './dto/creer-type-document.dto';
import { UpdateTypeDocumentDto } from './dto/update-type-document.dto';
import { TypeDocumentQueryDto } from './dto/type-document-query.dto';
import { TypeDocumentResponseDto } from './dto/type-document-response.dto';

@Injectable()
export class TypesDocumentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async getActeurUniversiteId(acteurId: string): Promise<string | null> {
    const u = await this.prisma.utilisateurs.findFirst({
      where: { id: acteurId },
      select: { universite_id: true },
    });
    return u?.universite_id ?? null;
  }

  private toDto(t: any): TypeDocumentResponseDto {
    return {
      id: t.id,
      code: t.code,
      nom: t.nom,
      nom_court: t.nom_court,
      categorie: t.categorie,
      niveau_bac_plus: t.niveau_bac_plus,
      pays: t.pays,
      universite_id: t.universite_id,
      a_matieres: t.a_matieres,
      est_partage: t.est_partage,
      est_actif: t.est_actif,
      ordre: t.ordre,
      created_at: t.created_at,
      updated_at: t.updated_at,
    };
  }

  async lister(query: TypeDocumentQueryDto, acteurId: string): Promise<TypeDocumentResponseDto[]> {
    const acteurUnivId = await this.getActeurUniversiteId(acteurId);

    const where: any = {};

    // Multi-tenant : un acteur lié à une université ne voit que les siens
    if (acteurUnivId !== null) {
      where.universite_id = acteurUnivId;
    } else if (query.universite_id) {
      where.universite_id = query.universite_id;
    }

    if (query.categorie) where.categorie = query.categorie;
    if (query.est_actif !== undefined) where.est_actif = query.est_actif;

    const types = await this.prisma.types_document.findMany({
      where,
      orderBy: [{ ordre: 'asc' }, { nom: 'asc' }],
    });

    return types.map((t) => this.toDto(t));
  }

  async findOne(id: string, acteurId: string): Promise<TypeDocumentResponseDto> {
    const acteurUnivId = await this.getActeurUniversiteId(acteurId);

    const type = await this.prisma.types_document.findFirst({ where: { id } });
    if (!type) throw new NotFoundException(`Type de document ${id} introuvable`);

    if (acteurUnivId !== null && type.universite_id !== acteurUnivId) {
      throw new ForbiddenException('Accès refusé : type d\'une autre université');
    }

    return this.toDto(type);
  }

  async creer(dto: CreerTypeDocumentDto, acteurId: string, ip?: string): Promise<TypeDocumentResponseDto> {
    const acteurUnivId = await this.getActeurUniversiteId(acteurId);

    if (acteurUnivId !== null && dto.universite_id !== acteurUnivId) {
      throw new ForbiddenException('Vous ne pouvez créer des types que pour votre propre université');
    }

    const universite = await this.prisma.universites.findFirst({
      where: { id: dto.universite_id, statut: 'active', deleted_at: null },
    });
    if (!universite) throw new NotFoundException('Université introuvable ou non active');

    const code = dto.code.toUpperCase();

    const existant = await this.prisma.types_document.findFirst({
      where: { code, universite_id: dto.universite_id },
    });
    if (existant) throw new ConflictException(`Le code "${code}" est déjà utilisé pour cette université`);

    const type = await this.prisma.types_document.create({
      data: {
        code,
        nom: dto.nom,
        nom_court: dto.nom_court ?? null,
        categorie: dto.categorie as any,
        niveau_bac_plus: dto.niveau_bac_plus ?? null,
        pays: dto.pays ?? 'Cameroun',
        universite_id: dto.universite_id,
        a_matieres: dto.a_matieres ?? false,
        est_partage: dto.est_partage ?? false,
        est_actif: true,
        ordre: dto.ordre ?? 0,
      },
    });

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'TYPE_DOCUMENT_CREER',
      module: 'types_document',
      tableConcernee: 'types_document',
      enregistrementId: type.id,
      ip,
    });

    return this.toDto(type);
  }

  async modifier(id: string, dto: UpdateTypeDocumentDto, acteurId: string, ip?: string): Promise<TypeDocumentResponseDto> {
    const acteurUnivId = await this.getActeurUniversiteId(acteurId);

    const type = await this.prisma.types_document.findFirst({ where: { id } });
    if (!type) throw new NotFoundException(`Type de document ${id} introuvable`);

    if (acteurUnivId !== null && type.universite_id !== acteurUnivId) {
      throw new ForbiddenException('Accès refusé : type d\'une autre université');
    }

    if (dto.code) {
      const code = dto.code.toUpperCase();
      const doublon = await this.prisma.types_document.findFirst({
        where: { code, universite_id: type.universite_id, id: { not: id } },
      });
      if (doublon) throw new ConflictException(`Le code "${code}" est déjà utilisé pour cette université`);
      dto.code = code;
    }

    const updated = await this.prisma.types_document.update({
      where: { id },
      data: {
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.nom !== undefined && { nom: dto.nom }),
        ...(dto.nom_court !== undefined && { nom_court: dto.nom_court }),
        ...(dto.categorie !== undefined && { categorie: dto.categorie as any }),
        ...(dto.niveau_bac_plus !== undefined && { niveau_bac_plus: dto.niveau_bac_plus }),
        ...(dto.pays !== undefined && { pays: dto.pays }),
        ...(dto.a_matieres !== undefined && { a_matieres: dto.a_matieres }),
        ...(dto.est_partage !== undefined && { est_partage: dto.est_partage }),
        ...(dto.est_actif !== undefined && { est_actif: dto.est_actif }),
        ...(dto.ordre !== undefined && { ordre: dto.ordre }),
      },
    });

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'TYPE_DOCUMENT_MODIFIER',
      module: 'types_document',
      tableConcernee: 'types_document',
      enregistrementId: id,
      ip,
    });

    return this.toDto(updated);
  }

  async supprimer(id: string, acteurId: string, ip?: string): Promise<void> {
    const acteurUnivId = await this.getActeurUniversiteId(acteurId);

    const type = await this.prisma.types_document.findFirst({ where: { id } });
    if (!type) throw new NotFoundException(`Type de document ${id} introuvable`);

    if (acteurUnivId !== null && type.universite_id !== acteurUnivId) {
      throw new ForbiddenException('Accès refusé : type d\'une autre université');
    }

    const enUsage = await this.prisma.documents.count({ where: { type_document_id: id } });
    if (enUsage > 0) {
      // Désactivation douce plutôt que suppression physique si des documents l'utilisent
      await this.prisma.types_document.update({ where: { id }, data: { est_actif: false } });
    } else {
      await this.prisma.types_document.delete({ where: { id } });
    }

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'TYPE_DOCUMENT_SUPPRIMER',
      module: 'types_document',
      tableConcernee: 'types_document',
      enregistrementId: id,
      ip,
    });
  }
}
