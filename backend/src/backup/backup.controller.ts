import { Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BackupService } from './backup.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permission } from '../auth/constants/permissions.constant';

@ApiTags('Administration')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Post()
  @RequirePermissions(Permission.CONFIG_EDIT)
  @ApiOperation({
    summary: 'Déclencher un backup manuel de la base de données (permission config:edit)',
    description:
      'Exécute pg_dump, compresse en .sql.gz et uploade vers N0C Storage via FTP. ' +
      'Réservé aux super admins.',
  })
  @ApiOkResponse({
    description: 'Backup créé et uploadé avec succès.',
    schema: {
      example: {
        message: 'Backup effectué avec succès',
        fichier: 'backup_2026-06-27_02-00-00.sql.gz',
        tailleMo: '0.43',
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Permission config:edit requise.' })
  async declencherBackup() {
    const result = await this.backupService.effectuerBackup();
    return { message: 'Backup effectué avec succès', ...result };
  }
}
