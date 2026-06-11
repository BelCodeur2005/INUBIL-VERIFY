import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permission } from '../auth/constants/permissions.constant';
import { AuthTokensDto } from '../auth/dto/auth-response.dto';
import { ActiverInvitationDto } from './dto/activer-invitation.dto';
import { CreerInvitationDto } from './dto/creer-invitation.dto';
import { InvitationQueryDto } from './dto/invitation-query.dto';
import {
  InvitationListResponseDto,
  InvitationResponseDto,
} from './dto/invitation-response.dto';
import { InvitationsService } from './invitations.service';

@ApiTags('Invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly service: InvitationsService) {}

  // ─── ACTIVER (public, déclaré avant :id pour éviter tout conflit de route) ──
  @Post('activer')
  @ApiOperation({ summary: "Activer un compte via un token d'invitation (public)" })
  @ApiOkResponse({ type: AuthTokensDto })
  @ApiResponse({ status: 400, description: 'Token invalide ou expiré, ou champs manquants pour nouveau compte.' })
  activer(
    @Body() dto: ActiverInvitationDto,
    @Ip() ip: string,
    @Req() req: Request,
  ): Promise<AuthTokensDto> {
    return this.service.activer(dto, ip, req.headers['user-agent'] as string);
  }

  // ─── CRÉER ──────────────────────────────────────────────────────────
  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.USER_ASSIGN_ROLE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Créer une invitation collaborateur (TTL 72h)' })
  @ApiCreatedResponse({ type: InvitationResponseDto })
  @ApiResponse({ status: 400, description: 'Invitation en attente déjà existante.' })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 403, description: 'Permission user:assign_role requise.' })
  @ApiResponse({ status: 404, description: 'Université ou rôle introuvable.' })
  creer(
    @Body() dto: CreerInvitationDto,
    @CurrentUser('id') acteurId: string,
    @Req() req: Request,
  ): Promise<InvitationResponseDto> {
    return this.service.creer(dto, acteurId, req.ip);
  }

  // ─── LISTER ─────────────────────────────────────────────────────────
  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.USER_READ)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Liste paginée des invitations collaborateurs (filtres : statut, universite_id)',
  })
  @ApiOkResponse({ type: InvitationListResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 403, description: 'Permission user:read requise.' })
  lister(
    @Query() query: InvitationQueryDto,
    @CurrentUser('id') acteurId: string,
  ): Promise<InvitationListResponseDto> {
    return this.service.lister(query, acteurId);
  }

  // ─── RENVOYER ────────────────────────────────────────────────────────
  @Post(':id/renvoyer')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.USER_ASSIGN_ROLE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: "Renvoyer un email d'invitation (nouveau token 72h, nb_relances+1)" })
  @ApiOkResponse({ type: InvitationResponseDto })
  @ApiResponse({ status: 400, description: 'Invitation déjà acceptée.' })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 403, description: 'Permission user:assign_role requise.' })
  @ApiResponse({ status: 404, description: 'Invitation introuvable.' })
  renvoyer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') acteurId: string,
    @Req() req: Request,
  ): Promise<InvitationResponseDto> {
    return this.service.renvoyer(id, acteurId, req.ip);
  }

  // ─── ANNULER ─────────────────────────────────────────────────────────
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.USER_ASSIGN_ROLE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Annuler une invitation en attente (suppression définitive)' })
  @ApiNoContentResponse()
  @ApiResponse({ status: 400, description: 'Seules les invitations en attente peuvent être annulées.' })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 403, description: 'Permission user:assign_role requise.' })
  @ApiResponse({ status: 404, description: 'Invitation introuvable.' })
  annuler(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') acteurId: string,
    @Req() req: Request,
  ): Promise<void> {
    return this.service.annuler(id, acteurId, req.ip);
  }
}
