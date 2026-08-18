import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get('moi')
  @ApiOperation({
    summary: 'Mes notifications (paginées, filtrables par statut)',
  })
  @ApiOkResponse({ description: 'Liste paginée avec compteur de non-lues' })
  lister(
    @CurrentUser('id') acteurId: string,
    @Query() query: NotificationQueryDto,
  ) {
    return this.service.lister(acteurId, query);
  }

  @Get('moi/non-lues/count')
  @ApiOperation({ summary: 'Nombre de notifications non lues (pour le badge)' })
  @ApiOkResponse({ schema: { example: { count: 3 } } })
  compterNonLues(@CurrentUser('id') acteurId: string) {
    return this.service.compterNonLues(acteurId);
  }

  @Patch(':id/lire')
  @ApiOperation({ summary: 'Marquer une notification comme lue' })
  @ApiOkResponse({ type: NotificationResponseDto })
  @ApiResponse({
    status: 403,
    description: 'Notification appartenant à un autre utilisateur.',
  })
  @ApiResponse({ status: 404, description: 'Notification introuvable.' })
  marquerLue(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') acteurId: string,
  ) {
    return this.service.marquerLue(id, acteurId);
  }

  @Patch('moi/tout-lire')
  @ApiOperation({ summary: 'Marquer toutes mes notifications comme lues' })
  @ApiOkResponse({ schema: { example: { modifiees: 5 } } })
  marquerToutesLues(@CurrentUser('id') acteurId: string) {
    return this.service.marquerToutesLues(acteurId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archiver une notification' })
  @ApiNoContentResponse()
  @ApiResponse({
    status: 403,
    description: 'Notification appartenant à un autre utilisateur.',
  })
  @ApiResponse({ status: 404, description: 'Notification introuvable.' })
  archiver(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') acteurId: string,
  ) {
    return this.service.archiver(id, acteurId);
  }
}
