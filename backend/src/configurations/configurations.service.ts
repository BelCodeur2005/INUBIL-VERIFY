import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UpsertConfigurationDto } from './dto/upsert-configuration.dto';
import { ConfigurationResponseDto } from './dto/configuration-response.dto';

@Injectable()
export class ConfigurationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private toDto(c: any): ConfigurationResponseDto {
    return {
      id: c.id,
      cle: c.cle,
      valeur: c.valeur,
      type: c.type,
      description: c.description ?? null,
      modifiable_par: c.modifiable_par,
      updated_at: c.updated_at,
    };
  }

  async lister(): Promise<ConfigurationResponseDto[]> {
    const configs = await this.prisma.configurations.findMany({
      orderBy: { cle: 'asc' },
    });
    return configs.map((c) => this.toDto(c));
  }

  async findOne(cle: string): Promise<ConfigurationResponseDto> {
    const config = await this.prisma.configurations.findFirst({
      where: { cle },
    });
    if (!config)
      throw new NotFoundException(`Configuration "${cle}" introuvable`);
    return this.toDto(config);
  }

  /** Lire la valeur brute d'une configuration (usage interne par d'autres services). */
  async get(cle: string, defaut?: string): Promise<string | undefined> {
    const config = await this.prisma.configurations.findFirst({
      where: { cle },
    });
    return config?.valeur ?? defaut;
  }

  async upsert(
    cle: string,
    dto: UpsertConfigurationDto,
    acteurId: string,
    ip?: string,
  ): Promise<ConfigurationResponseDto> {
    const avant = await this.prisma.configurations.findFirst({
      where: { cle },
    });

    const config = await this.prisma.configurations.upsert({
      where: { cle },
      create: {
        cle,
        valeur: dto.valeur,
        type: dto.type ?? 'string',
        description: dto.description ?? null,
        modifiable_par: 'super_admin',
        updated_by: acteurId,
      },
      update: {
        valeur: dto.valeur,
        type: dto.type ?? avant?.type ?? 'string',
        description: dto.description ?? avant?.description,
        updated_by: acteurId,
        updated_at: new Date(),
      },
    });

    await this.audit.log({
      utilisateurId: acteurId,
      action: avant ? 'CONFIG_MODIFIER' : 'CONFIG_CREER',
      module: 'configurations',
      tableConcernee: 'configurations',
      enregistrementId: config.id,
      ip,
    });

    return this.toDto(config);
  }

  async supprimer(cle: string, acteurId: string, ip?: string): Promise<void> {
    const config = await this.prisma.configurations.findFirst({
      where: { cle },
    });
    if (!config)
      throw new NotFoundException(`Configuration "${cle}" introuvable`);

    await this.prisma.configurations.delete({ where: { cle } });

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'CONFIG_SUPPRIMER',
      module: 'configurations',
      tableConcernee: 'configurations',
      enregistrementId: config.id,
      ip,
    });
  }
}
