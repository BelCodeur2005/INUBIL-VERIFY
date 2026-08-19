import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreerPartenariatDto } from './dto/creer-partenariat.dto';
import { UpdatePartenariatDto } from './dto/update-partenariat.dto';
import { PartenariatResponseDto } from './dto/partenariat-response.dto';

@Injectable()
export class PartenariatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private toDto(p: any): PartenariatResponseDto {
    return {
      id: p.id,
      universite_id: p.universite_id,
      universite_liee_id: p.universite_liee_id,
      universite_liee_nom:
        p.universites_partenariats_universite_universite_liee_idTouniversites
          ?.nom,
      type_partenariat: p.type_partenariat,
      date_debut: p.date_debut ?? null,
      date_fin: p.date_fin ?? null,
      description: p.description ?? null,
      document_url: p.document_url ?? null,
      statut: p.statut,
      created_at: p.created_at,
    };
  }

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

  /** Universite obligatoire pour creer une ressource rattachee a une universite precise. */
  private async getUniversiteActeurObligatoire(acteurId: string): Promise<string> {
    const universiteId = await this.getActeurUniversiteId(acteurId);
    if (!universiteId)
      throw new ForbiddenException(
        "Super-admin non rattaché à une université — impossible de déterminer où créer cette ressource",
      );
    return universiteId;
  }

  private assertMemeUniversite(
    ressourceUniversiteId: string,
    acteurUniversiteId: string | null,
  ): void {
    if (acteurUniversiteId !== null && ressourceUniversiteId !== acteurUniversiteId) {
      throw new ForbiddenException('Accès refusé');
    }
  }

  async lister(acteurId: string): Promise<PartenariatResponseDto[]> {
    const universiteId = await this.getActeurUniversiteId(acteurId);
    const partenariats = await this.prisma.partenariats_universite.findMany({
      where: universiteId ? { universite_id: universiteId } : undefined,
      include: {
        universites_partenariats_universite_universite_liee_idTouniversites: {
          select: { nom: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });
    return partenariats.map((p) => this.toDto(p));
  }

  async findOne(id: string, acteurId: string): Promise<PartenariatResponseDto> {
    const universiteId = await this.getActeurUniversiteId(acteurId);
    const partenariat = await this.prisma.partenariats_universite.findFirst({
      where: { id },
      include: {
        universites_partenariats_universite_universite_liee_idTouniversites: {
          select: { nom: true },
        },
      },
    });
    if (!partenariat)
      throw new NotFoundException(`Partenariat ${id} introuvable`);
    this.assertMemeUniversite(partenariat.universite_id, universiteId);
    return this.toDto(partenariat);
  }

  async creer(
    dto: CreerPartenariatDto,
    acteurId: string,
    ip?: string,
  ): Promise<PartenariatResponseDto> {
    const universiteId = await this.getUniversiteActeurObligatoire(acteurId);

    if (dto.universite_liee_id === universiteId) {
      throw new ConflictException(
        "Une université ne peut pas être partenaire d'elle-même",
      );
    }

    const liee = await this.prisma.universites.findFirst({
      where: { id: dto.universite_liee_id, deleted_at: null },
    });
    if (!liee)
      throw new NotFoundException(
        `Université partenaire ${dto.universite_liee_id} introuvable`,
      );

    const doublon = await this.prisma.partenariats_universite.findFirst({
      where: {
        universite_id: universiteId,
        universite_liee_id: dto.universite_liee_id,
        type_partenariat: dto.type_partenariat,
      },
    });
    if (doublon) throw new ConflictException('Ce partenariat existe déjà');

    const partenariat = await this.prisma.partenariats_universite.create({
      data: {
        universite_id: universiteId,
        universite_liee_id: dto.universite_liee_id,
        type_partenariat: dto.type_partenariat,
        date_debut: dto.date_debut ? new Date(dto.date_debut) : null,
        date_fin: dto.date_fin ? new Date(dto.date_fin) : null,
        description: dto.description ?? null,
        document_url: dto.document_url ?? null,
        created_by: acteurId,
      },
      include: {
        universites_partenariats_universite_universite_liee_idTouniversites: {
          select: { nom: true },
        },
      },
    });

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'PARTENARIAT_CREER',
      module: 'partenariats',
      tableConcernee: 'partenariats_universite',
      enregistrementId: partenariat.id,
      ip,
    });

    return this.toDto(partenariat);
  }

  async modifier(
    id: string,
    dto: UpdatePartenariatDto,
    acteurId: string,
    ip?: string,
  ): Promise<PartenariatResponseDto> {
    const universiteId = await this.getActeurUniversiteId(acteurId);
    const partenariat = await this.prisma.partenariats_universite.findFirst({
      where: { id },
    });
    if (!partenariat)
      throw new NotFoundException(`Partenariat ${id} introuvable`);
    this.assertMemeUniversite(partenariat.universite_id, universiteId);

    const updated = await this.prisma.partenariats_universite.update({
      where: { id },
      data: {
        ...(dto.type_partenariat !== undefined && {
          type_partenariat: dto.type_partenariat,
        }),
        ...(dto.date_debut !== undefined && {
          date_debut: new Date(dto.date_debut),
        }),
        ...(dto.date_fin !== undefined && { date_fin: new Date(dto.date_fin) }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.document_url !== undefined && {
          document_url: dto.document_url,
        }),
        ...(dto.statut !== undefined && { statut: dto.statut }),
        updated_at: new Date(),
      },
      include: {
        universites_partenariats_universite_universite_liee_idTouniversites: {
          select: { nom: true },
        },
      },
    });

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'PARTENARIAT_MODIFIER',
      module: 'partenariats',
      tableConcernee: 'partenariats_universite',
      enregistrementId: id,
      ip,
    });

    return this.toDto(updated);
  }

  async supprimer(id: string, acteurId: string, ip?: string): Promise<void> {
    const universiteId = await this.getActeurUniversiteId(acteurId);
    const partenariat = await this.prisma.partenariats_universite.findFirst({
      where: { id },
    });
    if (!partenariat)
      throw new NotFoundException(`Partenariat ${id} introuvable`);
    this.assertMemeUniversite(partenariat.universite_id, universiteId);

    await this.prisma.partenariats_universite.delete({ where: { id } });

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'PARTENARIAT_SUPPRIMER',
      module: 'partenariats',
      tableConcernee: 'partenariats_universite',
      enregistrementId: id,
      ip,
    });
  }
}
