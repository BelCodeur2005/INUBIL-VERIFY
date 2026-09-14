import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, statut_universite } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ApprouverUniversiteDto } from './dto/approuver-universite.dto';
import { ChangerStatutDto } from './dto/changer-statut.dto';
import { CreateUniversiteDto } from './dto/create-universite.dto';
import {
  UniversiteListResponseDto,
  UniversiteResponseDto,
} from './dto/universite-response.dto';
import { UniversiteQueryDto } from './dto/universite-query.dto';
import { UpdateUniversiteDto } from './dto/update-universite.dto';

@Injectable()
export class UniversitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
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
    return this.avecCouleurPrimaire(universite);
  }

  /** Extrait couleur_primaire du JSON config pour l'exposer comme champ direct dans la reponse. */
  private avecCouleurPrimaire(
    universite: Record<string, unknown>,
  ): UniversiteResponseDto {
    const config = (universite.config ?? {}) as { couleur_primaire?: string };
    return {
      ...(universite as unknown as UniversiteResponseDto),
      couleur_primaire: config.couleur_primaire ?? null,
    };
  }

  async creer(
    dto: CreateUniversiteDto,
    acteurId: string,
    ip?: string,
  ): Promise<UniversiteResponseDto> {
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
    const actuelle = await this.findOne(id);

    let config: Record<string, unknown> | undefined;
    if (dto.couleur_primaire !== undefined) {
      const configActuel = ((actuelle as { config?: unknown }).config ??
        {}) as Record<string, unknown>;
      config = { ...configActuel, couleur_primaire: dto.couleur_primaire };
    }

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
        ...(dto.email_contact !== undefined && {
          email_contact: dto.email_contact,
        }),
        ...(dto.telephone !== undefined && { telephone: dto.telephone }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(config !== undefined && {
          config: config as Prisma.InputJsonValue,
        }),
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

    return this.avecCouleurPrimaire(universite);
  }

  /**
   * Upload le logo sur le stockage public (distinct du bucket prive des documents —
   * un logo est affiche en continu, un lien pre-signe de 15 min le casserait) et
   * enregistre l'URL publique resultante dans logo_url. Necessite STORAGE_PUBLIC_BASE_URL
   * (voir StorageService.getPublicUrl).
   */
  async uploaderLogo(
    id: string,
    fichier: Express.Multer.File,
    acteurId: string,
    ip?: string,
  ): Promise<UniversiteResponseDto> {
    await this.findOne(id);

    // Extension deduite du mimetype valide (deja filtre par le controller), jamais du
    // nom de fichier fourni par le client — evite un nom de fichier trompeur/malicieux.
    const extensionParMimetype: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/webp': 'webp',
    };
    const extension = extensionParMimetype[fichier.mimetype] ?? 'png';
    const cle = `logos/${id}-${Date.now()}.${extension}`;

    const resultat = await this.storage.uploadFile(
      fichier.buffer,
      cle,
      fichier.mimetype,
    );
    if (!resultat) {
      throw new BadRequestException(
        'Stockage non configuré (AWS_S3_BUCKET / identifiants) — le logo ne peut pas être téléversé.',
      );
    }

    const urlPublique = this.storage.getPublicUrl(cle);
    if (!urlPublique) {
      throw new BadRequestException(
        'URL publique non configurée (STORAGE_PUBLIC_BASE_URL) — le bucket doit être accessible publiquement pour héberger un logo affiché en continu.',
      );
    }

    const universite = await this.prisma.universites.update({
      where: { id },
      data: { logo_url: urlPublique, updated_at: new Date() },
    });

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'UNIVERSITE_LOGO_MODIFIE',
      module: 'universites',
      enregistrementId: id,
      tableConcernee: 'universites',
      ip,
    });

    return this.avecCouleurPrimaire(universite);
  }

  async supprimer(id: string, acteurId: string, ip?: string): Promise<void> {
    const universite = await this.findOne(id);

    if (universite.statut === statut_universite.active) {
      throw new ConflictException(
        "Impossible de supprimer une université active. Suspendez-la d'abord.",
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

  async approuver(
    id: string,
    acteurId: string,
    ip?: string,
  ): Promise<UniversiteResponseDto> {
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

  async activer(
    id: string,
    acteurId: string,
    ip?: string,
  ): Promise<UniversiteResponseDto> {
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
