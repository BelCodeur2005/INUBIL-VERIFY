import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreerCleApiDto } from './dto/creer-cle-api.dto';
import { UpdateCleApiDto } from './dto/update-cle-api.dto';
import { CleApiResponseDto } from './dto/cle-api-response.dto';

@Injectable()
export class ClesApiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private toDto(c: any, cleEnClair?: string): CleApiResponseDto {
    return {
      id: c.id,
      universite_id: c.universite_id,
      nom: c.nom,
      prefix: c.prefix,
      permissions: Array.isArray(c.permissions) ? c.permissions : [],
      expiration: c.expiration ?? null,
      est_active: c.est_active,
      ip_whitelist: Array.isArray(c.ip_whitelist) ? c.ip_whitelist : [],
      derniere_utilisation: c.derniere_utilisation ?? null,
      nb_utilisations: Number(c.nb_utilisations ?? 0),
      created_at: c.created_at,
      ...(cleEnClair !== undefined && { cle_en_clair: cleEnClair }),
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

  async lister(acteurId: string): Promise<CleApiResponseDto[]> {
    const universiteId = await this.getActeurUniversiteId(acteurId);
    const cles = await this.prisma.cles_api.findMany({
      where: universiteId ? { universite_id: universiteId } : undefined,
      orderBy: { created_at: 'desc' },
    });
    return cles.map((c) => this.toDto(c));
  }

  async findOne(id: string, acteurId: string): Promise<CleApiResponseDto> {
    const universiteId = await this.getActeurUniversiteId(acteurId);
    const cle = await this.prisma.cles_api.findFirst({ where: { id } });
    if (!cle) throw new NotFoundException(`Clé API ${id} introuvable`);
    this.assertMemeUniversite(cle.universite_id, universiteId);
    return this.toDto(cle);
  }

  async creer(
    dto: CreerCleApiDto,
    acteurId: string,
    ip?: string,
  ): Promise<CleApiResponseDto> {
    const universiteId = await this.getUniversiteActeurObligatoire(acteurId);

    // Générer une clé sécurisée : prefix visible + secret aléatoire
    const secret = randomBytes(32).toString('base64url');
    const prefix = 'inub_' + randomBytes(4).toString('hex');
    const cleEnClair = `${prefix}_${secret}`;
    const cleHachee = createHash('sha256').update(cleEnClair).digest('hex');

    const cle = await this.prisma.cles_api.create({
      data: {
        universite_id: universiteId,
        nom: dto.nom,
        cle_hachee: cleHachee,
        prefix,
        permissions: dto.permissions ?? [],
        expiration: dto.expiration ? new Date(dto.expiration) : null,
        ip_whitelist: dto.ip_whitelist ?? [],
        est_active: true,
        created_by: acteurId,
      },
    });

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'CLE_API_CREER',
      module: 'cles_api',
      tableConcernee: 'cles_api',
      enregistrementId: cle.id,
      ip,
    });

    // La clé en clair est retournée UNE SEULE FOIS
    return this.toDto(cle, cleEnClair);
  }

  async modifier(
    id: string,
    dto: UpdateCleApiDto,
    acteurId: string,
    ip?: string,
  ): Promise<CleApiResponseDto> {
    const universiteId = await this.getActeurUniversiteId(acteurId);
    const cle = await this.prisma.cles_api.findFirst({ where: { id } });
    if (!cle) throw new NotFoundException(`Clé API ${id} introuvable`);
    this.assertMemeUniversite(cle.universite_id, universiteId);

    const updated = await this.prisma.cles_api.update({
      where: { id },
      data: {
        ...(dto.nom !== undefined && { nom: dto.nom }),
        ...(dto.permissions !== undefined && { permissions: dto.permissions }),
        ...(dto.est_active !== undefined && { est_active: dto.est_active }),
        ...(dto.expiration !== undefined && {
          expiration: new Date(dto.expiration),
        }),
        ...(dto.ip_whitelist !== undefined && {
          ip_whitelist: dto.ip_whitelist,
        }),
        updated_at: new Date(),
      },
    });

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'CLE_API_MODIFIER',
      module: 'cles_api',
      tableConcernee: 'cles_api',
      enregistrementId: id,
      ip,
    });

    return this.toDto(updated);
  }

  async revoquer(id: string, acteurId: string, ip?: string): Promise<void> {
    const universiteId = await this.getActeurUniversiteId(acteurId);
    const cle = await this.prisma.cles_api.findFirst({ where: { id } });
    if (!cle) throw new NotFoundException(`Clé API ${id} introuvable`);
    this.assertMemeUniversite(cle.universite_id, universiteId);

    await this.prisma.cles_api.delete({ where: { id } });

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'CLE_API_REVOQUER',
      module: 'cles_api',
      tableConcernee: 'cles_api',
      enregistrementId: id,
      ip,
    });
  }

  /** Valider une clé API entrante (usage futur : middleware d'authentification par clé). */
  async validerCle(
    cleEnClair: string,
  ): Promise<{ universite_id: string; permissions: string[] }> {
    const hash = createHash('sha256').update(cleEnClair).digest('hex');
    const cle = await this.prisma.cles_api.findFirst({
      where: { cle_hachee: hash },
    });

    if (!cle || !cle.est_active)
      throw new UnauthorizedException('Clé API invalide ou révoquée');
    if (cle.expiration && cle.expiration < new Date())
      throw new UnauthorizedException('Clé API expirée');

    await this.prisma.cles_api.update({
      where: { id: cle.id },
      data: {
        derniere_utilisation: new Date(),
        nb_utilisations: { increment: 1 },
      },
    });

    return {
      universite_id: cle.universite_id,
      permissions: Array.isArray(cle.permissions)
        ? (cle.permissions as string[])
        : [],
    };
  }
}
