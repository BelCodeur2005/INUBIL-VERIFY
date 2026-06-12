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

@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@UseInterceptors(AuditInterceptor)
export class AdminController {
  constructor(
    private readonly stats: AdminStatsService,
    private readonly auditSvc: AdminAuditService,
    private readonly utilisateurs: UtilisateursService,
  ) {}

  // ── Statistiques ──────────────────────────────────────────────────────────

  @Get('statistiques')
  @RequirePermissions(Permission.STATS_READ)
  statistiques() {
    return this.stats.statistiquesGlobales();
  }

  @Get('statistiques/graphe')
  @RequirePermissions(Permission.STATS_READ)
  graphe(@Query() query: StatsGrapheQueryDto) {
    return this.stats.graphe(query);
  }

  // ── Journal d'audit ───────────────────────────────────────────────────────

  @Get('audit')
  @RequirePermissions(Permission.AUDIT_READ)
  journal(@Query() query: AuditQueryDto) {
    return this.auditSvc.lireJournal(query);
  }

  // ── Utilisateurs admin ────────────────────────────────────────────────────

  @Get('utilisateurs')
  @RequirePermissions(Permission.USER_READ)
  listerUtilisateurs(@Query() query: UtilisateurQueryDto) {
    return this.utilisateurs.lister(query);
  }

  @Patch('utilisateurs/:id/activer')
  @RequirePermissions(Permission.USER_EDIT)
  activerUtilisateur(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.auditSvc.activerUtilisateur(id, user.id, req.ip);
  }

  @Patch('utilisateurs/:id/desactiver')
  @RequirePermissions(Permission.USER_EDIT)
  desactiverUtilisateur(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.auditSvc.desactiverUtilisateur(id, user.id, req.ip);
  }
}
