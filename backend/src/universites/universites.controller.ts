import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  Patch,
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
import { ApprouverUniversiteDto } from './dto/approuver-universite.dto';
import { ChangerStatutDto } from './dto/changer-statut.dto';
import { CreateUniversiteDto } from './dto/create-universite.dto';
import { UpdateUniversiteDto } from './dto/update-universite.dto';
import { UniversiteListResponseDto, UniversiteResponseDto } from './dto/universite-response.dto';
import { UniversiteQueryDto } from './dto/universite-query.dto';
import { UniversitesService } from './universites.service';

@ApiTags('Universités')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('universites')
export class UniversitesController {
  constructor(private readonly service: UniversitesService) {}

  @Get()
  @ApiOperation({ summary: 'Liste paginée des universités (filtres: statut, type, pays, search)' })
  @ApiOkResponse({ type: UniversiteListResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  lister(@Query() query: UniversiteQueryDto): Promise<UniversiteListResponseDto> {
    return this.service.lister(query);
  }

  @Get(':id')
  @ApiOperation({ summary: "Détail d'une université" })
  @ApiOkResponse({ type: UniversiteResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 404, description: 'Université introuvable.' })
  findOne(@Param('id') id: string): Promise<UniversiteResponseDto> {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.GERER_UNIVERSITES)
  @ApiOperation({ summary: 'Créer une université (statut initial : en_attente)' })
  @ApiCreatedResponse({ type: UniversiteResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 403, description: 'Permission GERER_UNIVERSITES requise.' })
  creer(
    @Body() dto: CreateUniversiteDto,
    @CurrentUser('id') userId: string,
    @Ip() ip: string,
  ): Promise<UniversiteResponseDto> {
    return this.service.creer(dto, userId, ip);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.GERER_UNIVERSITES)
  @ApiOperation({ summary: "Modifier les informations d'une université" })
  @ApiOkResponse({ type: UniversiteResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 403, description: 'Permission GERER_UNIVERSITES requise.' })
  @ApiResponse({ status: 404, description: 'Université introuvable.' })
  modifier(
    @Param('id') id: string,
    @Body() dto: UpdateUniversiteDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ): Promise<UniversiteResponseDto> {
    return this.service.modifier(id, dto, userId, req.ip);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.GERER_UNIVERSITES)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer (soft delete) une université non-active' })
  @ApiNoContentResponse()
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 403, description: 'Permission GERER_UNIVERSITES requise.' })
  @ApiResponse({ status: 404, description: 'Université introuvable.' })
  @ApiResponse({ status: 409, description: 'Impossible de supprimer une université active.' })
  supprimer(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ): Promise<void> {
    return this.service.supprimer(id, userId, req.ip);
  }

  @Post(':id/approuver')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.GERER_UNIVERSITES)
  @ApiOperation({ summary: 'Approuver une université (en_attente → approuvee)' })
  @ApiOkResponse({ type: UniversiteResponseDto })
  @ApiResponse({ status: 409, description: 'Statut incompatible avec cette action.' })
  approuver(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Ip() ip: string,
  ): Promise<UniversiteResponseDto> {
    return this.service.approuver(id, userId, ip);
  }

  @Post(':id/activer')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.GERER_UNIVERSITES)
  @ApiOperation({ summary: 'Activer une université (approuvee → active)' })
  @ApiOkResponse({ type: UniversiteResponseDto })
  @ApiResponse({ status: 409, description: 'Statut incompatible avec cette action.' })
  activer(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Ip() ip: string,
  ): Promise<UniversiteResponseDto> {
    return this.service.activer(id, userId, ip);
  }

  @Post(':id/suspendre')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.GERER_UNIVERSITES)
  @ApiOperation({ summary: 'Suspendre une université (active → suspendue)' })
  @ApiOkResponse({ type: UniversiteResponseDto })
  @ApiResponse({ status: 409, description: 'Statut incompatible avec cette action.' })
  suspendre(
    @Param('id') id: string,
    @Body() dto: ChangerStatutDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ): Promise<UniversiteResponseDto> {
    return this.service.suspendre(id, dto, userId, req.ip);
  }

  @Post(':id/rejeter')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.GERER_UNIVERSITES)
  @ApiOperation({ summary: 'Rejeter une université (en_attente → rejetee) — raison obligatoire' })
  @ApiOkResponse({ type: UniversiteResponseDto })
  @ApiResponse({ status: 400, description: 'Raison manquante.' })
  @ApiResponse({ status: 409, description: 'Statut incompatible avec cette action.' })
  rejeter(
    @Param('id') id: string,
    @Body() dto: ApprouverUniversiteDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ): Promise<UniversiteResponseDto> {
    return this.service.rejeter(id, dto, userId, req.ip);
  }
}
