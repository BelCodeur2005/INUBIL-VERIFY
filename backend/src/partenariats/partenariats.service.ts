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

  private async getUniversiteActeur(acteurId: string): Promise<string> {
    const u = await this.prisma.utilisateurs.findFirst({
      where: { id: acteurId },
      select: { universite_id: true },
    });
    if (!u?.universite_id)
      throw new ForbiddenException("Vous n'êtes pas associé à une université");
    return u.universite_id;
  }

  async lister(acteurId: string): Promise<PartenariatResponseDto[]> {
    const universiteId = await this.getUniversiteActeur(acteurId);
    const partenariats = await this.prisma.partenariats_universite.findMany({
      where: { universite_id: universiteId },
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
    const universiteId = await this.getUniversiteActeur(acteurId);
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
    if (partenariat.universite_id !== universiteId)
      throw new ForbiddenException('Accès refusé');
    return this.toDto(partenariat);
  }

  async creer(
    dto: CreerPartenariatDto,
    acteurId: string,
    ip?: string,
  ): Promise<PartenariatResponseDto> {
    const universiteId = await this.getUniversiteActeur(acteurId);

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
    const universiteId = await this.getUniversiteActeur(acteurId);
    const partenariat = await this.prisma.partenariats_universite.findFirst({
      where: { id },
    });
    if (!partenariat)
      throw new NotFoundException(`Partenariat ${id} introuvable`);
    if (partenariat.universite_id !== universiteId)
      throw new ForbiddenException('Accès refusé');

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
    const universiteId = await this.getUniversiteActeur(acteurId);
    const partenariat = await this.prisma.partenariats_universite.findFirst({
      where: { id },
    });
    if (!partenariat)
      throw new NotFoundException(`Partenariat ${id} introuvable`);
    if (partenariat.universite_id !== universiteId)
      throw new ForbiddenException('Accès refusé');

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
