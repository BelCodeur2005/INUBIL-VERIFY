import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { statut_universite } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { ApprouverUniversiteDto } from './dto/approuver-universite.dto';
import { ChangerStatutDto } from './dto/changer-statut.dto';
import { CreateUniversiteDto } from './dto/create-universite.dto';
import { UniversiteListResponseDto, UniversiteResponseDto } from './dto/universite-response.dto';
import { UniversiteQueryDto } from './dto/universite-query.dto';
import { UpdateUniversiteDto } from './dto/update-universite.dto';

@Injectable()
export class UniversitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async lister(query: UniversiteQueryDto): Promise<UniversiteListResponseDto> {
    const { page = 1, limit = 20, statut, type, pays, search } = query;
    const skip = (page - 1) * limit;

    const where = {
      deleted_at: null,
      ...(statut && { statut }),
      ...(type && { type }),
      ...(pays && { pays: { contains: pays, mode: 'insensitive' as const } }),
      ...(search && {
        OR: [
          { nom: { contains: search, mode: 'insensitive' as const } },
          { nom_court: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.universites.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.universites.count({ where }),
    ]);

    return {
      data: data as UniversiteResponseDto[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<UniversiteResponseDto> {
    const universite = await this.prisma.universites.findFirst({
      where: { id, deleted_at: null },
    });
    if (!universite) throw new NotFoundException('Université introuvable.');
    return universite as UniversiteResponseDto;
  }

  async creer(dto: CreateUniversiteDto, acteurId: string, ip?: string): Promise<UniversiteResponseDto> {
    const universite = await this.prisma.universites.create({
      data: {
        nom: dto.nom,
        nom_court: dto.nom_court,
        pays: dto.pays ?? 'Cameroun',
        ville: dto.ville,
        adresse: dto.adresse,
        type: dto.type,
        logo_url: dto.logo_url,
        site_web: dto.site_web,
        email_contact: dto.email_contact,
        telephone: dto.telephone,
        description: dto.description,
        statut: statut_universite.en_attente,
        created_by: acteurId,
      },
    });

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'UNIVERSITE_CREEE',
      module: 'universites',
      enregistrementId: universite.id,
      tableConcernee: 'universites',
      ip,
    });

    return universite as UniversiteResponseDto;
  }

  async modifier(
    id: string,
    dto: UpdateUniversiteDto,
    acteurId: string,
    ip?: string,
  ): Promise<UniversiteResponseDto> {
    await this.findOne(id);

    const universite = await this.prisma.universites.update({
      where: { id },
      data: {
        ...(dto.nom !== undefined && { nom: dto.nom }),
        ...(dto.nom_court !== undefined && { nom_court: dto.nom_court }),
        ...(dto.pays !== undefined && { pays: dto.pays }),
        ...(dto.ville !== undefined && { ville: dto.ville }),
        ...(dto.adresse !== undefined && { adresse: dto.adresse }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.logo_url !== undefined && { logo_url: dto.logo_url }),
        ...(dto.site_web !== undefined && { site_web: dto.site_web }),
        ...(dto.email_contact !== undefined && { email_contact: dto.email_contact }),
        ...(dto.telephone !== undefined && { telephone: dto.telephone }),
        ...(dto.description !== undefined && { description: dto.description }),
        updated_at: new Date(),
      },
    });

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'UNIVERSITE_MODIFIEE',
      module: 'universites',
      enregistrementId: id,
      tableConcernee: 'universites',
      ip,
    });

    return universite as UniversiteResponseDto;
  }

  async supprimer(id: string, acteurId: string, ip?: string): Promise<void> {
    const universite = await this.findOne(id);

    if (universite.statut === statut_universite.active) {
      throw new ConflictException(
        'Impossible de supprimer une université active. Suspendez-la d\'abord.',
      );
    }

    await this.prisma.universites.update({
      where: { id },
      data: { deleted_at: new Date(), updated_at: new Date() },
    });

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'UNIVERSITE_SUPPRIMEE',
      module: 'universites',
      enregistrementId: id,
      tableConcernee: 'universites',
      ip,
    });
  }

  async approuver(id: string, acteurId: string, ip?: string): Promise<UniversiteResponseDto> {
    const universite = await this.findOne(id);

    if (universite.statut !== statut_universite.en_attente) {
      throw new ConflictException(
        `Seules les universités en_attente peuvent être approuvées (statut actuel : ${universite.statut}).`,
      );
    }

    const mise_a_jour = await this.prisma.universites.update({
      where: { id },
      data: {
        statut: statut_universite.approuvee,
        approuvee_par: acteurId,
        approuvee_le: new Date(),
        raison_rejet: null,
        updated_at: new Date(),
      },
    });

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'UNIVERSITE_APPROUVEE',
      module: 'universites',
      enregistrementId: id,
      tableConcernee: 'universites',
      ip,
    });

    return mise_a_jour as UniversiteResponseDto;
  }

  async activer(id: string, acteurId: string, ip?: string): Promise<UniversiteResponseDto> {
    const universite = await this.findOne(id);

    if (universite.statut !== statut_universite.approuvee) {
      throw new ConflictException(
        `Seules les universités approuvées peuvent être activées (statut actuel : ${universite.statut}).`,
      );
    }

    const mise_a_jour = await this.prisma.universites.update({
      where: { id },
      data: { statut: statut_universite.active, updated_at: new Date() },
    });

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'UNIVERSITE_ACTIVEE',
      module: 'universites',
      enregistrementId: id,
      tableConcernee: 'universites',
      ip,
    });

    return mise_a_jour as UniversiteResponseDto;
  }

  async suspendre(
    id: string,
    dto: ChangerStatutDto,
    acteurId: string,
    ip?: string,
  ): Promise<UniversiteResponseDto> {
    const universite = await this.findOne(id);

    if (universite.statut !== statut_universite.active) {
      throw new ConflictException(
        `Seules les universités actives peuvent être suspendues (statut actuel : ${universite.statut}).`,
      );
    }

    const mise_a_jour = await this.prisma.universites.update({
      where: { id },
      data: { statut: statut_universite.suspendue, updated_at: new Date() },
    });

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'UNIVERSITE_SUSPENDUE',
      module: 'universites',
      enregistrementId: id,
      tableConcernee: 'universites',
      ip,
    });

    return mise_a_jour as UniversiteResponseDto;
  }

  async rejeter(
    id: string,
    dto: ApprouverUniversiteDto,
    acteurId: string,
    ip?: string,
  ): Promise<UniversiteResponseDto> {
    const universite = await this.findOne(id);

    if (universite.statut !== statut_universite.en_attente) {
      throw new ConflictException(
        `Seules les universités en_attente peuvent être rejetées (statut actuel : ${universite.statut}).`,
      );
    }

    if (!dto.raison_rejet) {
      throw new BadRequestException('La raison du rejet est obligatoire.');
    }

    const mise_a_jour = await this.prisma.universites.update({
      where: { id },
      data: {
        statut: statut_universite.rejetee,
        raison_rejet: dto.raison_rejet,
        updated_at: new Date(),
      },
    });

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'UNIVERSITE_REJETEE',
      module: 'universites',
      enregistrementId: id,
      tableConcernee: 'universites',
      ip,
    });

    return mise_a_jour as UniversiteResponseDto;
  }
}
