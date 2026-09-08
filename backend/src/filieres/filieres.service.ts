import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreerFiliereDto } from './dto/creer-filiere.dto';
import { UpdateFiliereDto } from './dto/update-filiere.dto';
import { FiliereQueryDto } from './dto/filiere-query.dto';
import { FiliereResponseDto } from './dto/filiere-response.dto';

@Injectable()
export class FilieresService {
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
    if (u?.roles_utilisateurs_role_idToroles?.nom === 'super_admin')
      return null;
    if (!u?.universite_id) {
      throw new ForbiddenException("Vous n'êtes pas associé à une université");
    }
    return u.universite_id;
  }

  private toDto(f: any): FiliereResponseDto {
    return {
      id: f.id,
      code: f.code,
      nom: f.nom,
      universite_id: f.universite_id,
      est_actif: f.est_actif,
      ordre: f.ordre,
      created_at: f.created_at,
      updated_at: f.updated_at,
    };
  }

  async lister(
    query: FiliereQueryDto,
    acteurId: string,
  ): Promise<FiliereResponseDto[]> {
    const acteurUnivId = await this.getActeurUniversiteId(acteurId);

    const where: any = {};

    if (acteurUnivId !== null) {
      where.universite_id = acteurUnivId;
    } else if (query.universite_id) {
      where.universite_id = query.universite_id;
    }

    if (query.est_actif !== undefined) where.est_actif = query.est_actif;

    const filieres = await this.prisma.filieres.findMany({
      where,
      orderBy: [{ ordre: 'asc' }, { nom: 'asc' }],
    });

    return filieres.map((f) => this.toDto(f));
  }

  async findOne(id: string, acteurId: string): Promise<FiliereResponseDto> {
    const acteurUnivId = await this.getActeurUniversiteId(acteurId);

    const filiere = await this.prisma.filieres.findFirst({ where: { id } });
    if (!filiere) throw new NotFoundException(`Filière ${id} introuvable`);

    if (acteurUnivId !== null && filiere.universite_id !== acteurUnivId) {
      throw new ForbiddenException(
        "Accès refusé : filière d'une autre université",
      );
    }

    return this.toDto(filiere);
  }

  async creer(
    dto: CreerFiliereDto,
    acteurId: string,
    ip?: string,
  ): Promise<FiliereResponseDto> {
    const acteurUnivId = await this.getActeurUniversiteId(acteurId);

    if (acteurUnivId !== null && dto.universite_id !== acteurUnivId) {
      throw new ForbiddenException(
        'Vous ne pouvez créer des filières que pour votre propre université',
      );
    }

    const universite = await this.prisma.universites.findFirst({
      where: { id: dto.universite_id, statut: 'active', deleted_at: null },
    });
    if (!universite)
      throw new NotFoundException('Université introuvable ou non active');

    const existant = await this.prisma.filieres.findFirst({
      where: { code: dto.code, universite_id: dto.universite_id },
    });
    if (existant)
      throw new ConflictException(
        `Le code "${dto.code}" est déjà utilisé pour cette université`,
      );

    const filiere = await this.prisma.filieres.create({
      data: {
        code: dto.code,
        nom: dto.nom,
        universite_id: dto.universite_id,
        est_actif: true,
        ordre: dto.ordre ?? 0,
      },
    });

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'FILIERE_CREER',
      module: 'filieres',
      tableConcernee: 'filieres',
      enregistrementId: filiere.id,
      ip,
    });

    return this.toDto(filiere);
  }

  async modifier(
    id: string,
    dto: UpdateFiliereDto,
    acteurId: string,
    ip?: string,
  ): Promise<FiliereResponseDto> {
    const acteurUnivId = await this.getActeurUniversiteId(acteurId);

    const filiere = await this.prisma.filieres.findFirst({ where: { id } });
    if (!filiere) throw new NotFoundException(`Filière ${id} introuvable`);

    if (acteurUnivId !== null && filiere.universite_id !== acteurUnivId) {
      throw new ForbiddenException(
        "Accès refusé : filière d'une autre université",
      );
    }

    if (dto.code) {
      const doublon = await this.prisma.filieres.findFirst({
        where: {
          code: dto.code,
          universite_id: filiere.universite_id,
          id: { not: id },
        },
      });
      if (doublon)
        throw new ConflictException(
          `Le code "${dto.code}" est déjà utilisé pour cette université`,
        );
    }

    const updated = await this.prisma.filieres.update({
      where: { id },
      data: {
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.nom !== undefined && { nom: dto.nom }),
        ...(dto.est_actif !== undefined && { est_actif: dto.est_actif }),
        ...(dto.ordre !== undefined && { ordre: dto.ordre }),
      },
    });

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'FILIERE_MODIFIER',
      module: 'filieres',
      tableConcernee: 'filieres',
      enregistrementId: id,
      ip,
    });

    return this.toDto(updated);
  }

  async supprimer(id: string, acteurId: string, ip?: string): Promise<void> {
    const acteurUnivId = await this.getActeurUniversiteId(acteurId);

    const filiere = await this.prisma.filieres.findFirst({ where: { id } });
    if (!filiere) throw new NotFoundException(`Filière ${id} introuvable`);

    if (acteurUnivId !== null && filiere.universite_id !== acteurUnivId) {
      throw new ForbiddenException(
        "Accès refusé : filière d'une autre université",
      );
    }

    const enUsage = await this.prisma.documents.count({
      where: { filiere_id: id },
    });
    if (enUsage > 0) {
      await this.prisma.filieres.update({
        where: { id },
        data: { est_actif: false },
      });
    } else {
      await this.prisma.filieres.delete({ where: { id } });
    }

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'FILIERE_SUPPRIMER',
      module: 'filieres',
      tableConcernee: 'filieres',
      enregistrementId: id,
      ip,
    });
  }
}
