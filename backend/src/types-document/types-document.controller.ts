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
import { TypesDocumentService } from './types-document.service';
import { CreerTypeDocumentDto } from './dto/creer-type-document.dto';
import { UpdateTypeDocumentDto } from './dto/update-type-document.dto';
import { TypeDocumentQueryDto } from './dto/type-document-query.dto';
import { TypeDocumentResponseDto } from './dto/type-document-response.dto';

@ApiTags('Types de document')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('types-document')
export class TypesDocumentController {
  constructor(private readonly service: TypesDocumentService) {}

  @Get()
  @ApiOperation({
    summary: 'Lister les types de document (filtres : universite_id, categorie, est_actif)',
    description: 'Un acteur lié à une université ne voit que les types de la sienne. Le super-admin peut filtrer par universite_id.',
  })
  @ApiOkResponse({ type: [TypeDocumentResponseDto] })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  lister(
    @Query() query: TypeDocumentQueryDto,
    @CurrentUser('id') acteurId: string,
  ): Promise<TypeDocumentResponseDto[]> {
    return this.service.lister(query, acteurId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un type de document' })
  @ApiOkResponse({ type: TypeDocumentResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 403, description: 'Accès refusé (autre université).' })
  @ApiResponse({ status: 404, description: 'Type de document introuvable.' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') acteurId: string,
  ): Promise<TypeDocumentResponseDto> {
    return this.service.findOne(id, acteurId);
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.DOC_CREATE)
  @ApiOperation({ summary: 'Créer un type de document (permission doc:create)' })
  @ApiCreatedResponse({ type: TypeDocumentResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 403, description: 'Permission doc:create requise.' })
  @ApiResponse({ status: 404, description: 'Université introuvable ou non active.' })
  @ApiResponse({ status: 409, description: 'Code déjà utilisé pour cette université.' })
  creer(
    @Body() dto: CreerTypeDocumentDto,
    @CurrentUser('id') acteurId: string,
    @Req() req: Request,
  ): Promise<TypeDocumentResponseDto> {
    return this.service.creer(dto, acteurId, req.ip);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.DOC_CREATE)
  @ApiOperation({ summary: 'Modifier un type de document (permission doc:create)' })
  @ApiOkResponse({ type: TypeDocumentResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 403, description: 'Permission doc:create requise ou accès refusé.' })
  @ApiResponse({ status: 404, description: 'Type de document introuvable.' })
  @ApiResponse({ status: 409, description: 'Code déjà utilisé pour cette université.' })
  modifier(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTypeDocumentDto,
    @CurrentUser('id') acteurId: string,
    @Req() req: Request,
  ): Promise<TypeDocumentResponseDto> {
    return this.service.modifier(id, dto, acteurId, req.ip);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.DOC_CREATE)
  @ApiOperation({
    summary: 'Supprimer un type de document (permission doc:create)',
    description: 'Suppression physique si aucun document ne l\'utilise. Désactivation douce sinon.',
  })
  @ApiNoContentResponse()
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 403, description: 'Permission doc:create requise ou accès refusé.' })
  @ApiResponse({ status: 404, description: 'Type de document introuvable.' })
  supprimer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') acteurId: string,
    @Req() req: Request,
  ): Promise<void> {
    return this.service.supprimer(id, acteurId, req.ip);
  }
}
