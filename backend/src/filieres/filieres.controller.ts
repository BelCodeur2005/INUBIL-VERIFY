import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permission } from '../auth/constants/permissions.constant';
import { FilieresService } from './filieres.service';
import { CreerFiliereDto } from './dto/creer-filiere.dto';
import { UpdateFiliereDto } from './dto/update-filiere.dto';
import { FiliereQueryDto } from './dto/filiere-query.dto';
import { FiliereResponseDto } from './dto/filiere-response.dto';

@ApiTags('Filières')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('filieres')
export class FilieresController {
  constructor(private readonly service: FilieresService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.FIL_READ)
  @ApiOperation({
    summary: 'Lister les filières (filtres : universite_id, est_actif)',
    description:
      'Un acteur lié à une université ne voit que les filières de la sienne.',
  })
  @ApiOkResponse({ type: [FiliereResponseDto] })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 403, description: 'Permission fil:read requise.' })
  lister(
    @Query() query: FiliereQueryDto,
    @CurrentUser('id') acteurId: string,
  ): Promise<FiliereResponseDto[]> {
    return this.service.lister(query, acteurId);
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.FIL_READ)
  @ApiOperation({ summary: "Détail d'une filière" })
  @ApiOkResponse({ type: FiliereResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 403, description: 'Accès refusé (autre université).' })
  @ApiResponse({ status: 404, description: 'Filière introuvable.' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') acteurId: string,
  ): Promise<FiliereResponseDto> {
    return this.service.findOne(id, acteurId);
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.FIL_CREATE)
  @ApiOperation({ summary: 'Créer une filière (permission fil:create)' })
  @ApiCreatedResponse({ type: FiliereResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 403, description: 'Permission fil:create requise.' })
  @ApiResponse({
    status: 404,
    description: 'Université introuvable ou non active.',
  })
  @ApiResponse({
    status: 409,
    description: 'Code déjà utilisé pour cette université.',
  })
  creer(
    @Body() dto: CreerFiliereDto,
    @CurrentUser('id') acteurId: string,
    @Req() req: Request,
  ): Promise<FiliereResponseDto> {
    return this.service.creer(dto, acteurId, req.ip);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.FIL_EDIT)
  @ApiOperation({ summary: 'Modifier une filière (permission fil:edit)' })
  @ApiOkResponse({ type: FiliereResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({
    status: 403,
    description: 'Permission fil:edit requise ou accès refusé.',
  })
  @ApiResponse({ status: 404, description: 'Filière introuvable.' })
  @ApiResponse({
    status: 409,
    description: 'Code déjà utilisé pour cette université.',
  })
  modifier(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFiliereDto,
    @CurrentUser('id') acteurId: string,
    @Req() req: Request,
  ): Promise<FiliereResponseDto> {
    return this.service.modifier(id, dto, acteurId, req.ip);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.FIL_DELETE)
  @ApiOperation({
    summary: 'Supprimer une filière (permission fil:delete)',
    description:
      "Suppression physique si aucun document ne l'utilise. Désactivation douce sinon.",
  })
  @ApiNoContentResponse()
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({
    status: 403,
    description: 'Permission fil:delete requise ou accès refusé.',
  })
  @ApiResponse({ status: 404, description: 'Filière introuvable.' })
  supprimer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') acteurId: string,
    @Req() req: Request,
  ): Promise<void> {
    return this.service.supprimer(id, acteurId, req.ip);
  }
}
