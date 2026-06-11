import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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
import {
  AdminVerificationQueryDto,
  VerificationQueryDto,
} from './dto/verification-query.dto';
import {
  VerificationAdminListResponseDto,
  VerificationListResponseDto,
} from './dto/verification-response.dto';
import { VerificationsService } from './verifications.service';

@ApiTags('Vérifications')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('verifications')
export class VerificationsController {
  constructor(private readonly service: VerificationsService) {}

  // ─── MES VÉRIFICATIONS ──────────────────────────────────────────────
  // Déclaré avant les routes paramétrées pour éviter tout conflit NestJS.
  @Get('mes-verifications')
  @ApiOperation({
    summary: 'Vérifications effectuées par l\'utilisateur connecté (tri date desc)',
  })
  @ApiOkResponse({ type: VerificationListResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  mesVerifications(
    @CurrentUser('id') utilisateurId: string,
    @Query() query: VerificationQueryDto,
  ): Promise<VerificationListResponseDto> {
    return this.service.mesVerifications(utilisateurId, query);
  }

  // ─── ADMIN : TOUTES LES VÉRIFICATIONS ───────────────────────────────
  // Déclaré avant GET / (catch-all) pour que NestJS ne confonde pas 'admin' avec
  // un futur segment dynamique.
  @Get('admin')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.AUDIT_READ)
  @ApiOperation({
    summary: 'Toutes les vérifications — admin uniquement (permission audit:read)',
  })
  @ApiOkResponse({ type: VerificationAdminListResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 403, description: 'Permission audit:read requise.' })
  toutesVerifications(
    @Query() query: AdminVerificationQueryDto,
  ): Promise<VerificationAdminListResponseDto> {
    return this.service.toutesVerifications(query);
  }

  // ─── MES DIPLÔMES (étudiant) ─────────────────────────────────────────
  @Get()
  @ApiOperation({
    summary:
      'Vérifications effectuées sur les diplômes de l\'étudiant connecté ' +
      '(nécessite un espace étudiant associé au compte)',
  })
  @ApiOkResponse({ type: VerificationListResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 403, description: 'document_id ne fait pas partie de vos diplômes.' })
  mesDiplomes(
    @CurrentUser('id') utilisateurId: string,
    @Query() query: VerificationQueryDto,
  ): Promise<VerificationListResponseDto> {
    return this.service.mesDiplomes(utilisateurId, query);
  }
}
