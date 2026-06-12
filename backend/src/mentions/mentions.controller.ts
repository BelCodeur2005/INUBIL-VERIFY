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
import { MentionsService } from './mentions.service';
import { CreerMentionDto } from './dto/creer-mention.dto';
import { UpdateMentionDto } from './dto/update-mention.dto';
import { MentionQueryDto } from './dto/mention-query.dto';
import { MentionResponseDto } from './dto/mention-response.dto';

@ApiTags('Mentions')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('mentions')
export class MentionsController {
  constructor(private readonly service: MentionsService) {}

  @Get()
  @ApiOperation({
    summary: 'Lister les mentions (filtres : universite_id, est_actif)',
    description: 'Un acteur lié à une université ne voit que les mentions de la sienne.',
  })
  @ApiOkResponse({ type: [MentionResponseDto] })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  lister(
    @Query() query: MentionQueryDto,
    @CurrentUser('id') acteurId: string,
  ): Promise<MentionResponseDto[]> {
    return this.service.lister(query, acteurId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'une mention' })
  @ApiOkResponse({ type: MentionResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 403, description: 'Accès refusé (autre université).' })
  @ApiResponse({ status: 404, description: 'Mention introuvable.' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') acteurId: string,
  ): Promise<MentionResponseDto> {
    return this.service.findOne(id, acteurId);
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.DOC_CREATE)
  @ApiOperation({ summary: 'Créer une mention (permission doc:create)' })
  @ApiCreatedResponse({ type: MentionResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 403, description: 'Permission doc:create requise.' })
  @ApiResponse({ status: 404, description: 'Université introuvable ou non active.' })
  @ApiResponse({ status: 409, description: 'Code déjà utilisé pour cette université.' })
  creer(
    @Body() dto: CreerMentionDto,
    @CurrentUser('id') acteurId: string,
    @Req() req: Request,
  ): Promise<MentionResponseDto> {
    return this.service.creer(dto, acteurId, req.ip);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.DOC_CREATE)
  @ApiOperation({ summary: 'Modifier une mention (permission doc:create)' })
  @ApiOkResponse({ type: MentionResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 403, description: 'Permission doc:create requise ou accès refusé.' })
  @ApiResponse({ status: 404, description: 'Mention introuvable.' })
  @ApiResponse({ status: 409, description: 'Code déjà utilisé pour cette université.' })
  modifier(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMentionDto,
    @CurrentUser('id') acteurId: string,
    @Req() req: Request,
  ): Promise<MentionResponseDto> {
    return this.service.modifier(id, dto, acteurId, req.ip);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.DOC_CREATE)
  @ApiOperation({
    summary: 'Supprimer une mention (permission doc:create)',
    description: 'Suppression physique si aucun document ne l\'utilise. Désactivation douce sinon.',
  })
  @ApiNoContentResponse()
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 403, description: 'Permission doc:create requise ou accès refusé.' })
  @ApiResponse({ status: 404, description: 'Mention introuvable.' })
  supprimer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') acteurId: string,
    @Req() req: Request,
  ): Promise<void> {
    return this.service.supprimer(id, acteurId, req.ip);
  }
}
