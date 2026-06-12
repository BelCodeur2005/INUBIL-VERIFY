import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { Permission } from '../auth/constants/permissions.constant';
import { UtilisateursService } from '../utilisateurs/utilisateurs.service';
import { UtilisateurQueryDto } from '../utilisateurs/dto/utilisateur-query.dto';
import { AdminStatsService } from './admin-stats.service';
import { AdminAuditService } from './admin-audit.service';
import { AuditInterceptor } from './interceptors/audit.interceptor';
import { StatsGrapheQueryDto } from './dto/stats-graphe-query.dto';
import { AuditQueryDto } from './dto/audit-query.dto';

@ApiTags('Administration')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly stats: AdminStatsService,
    private readonly auditSvc: AdminAuditService,
    private readonly utilisateurs: UtilisateursService,
  ) {}

  // ── Statistiques ──────────────────────────────────────────────────────────

  @Get('statistiques')
  @RequirePermissions(Permission.STATS_READ)
  @ApiOperation({ summary: 'Statistiques globales de la plateforme (permission stats:read)' })
  @ApiOkResponse({ description: 'KPIs globaux : universités, documents, vérifications, etc.' })
  @ApiResponse({ status: 403, description: 'Permission stats:read requise.' })
  statistiques() {
    return this.stats.statistiquesGlobales();
  }

  @Get('statistiques/graphe')
  @RequirePermissions(Permission.STATS_READ)
  @ApiOperation({
    summary: 'Séries temporelles vérifications + documents émis (permission stats:read)',
    description: 'Paramètres : granularite=jour|mois, debut, fin (ISO 8601).',
  })
  @ApiOkResponse({ description: 'Tableau de points { date, verifications, documents_emis }.' })
  @ApiResponse({ status: 400, description: 'Paramètres de date ou granularité invalides.' })
  @ApiResponse({ status: 403, description: 'Permission stats:read requise.' })
  graphe(@Query() query: StatsGrapheQueryDto) {
    return this.stats.graphe(query);
  }

  // ── Journal d'audit ───────────────────────────────────────────────────────

  @Get('audit')
  @RequirePermissions(Permission.AUDIT_READ)
  @ApiOperation({ summary: 'Journal d\'audit paginé avec filtres (permission audit:read)' })
  @ApiOkResponse({ description: 'Entrées d\'audit paginées.' })
  @ApiResponse({ status: 403, description: 'Permission audit:read requise.' })
  journal(@Query() query: AuditQueryDto) {
    return this.auditSvc.lireJournal(query);
  }

  // ── Utilisateurs admin ────────────────────────────────────────────────────

  @Get('utilisateurs')
  @RequirePermissions(Permission.USER_READ)
  @ApiOperation({ summary: 'Lister les utilisateurs avec filtres (permission user:read)' })
  @ApiOkResponse({ description: 'Liste paginée d\'utilisateurs.' })
  @ApiResponse({ status: 403, description: 'Permission user:read requise.' })
  listerUtilisateurs(@Query() query: UtilisateurQueryDto) {
    return this.utilisateurs.lister(query);
  }

  @Patch('utilisateurs/:id/activer')
  @RequirePermissions(Permission.USER_EDIT)
  @ApiOperation({ summary: 'Activer un compte utilisateur (permission user:edit)' })
  @ApiOkResponse({ description: 'Utilisateur activé.' })
  @ApiResponse({ status: 403, description: 'Permission user:edit requise ou auto-modification interdite.' })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable.' })
  activerUtilisateur(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.auditSvc.activerUtilisateur(id, user.id, req.ip);
  }

  @Patch('utilisateurs/:id/desactiver')
  @RequirePermissions(Permission.USER_EDIT)
  @ApiOperation({ summary: 'Désactiver un compte utilisateur (permission user:edit)' })
  @ApiOkResponse({ description: 'Utilisateur désactivé.' })
  @ApiResponse({ status: 403, description: 'Permission user:edit requise ou auto-modification interdite.' })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable.' })
  desactiverUtilisateur(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.auditSvc.desactiverUtilisateur(id, user.id, req.ip);
  }
}
