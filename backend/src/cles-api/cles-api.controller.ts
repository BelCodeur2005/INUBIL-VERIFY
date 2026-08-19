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
import { ClesApiService } from './cles-api.service';
import { CreerCleApiDto } from './dto/creer-cle-api.dto';
import { UpdateCleApiDto } from './dto/update-cle-api.dto';
import { CleApiResponseDto } from './dto/cle-api-response.dto';

@ApiTags('Clés API')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('cles-api')
export class ClesApiController {
  constructor(private readonly service: ClesApiService) {}

  @Get()
  @RequirePermissions(Permission.API_READ)
  @ApiOperation({ summary: 'Lister les clés API de mon université' })
  @ApiOkResponse({ type: [CleApiResponseDto] })
  lister(@CurrentUser('id') acteurId: string): Promise<CleApiResponseDto[]> {
    return this.service.lister(acteurId);
  }

  @Get(':id')
  @RequirePermissions(Permission.API_READ)
  @ApiOperation({ summary: "Détail d'une clé API" })
  @ApiOkResponse({ type: CleApiResponseDto })
  @ApiResponse({
    status: 403,
    description: 'Clé appartenant à une autre université.',
  })
  @ApiResponse({ status: 404, description: 'Clé introuvable.' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') acteurId: string,
  ): Promise<CleApiResponseDto> {
    return this.service.findOne(id, acteurId);
  }

  @Post()
  @RequirePermissions(Permission.API_CREATE)
  @ApiOperation({
    summary: 'Créer une clé API',
    description:
      'La clé en clair est retournée UNE SEULE FOIS dans `cle_en_clair`. Conservez-la immédiatement.',
  })
  @ApiCreatedResponse({ type: CleApiResponseDto })
  creer(
    @Body() dto: CreerCleApiDto,
    @CurrentUser('id') acteurId: string,
    @Req() req: Request,
  ): Promise<CleApiResponseDto> {
    return this.service.creer(dto, acteurId, req.ip);
  }

  @Patch(':id')
  @RequirePermissions(Permission.API_CREATE)
  @ApiOperation({
    summary: 'Modifier une clé API (nom, permissions, statut, expiration)',
  })
  @ApiOkResponse({ type: CleApiResponseDto })
  @ApiResponse({ status: 403, description: 'Accès refusé.' })
  @ApiResponse({ status: 404, description: 'Clé introuvable.' })
  modifier(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCleApiDto,
    @CurrentUser('id') acteurId: string,
    @Req() req: Request,
  ): Promise<CleApiResponseDto> {
    return this.service.modifier(id, dto, acteurId, req.ip);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.API_DELETE)
  @ApiOperation({ summary: 'Révoquer (supprimer) une clé API' })
  @ApiNoContentResponse()
  @ApiResponse({ status: 403, description: 'Accès refusé.' })
  @ApiResponse({ status: 404, description: 'Clé introuvable.' })
  revoquer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') acteurId: string,
    @Req() req: Request,
  ): Promise<void> {
    return this.service.revoquer(id, acteurId, req.ip);
  }
}
