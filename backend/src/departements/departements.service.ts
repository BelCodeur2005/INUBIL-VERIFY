import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreerDepartementDto } from './dto/creer-departement.dto';
import { UpdateDepartementDto } from './dto/update-departement.dto';
import { DepartementQueryDto } from './dto/departement-query.dto';
import { DepartementResponseDto } from './dto/departement-response.dto';

@Injectable()
export class DepartementsService {
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

  private toDto(d: any): DepartementResponseDto {
    return {
      id: d.id,
      code: d.code,
      nom: d.nom,
      universite_id: d.universite_id,
      est_actif: d.est_actif,
      ordre: d.ordre,
      created_at: d.created_at,
      updated_at: d.updated_at,
    };
  }

  async lister(query: DepartementQueryDto, acteurId: string): Promise<DepartementResponseDto[]> {
    const acteurUnivId = await this.getActeurUniversiteId(acteurId);

    const where: any = {};

    if (acteurUnivId !== null) {
      where.universite_id = acteurUnivId;
    } else if (query.universite_id) {
      where.universite_id = query.universite_id;
    }

    if (query.est_actif !== undefined) where.est_actif = query.est_actif;

    const departements = await this.prisma.departements.findMany({
      where,
      orderBy: [{ ordre: 'asc' }, { nom: 'asc' }],
    });

    return departements.map((d) => this.toDto(d));
  }

  async findOne(id: string, acteurId: string): Promise<DepartementResponseDto> {
    const acteurUnivId = await this.getActeurUniversiteId(acteurId);

    const departement = await this.prisma.departements.findFirst({ where: { id } });
    if (!departement) throw new NotFoundException(`Département ${id} introuvable`);

    if (acteurUnivId !== null && departement.universite_id !== acteurUnivId) {
      throw new ForbiddenException('Accès refusé : département d\'une autre université');
    }

    return this.toDto(departement);
  }

  async creer(dto: CreerDepartementDto, acteurId: string, ip?: string): Promise<DepartementResponseDto> {
    const acteurUnivId = await this.getActeurUniversiteId(acteurId);

    if (acteurUnivId !== null && dto.universite_id !== acteurUnivId) {
      throw new ForbiddenException('Vous ne pouvez créer des départements que pour votre propre université');
    }

    const universite = await this.prisma.universites.findFirst({
      where: { id: dto.universite_id, statut: 'active', deleted_at: null },
    });
    if (!universite) throw new NotFoundException('Université introuvable ou non active');

    const existant = await this.prisma.departements.findFirst({
      where: { code: dto.code, universite_id: dto.universite_id },
    });
    if (existant) throw new ConflictException(`Le code "${dto.code}" est déjà utilisé pour cette université`);

    const departement = await this.prisma.departements.create({
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
      action: 'DEPARTEMENT_CREER',
      module: 'departements',
      tableConcernee: 'departements',
      enregistrementId: departement.id,
      ip,
    });

    return this.toDto(departement);
  }

  async modifier(id: string, dto: UpdateDepartementDto, acteurId: string, ip?: string): Promise<DepartementResponseDto> {
    const acteurUnivId = await this.getActeurUniversiteId(acteurId);

    const departement = await this.prisma.departements.findFirst({ where: { id } });
    if (!departement) throw new NotFoundException(`Département ${id} introuvable`);

    if (acteurUnivId !== null && departement.universite_id !== acteurUnivId) {
      throw new ForbiddenException('Accès refusé : département d\'une autre université');
    }

    if (dto.code) {
      const doublon = await this.prisma.departements.findFirst({
        where: { code: dto.code, universite_id: departement.universite_id, id: { not: id } },
      });
      if (doublon) throw new ConflictException(`Le code "${dto.code}" est déjà utilisé pour cette université`);
    }

    const updated = await this.prisma.departements.update({
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
      action: 'DEPARTEMENT_MODIFIER',
      module: 'departements',
      tableConcernee: 'departements',
      enregistrementId: id,
      ip,
    });

    return this.toDto(updated);
  }

  async supprimer(id: string, acteurId: string, ip?: string): Promise<void> {
    const acteurUnivId = await this.getActeurUniversiteId(acteurId);

    const departement = await this.prisma.departements.findFirst({ where: { id } });
    if (!departement) throw new NotFoundException(`Département ${id} introuvable`);

    if (acteurUnivId !== null && departement.universite_id !== acteurUnivId) {
      throw new ForbiddenException('Accès refusé : département d\'une autre université');
    }

    const [etudiantsRattaches, comptesRattaches] = await Promise.all([
      this.prisma.etudiants.count({ where: { departement_id: id, deleted_at: null } }),
      this.prisma.utilisateurs.count({ where: { departements: { some: { id } }, deleted_at: null } }),
    ]);

    if (etudiantsRattaches > 0 || comptesRattaches > 0) {
      await this.prisma.departements.update({ where: { id }, data: { est_actif: false } });
    } else {
      await this.prisma.departements.delete({ where: { id } });
    }

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'DEPARTEMENT_SUPPRIMER',
      module: 'departements',
      tableConcernee: 'departements',
      enregistrementId: id,
      ip,
    });
  }
}
