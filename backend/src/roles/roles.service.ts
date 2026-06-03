import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { AssignerPermissionsDto } from './dto/assigner-permissions.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { RoleResponseDto } from './dto/role-response.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async lister(universiteId?: string): Promise<RoleResponseDto[]> {
    const roles = await this.prisma.roles.findMany({
      where: universiteId ? { universite_id: universiteId } : undefined,
      include: {
        role_permissions: {
          include: { permissions: true },
        },
      },
      orderBy: [{ est_systeme: 'desc' }, { nom: 'asc' }],
    });

    return roles.map((r) => this.formater(r));
  }

  async findOne(id: string): Promise<RoleResponseDto> {
    const role = await this.prisma.roles.findUnique({
      where: { id },
      include: {
        role_permissions: {
          include: { permissions: true },
        },
      },
    });
    if (!role) throw new NotFoundException('Rôle introuvable.');
    return this.formater(role);
  }

  async creer(dto: CreateRoleDto, acteurId: string, ip?: string): Promise<RoleResponseDto> {
    const existant = await this.prisma.roles.findFirst({
      where: { nom: dto.nom, universite_id: dto.universite_id ?? null },
    });
    if (existant) {
      throw new ConflictException('Un rôle avec ce nom existe déjà pour cette université.');
    }

    const role = await this.prisma.roles.create({
      data: {
        nom: dto.nom,
        description: dto.description,
        universite_id: dto.universite_id,
        est_systeme: false,
        created_by: acteurId,
      },
      include: { role_permissions: { include: { permissions: true } } },
    });

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'ROLE_CREE',
      module: 'roles',
      enregistrementId: role.id,
      tableConcernee: 'roles',
      ip,
    });

    return this.formater(role);
  }

  async modifier(id: string, dto: UpdateRoleDto, acteurId: string, ip?: string): Promise<RoleResponseDto> {
    const role = await this.prisma.roles.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Rôle introuvable.');

    if (dto.nom && dto.nom !== role.nom) {
      const conflit = await this.prisma.roles.findFirst({
        where: { nom: dto.nom, universite_id: role.universite_id, id: { not: id } },
      });
      if (conflit) throw new ConflictException('Un rôle avec ce nom existe déjà pour cette université.');
    }

    const mis_a_jour = await this.prisma.roles.update({
      where: { id },
      data: {
        ...(dto.nom !== undefined && { nom: dto.nom }),
        ...(dto.description !== undefined && { description: dto.description }),
        updated_at: new Date(),
      },
      include: { role_permissions: { include: { permissions: true } } },
    });

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'ROLE_MODIFIE',
      module: 'roles',
      enregistrementId: id,
      tableConcernee: 'roles',
      ip,
    });

    return this.formater(mis_a_jour);
  }

  async supprimer(id: string, acteurId: string, ip?: string): Promise<void> {
    const role = await this.prisma.roles.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Rôle introuvable.');

    if (role.est_systeme) {
      throw new ForbiddenException('Les rôles système ne peuvent pas être supprimés.');
    }

    const utilisateursLies = await this.prisma.utilisateurs.count({ where: { role_id: id } });
    if (utilisateursLies > 0) {
      throw new ConflictException(
        `Ce rôle est assigné à ${utilisateursLies} utilisateur(s). Réassignez-les avant de supprimer le rôle.`,
      );
    }

    await this.prisma.roles.delete({ where: { id } });

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'ROLE_SUPPRIME',
      module: 'roles',
      enregistrementId: id,
      tableConcernee: 'roles',
      ip,
    });
  }

  async assignerPermissions(
    id: string,
    dto: AssignerPermissionsDto,
    acteurId: string,
    ip?: string,
  ): Promise<RoleResponseDto> {
    const role = await this.prisma.roles.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Rôle introuvable.');

    if (dto.permission_ids.length > 0) {
      const permissionsExistantes = await this.prisma.permissions.findMany({
        where: { id: { in: dto.permission_ids } },
        select: { id: true },
      });

      if (permissionsExistantes.length !== dto.permission_ids.length) {
        const trouvees = new Set(permissionsExistantes.map((p) => p.id));
        const inconnues = dto.permission_ids.filter((pid) => !trouvees.has(pid));
        throw new BadRequestException(
          `Permission(s) inconnue(s) : ${inconnues.join(', ')}`,
        );
      }
    }

    await this.prisma.$transaction([
      this.prisma.role_permissions.deleteMany({ where: { role_id: id } }),
      ...(dto.permission_ids.length > 0
        ? [
            this.prisma.role_permissions.createMany({
              data: dto.permission_ids.map((pid) => ({
                role_id: id,
                permission_id: pid,
                accordee_par: acteurId,
              })),
            }),
          ]
        : []),
    ]);

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'ROLE_PERMISSIONS_MISES_A_JOUR',
      module: 'roles',
      enregistrementId: id,
      tableConcernee: 'role_permissions',
      ip,
    });

    return this.findOne(id);
  }

  private formater(role: any): RoleResponseDto {
    const { role_permissions, ...rest } = role;
    return {
      ...rest,
      permissions: role_permissions?.map((rp: any) => rp.permissions) ?? [],
    };
  }
}
