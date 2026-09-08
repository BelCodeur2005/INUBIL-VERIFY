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
import { DepartementsService } from './departements.service';
import { CreerDepartementDto } from './dto/creer-departement.dto';
import { UpdateDepartementDto } from './dto/update-departement.dto';
import { DepartementQueryDto } from './dto/departement-query.dto';
import { DepartementResponseDto } from './dto/departement-response.dto';

@ApiTags('Départements')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('departements')
export class DepartementsController {
  constructor(private readonly service: DepartementsService) {}

  @Get()
  @ApiOperation({
    summary: 'Lister les départements (filtres : universite_id, est_actif)',
    description: 'Un acteur lié à une université ne voit que les départements de la sienne.',
  })
  @ApiOkResponse({ type: [DepartementResponseDto] })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  lister(
    @Query() query: DepartementQueryDto,
    @CurrentUser('id') acteurId: string,
  ): Promise<DepartementResponseDto[]> {
    return this.service.lister(query, acteurId);
  }

  @Get(':id')
  @ApiOperation({ summary: "Détail d'un département" })
  @ApiOkResponse({ type: DepartementResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 403, description: 'Accès refusé (autre université).' })
  @ApiResponse({ status: 404, description: 'Département introuvable.' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') acteurId: string,
  ): Promise<DepartementResponseDto> {
    return this.service.findOne(id, acteurId);
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.DEPT_CREATE)
  @ApiOperation({ summary: 'Créer un département (permission dept:create)' })
  @ApiCreatedResponse({ type: DepartementResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 403, description: 'Permission dept:create requise.' })
  @ApiResponse({ status: 404, description: 'Université introuvable ou non active.' })
  @ApiResponse({ status: 409, description: 'Code déjà utilisé pour cette université.' })
  creer(
    @Body() dto: CreerDepartementDto,
    @CurrentUser('id') acteurId: string,
    @Req() req: Request,
  ): Promise<DepartementResponseDto> {
    return this.service.creer(dto, acteurId, req.ip);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.DEPT_EDIT)
  @ApiOperation({ summary: 'Modifier un département (permission dept:edit)' })
  @ApiOkResponse({ type: DepartementResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 403, description: 'Permission dept:edit requise ou accès refusé.' })
  @ApiResponse({ status: 404, description: 'Département introuvable.' })
  @ApiResponse({ status: 409, description: 'Code déjà utilisé pour cette université.' })
  modifier(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDepartementDto,
    @CurrentUser('id') acteurId: string,
    @Req() req: Request,
  ): Promise<DepartementResponseDto> {
    return this.service.modifier(id, dto, acteurId, req.ip);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.DEPT_DELETE)
  @ApiOperation({
    summary: 'Supprimer un département (permission dept:delete)',
    description: 'Suppression physique si aucun étudiant/compte ne lui est rattaché. Désactivation douce sinon.',
  })
  @ApiNoContentResponse()
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 403, description: 'Permission dept:delete requise ou accès refusé.' })
  @ApiResponse({ status: 404, description: 'Département introuvable.' })
  supprimer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') acteurId: string,
    @Req() req: Request,
  ): Promise<void> {
    return this.service.supprimer(id, acteurId, req.ip);
  }
}
