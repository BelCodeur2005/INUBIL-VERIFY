import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permission } from '../auth/constants/permissions.constant';
import { ConfigurationsService } from './configurations.service';
import { UpsertConfigurationDto } from './dto/upsert-configuration.dto';
import { ConfigurationResponseDto } from './dto/configuration-response.dto';

@ApiTags('Configurations')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('configurations')
export class ConfigurationsController {
  constructor(private readonly service: ConfigurationsService) {}

  @Get()
  @RequirePermissions(Permission.CONFIG_READ)
  @ApiOperation({ summary: 'Lister tous les paramètres système (super_admin)' })
  @ApiOkResponse({ type: [ConfigurationResponseDto] })
  lister(): Promise<ConfigurationResponseDto[]> {
    return this.service.lister();
  }

  @Get(':cle')
  @RequirePermissions(Permission.CONFIG_READ)
  @ApiOperation({ summary: 'Lire un paramètre par sa clé' })
  @ApiParam({ name: 'cle', example: 'partage_duree_jours' })
  @ApiOkResponse({ type: ConfigurationResponseDto })
  @ApiResponse({ status: 404, description: 'Configuration introuvable.' })
  findOne(@Param('cle') cle: string): Promise<ConfigurationResponseDto> {
    return this.service.findOne(cle);
  }

  @Put(':cle')
  @RequirePermissions(Permission.CONFIG_EDIT)
  @ApiOperation({ summary: 'Créer ou mettre à jour un paramètre (upsert)' })
  @ApiParam({ name: 'cle', example: 'partage_duree_jours' })
  @ApiOkResponse({ type: ConfigurationResponseDto })
  upsert(
    @Param('cle') cle: string,
    @Body() dto: UpsertConfigurationDto,
    @CurrentUser('id') acteurId: string,
    @Req() req: Request,
  ): Promise<ConfigurationResponseDto> {
    return this.service.upsert(cle, dto, acteurId, req.ip);
  }

  @Delete(':cle')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.CONFIG_EDIT)
  @ApiOperation({ summary: 'Supprimer un paramètre système' })
  @ApiNoContentResponse()
  @ApiResponse({ status: 404, description: 'Configuration introuvable.' })
  supprimer(
    @Param('cle') cle: string,
    @CurrentUser('id') acteurId: string,
    @Req() req: Request,
  ): Promise<void> {
    return this.service.supprimer(cle, acteurId, req.ip);
  }
}
