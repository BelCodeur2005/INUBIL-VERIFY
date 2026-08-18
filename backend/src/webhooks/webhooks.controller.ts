import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
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
import { WebhooksService } from './webhooks.service';
import { CreerWebhookDto } from './dto/creer-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import {
  WebhookResponseDto,
  WebhookLivraisonResponseDto,
} from './dto/webhook-response.dto';

@ApiTags('Webhooks')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly service: WebhooksService) {}

  @Get()
  @RequirePermissions(Permission.WEBHOOK_READ)
  @ApiOperation({ summary: 'Lister les webhooks de mon université' })
  @ApiOkResponse({ type: [WebhookResponseDto] })
  lister(@CurrentUser('id') acteurId: string): Promise<WebhookResponseDto[]> {
    return this.service.lister(acteurId);
  }

  @Get(':id')
  @RequirePermissions(Permission.WEBHOOK_READ)
  @ApiOperation({ summary: "Détail d'un webhook" })
  @ApiOkResponse({ type: WebhookResponseDto })
  @ApiResponse({ status: 404, description: 'Webhook introuvable.' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') acteurId: string,
  ): Promise<WebhookResponseDto> {
    return this.service.findOne(id, acteurId);
  }

  @Post()
  @RequirePermissions(Permission.WEBHOOK_CREATE)
  @ApiOperation({ summary: 'Créer un webhook' })
  @ApiCreatedResponse({ type: WebhookResponseDto })
  creer(
    @Body() dto: CreerWebhookDto,
    @CurrentUser('id') acteurId: string,
    @Req() req: Request,
  ): Promise<WebhookResponseDto> {
    return this.service.creer(dto, acteurId, req.ip);
  }

  @Patch(':id')
  @RequirePermissions(Permission.WEBHOOK_EDIT)
  @ApiOperation({
    summary: 'Modifier un webhook (nom, url, événements, statut)',
  })
  @ApiOkResponse({ type: WebhookResponseDto })
  @ApiResponse({ status: 404, description: 'Webhook introuvable.' })
  modifier(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWebhookDto,
    @CurrentUser('id') acteurId: string,
    @Req() req: Request,
  ): Promise<WebhookResponseDto> {
    return this.service.modifier(id, dto, acteurId, req.ip);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.WEBHOOK_DELETE)
  @ApiOperation({ summary: 'Supprimer un webhook' })
  @ApiNoContentResponse()
  @ApiResponse({ status: 404, description: 'Webhook introuvable.' })
  supprimer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') acteurId: string,
    @Req() req: Request,
  ): Promise<void> {
    return this.service.supprimer(id, acteurId, req.ip);
  }

  @Get(':id/livraisons')
  @RequirePermissions(Permission.WEBHOOK_READ)
  @ApiOperation({
    summary: "Historique des 100 dernières livraisons d'un webhook",
  })
  @ApiOkResponse({ type: [WebhookLivraisonResponseDto] })
  @ApiResponse({ status: 404, description: 'Webhook introuvable.' })
  listerLivraisons(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') acteurId: string,
  ): Promise<WebhookLivraisonResponseDto[]> {
    return this.service.listerLivraisons(id, acteurId);
  }

  @Post(':id/tester')
  @RequirePermissions(Permission.WEBHOOK_EDIT)
  @ApiOperation({ summary: 'Envoyer un ping de test au webhook' })
  @ApiOkResponse({
    schema: {
      example: {
        succes: true,
        statut_http: 200,
        message: 'Ping envoyé avec succès',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Webhook introuvable.' })
  tester(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') acteurId: string,
  ) {
    return this.service.tester(id, acteurId);
  }
}
