import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  ParseUUIDPipe,
  Patch,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permission } from '../auth/constants/permissions.constant';
import { AssignerRoleDto } from './dto/assigner-role.dto';
import { AssignerDepartementsDto } from './dto/assigner-departements.dto';
import { ChangerStatutUtilisateurDto } from './dto/changer-statut-utilisateur.dto';
import { UtilisateurQueryDto } from './dto/utilisateur-query.dto';
import {
  UtilisateurListResponseDto,
  UtilisateurResponseDto,
} from './dto/utilisateur-response.dto';
import { UtilisateursService } from './utilisateurs.service';

@ApiTags('Utilisateurs')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('utilisateurs')
export class UtilisateursController {
  constructor(private readonly service: UtilisateursService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.USER_READ)
  @ApiOperation({
    summary: 'Liste paginée des utilisateurs (filtres : statut, role_id, universite_id, search)',
    description: 'Un acteur lié à une université ne voit que les comptes de la sienne.',
  })
  @ApiOkResponse({ type: UtilisateurListResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 403, description: 'Permission user:read requise.' })
  lister(
    @Query() query: UtilisateurQueryDto,
    @CurrentUser('id') acteurId: string,
  ): Promise<UtilisateurListResponseDto> {
    return this.service.lister(query, acteurId);
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.USER_READ)
  @ApiOperation({ summary: "Détail d'un utilisateur" })
  @ApiOkResponse({ type: UtilisateurResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 403, description: 'Permission user:read requise.' })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable.' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') acteurId: string,
  ): Promise<UtilisateurResponseDto> {
    return this.service.findOne(id, acteurId);
  }

  @Patch(':id/statut')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.USER_EDIT)
  @ApiOperation({
    summary: 'Changer le statut d\'un utilisateur (actif / inactif / suspendu)',
  })
  @ApiOkResponse({ type: UtilisateurResponseDto })
  @ApiResponse({ status: 400, description: 'Statut en_attente_email non modifiable manuellement.' })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 403, description: 'Permission user:edit requise ou auto-modification.' })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable.' })
  changerStatut(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangerStatutUtilisateurDto,
    @CurrentUser('id') acteurId: string,
    @Req() req: Request,
  ): Promise<UtilisateurResponseDto> {
    return this.service.changerStatut(id, dto, acteurId, req.ip);
  }

  @Put(':id/role')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.USER_ASSIGN_ROLE)
  @ApiOperation({ summary: 'Assigner un rôle à un utilisateur' })
  @ApiOkResponse({ type: UtilisateurResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 403, description: 'Permission user:assign_role requise.' })
  @ApiResponse({ status: 404, description: 'Utilisateur ou rôle introuvable.' })
  assignerRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignerRoleDto,
    @CurrentUser('id') acteurId: string,
    @Req() req: Request,
  ): Promise<UtilisateurResponseDto> {
    return this.service.assignerRole(id, dto, acteurId, req.ip);
  }

  @Put(':id/departements')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.DEPT_EDIT)
  @ApiOperation({
    summary: 'Assigner un ou plusieurs départements à un utilisateur (scope chef de département / scolarité)',
    description:
      'Remplace la liste des départements associés. Liste vide = aucune restriction (compte "scolarité").',
  })
  @ApiOkResponse({ type: UtilisateurResponseDto })
  @ApiResponse({ status: 400, description: 'Département(s) introuvable(s) pour l\'université de cet utilisateur.' })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 403, description: 'Permission dept:edit requise.' })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable.' })
  assignerDepartements(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignerDepartementsDto,
    @CurrentUser('id') acteurId: string,
    @Req() req: Request,
  ): Promise<UtilisateurResponseDto> {
    return this.service.assignerDepartements(id, dto, acteurId, req.ip);
  }
}
