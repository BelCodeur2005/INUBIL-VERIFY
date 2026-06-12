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
import { EtudiantsAdminService } from './etudiants-admin.service';
import { CreerEtudiantAdminDto } from './dto/creer-etudiant-admin.dto';
import { UpdateEtudiantAdminDto } from './dto/update-etudiant-admin.dto';
import { EtudiantAdminQueryDto } from './dto/etudiant-admin-query.dto';
import {
  EtudiantAdminListeDto,
  EtudiantAdminResponseDto,
} from './dto/etudiant-admin-response.dto';

@ApiTags('Étudiants (admin)')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/etudiants')
export class EtudiantsAdminController {
  constructor(private readonly service: EtudiantsAdminService) {}

  @Get()
  @RequirePermissions(Permission.STUDENT_READ)
  @ApiOperation({
    summary: 'Lister les étudiants avec filtres et pagination (permission student:read)',
    description: 'Un acteur lié à une université ne voit que ses étudiants. Le super-admin peut filtrer par universite_id.',
  })
  @ApiOkResponse({ type: EtudiantAdminListeDto })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 403, description: 'Permission student:read requise.' })
  lister(
    @Query() query: EtudiantAdminQueryDto,
    @CurrentUser('id') acteurId: string,
  ): Promise<EtudiantAdminListeDto> {
    return this.service.lister(query, acteurId);
  }

  @Get(':id')
  @RequirePermissions(Permission.STUDENT_READ)
  @ApiOperation({ summary: 'Détail d\'un étudiant (permission student:read)' })
  @ApiOkResponse({ type: EtudiantAdminResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 403, description: 'Permission student:read requise ou accès refusé.' })
  @ApiResponse({ status: 404, description: 'Étudiant introuvable.' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') acteurId: string,
  ): Promise<EtudiantAdminResponseDto> {
    return this.service.findOne(id, acteurId);
  }

  @Post()
  @RequirePermissions(Permission.DOC_CREATE)
  @ApiOperation({
    summary: 'Créer un dossier étudiant (permission doc:create)',
    description: 'Enregistre un étudiant dans la base. Prérequis avant de saisir un diplôme pour cet étudiant.',
  })
  @ApiCreatedResponse({ type: EtudiantAdminResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 403, description: 'Permission doc:create requise.' })
  @ApiResponse({ status: 404, description: 'Université introuvable ou non active.' })
  @ApiResponse({ status: 409, description: 'Matricule déjà utilisé.' })
  creer(
    @Body() dto: CreerEtudiantAdminDto,
    @CurrentUser('id') acteurId: string,
    @Req() req: Request,
  ): Promise<EtudiantAdminResponseDto> {
    return this.service.creer(dto, acteurId, req.ip);
  }

  @Patch(':id')
  @RequirePermissions(Permission.DOC_CREATE)
  @ApiOperation({ summary: 'Modifier un dossier étudiant (permission doc:create)' })
  @ApiOkResponse({ type: EtudiantAdminResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 403, description: 'Permission doc:create requise ou accès refusé.' })
  @ApiResponse({ status: 404, description: 'Étudiant introuvable.' })
  @ApiResponse({ status: 409, description: 'Matricule déjà utilisé.' })
  modifier(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEtudiantAdminDto,
    @CurrentUser('id') acteurId: string,
    @Req() req: Request,
  ): Promise<EtudiantAdminResponseDto> {
    return this.service.modifier(id, dto, acteurId, req.ip);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.DOC_CREATE)
  @ApiOperation({
    summary: 'Supprimer (soft delete) un dossier étudiant (permission doc:create)',
    description: 'Bloqué si l\'étudiant possède des documents émis.',
  })
  @ApiNoContentResponse()
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 403, description: 'Permission doc:create requise ou accès refusé.' })
  @ApiResponse({ status: 404, description: 'Étudiant introuvable.' })
  @ApiResponse({ status: 409, description: 'Étudiant possède des documents — suppression impossible.' })
  supprimer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') acteurId: string,
    @Req() req: Request,
  ): Promise<void> {
    return this.service.supprimer(id, acteurId, req.ip);
  }
}
