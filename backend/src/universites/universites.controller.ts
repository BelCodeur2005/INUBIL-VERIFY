import {
  BadRequestException,
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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { memoryStorage } from 'multer';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { LOGO_MAX_SIZE_BYTES } from '../common/constants/upload.constants';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permission } from '../auth/constants/permissions.constant';
import { ApprouverUniversiteDto } from './dto/approuver-universite.dto';
import { ChangerStatutDto } from './dto/changer-statut.dto';
import { CreateUniversiteDto } from './dto/create-universite.dto';
import { UpdateUniversiteDto } from './dto/update-universite.dto';
import {
  UniversiteListResponseDto,
  UniversiteResponseDto,
} from './dto/universite-response.dto';
import { UniversiteQueryDto } from './dto/universite-query.dto';
import { UniversitesService } from './universites.service';

@ApiTags('Universités')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('universites')
export class UniversitesController {
  constructor(private readonly service: UniversitesService) {}

  @Get()
  @ApiOperation({
    summary:
      'Liste paginée des universités (filtres: statut, type, pays, search)',
  })
  @ApiOkResponse({ type: UniversiteListResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  lister(
    @Query() query: UniversiteQueryDto,
  ): Promise<UniversiteListResponseDto> {
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
  @RequirePermissions(Permission.UNIV_CREATE)
  @ApiOperation({
    summary: 'Créer une université (statut initial : en_attente)',
  })
  @ApiCreatedResponse({ type: UniversiteResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 403, description: 'Permission univ:create requise.' })
  creer(
    @Body() dto: CreateUniversiteDto,
    @CurrentUser('id') userId: string,
    @Ip() ip: string,
  ): Promise<UniversiteResponseDto> {
    return this.service.creer(dto, userId, ip);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.UNIV_EDIT)
  @ApiOperation({ summary: "Modifier les informations d'une université" })
  @ApiOkResponse({ type: UniversiteResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 403, description: 'Permission univ:edit requise.' })
  @ApiResponse({ status: 404, description: 'Université introuvable.' })
  modifier(
    @Param('id') id: string,
    @Body() dto: UpdateUniversiteDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ): Promise<UniversiteResponseDto> {
    return this.service.modifier(id, dto, userId, req.ip);
  }

  @Post(':id/logo')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.UNIV_EDIT)
  @UseInterceptors(
    FileInterceptor('fichier', {
      storage: memoryStorage(),
      limits: { fileSize: LOGO_MAX_SIZE_BYTES },
      fileFilter: (_req, file, cb) => {
        // SVG volontairement exclu : un SVG peut embarquer du JavaScript executable
        // (XSS stocke si le fichier est ensuite servi/ouvert directement) — un logo
        // n'a pas besoin de ce format, PNG/JPEG/WEBP suffisent.
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.mimetype)) {
          return cb(
            new BadRequestException('Formats acceptés : PNG, JPEG, WEBP'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  @ApiOperation({
    summary:
      "Téléverser le logo d'une université (PNG/JPEG/WEBP, 2 Mo max)",
    description:
      "Nécessite STORAGE_PUBLIC_BASE_URL configuré côté serveur (bucket accessible publiquement) : un logo est affiché en continu dans l'application, contrairement aux documents dont l'accès est temporaire et pré-signé.",
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { fichier: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOkResponse({ type: UniversiteResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Fichier invalide ou stockage public non configuré.',
  })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 403, description: 'Permission univ:edit requise.' })
  @ApiResponse({ status: 404, description: 'Université introuvable.' })
  televerserLogo(
    @Param('id') id: string,
    @UploadedFile() fichier: Express.Multer.File,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ): Promise<UniversiteResponseDto> {
    if (!fichier) throw new BadRequestException('Aucun fichier reçu.');
    return this.service.uploaderLogo(id, fichier, userId, req.ip);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.UNIV_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Supprimer (soft delete) une université non-active',
  })
  @ApiNoContentResponse()
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 403, description: 'Permission univ:delete requise.' })
  @ApiResponse({ status: 404, description: 'Université introuvable.' })
  @ApiResponse({
    status: 409,
    description: 'Impossible de supprimer une université active.',
  })
  supprimer(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ): Promise<void> {
    return this.service.supprimer(id, userId, req.ip);
  }

  @Post(':id/approuver')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.UNIV_APPROVE)
  @ApiOperation({
    summary: 'Approuver une université (en_attente → approuvee)',
  })
  @ApiOkResponse({ type: UniversiteResponseDto })
  @ApiResponse({ status: 403, description: 'Permission univ:approve requise.' })
  @ApiResponse({
    status: 409,
    description: 'Statut incompatible avec cette action.',
  })
  approuver(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Ip() ip: string,
  ): Promise<UniversiteResponseDto> {
    return this.service.approuver(id, userId, ip);
  }

  @Post(':id/activer')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.UNIV_ACTIVATE)
  @ApiOperation({ summary: 'Activer une université (approuvee → active)' })
  @ApiOkResponse({ type: UniversiteResponseDto })
  @ApiResponse({
    status: 403,
    description: 'Permission univ:activate requise.',
  })
  @ApiResponse({
    status: 409,
    description: 'Statut incompatible avec cette action.',
  })
  activer(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Ip() ip: string,
  ): Promise<UniversiteResponseDto> {
    return this.service.activer(id, userId, ip);
  }

  @Post(':id/suspendre')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.UNIV_SUSPEND)
  @ApiOperation({ summary: 'Suspendre une université (active → suspendue)' })
  @ApiOkResponse({ type: UniversiteResponseDto })
  @ApiResponse({ status: 403, description: 'Permission univ:suspend requise.' })
  @ApiResponse({
    status: 409,
    description: 'Statut incompatible avec cette action.',
  })
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
  @RequirePermissions(Permission.UNIV_REJECT)
  @ApiOperation({
    summary:
      'Rejeter une université (en_attente → rejetee) - raison obligatoire',
  })
  @ApiOkResponse({ type: UniversiteResponseDto })
  @ApiResponse({ status: 400, description: 'Raison manquante.' })
  @ApiResponse({ status: 403, description: 'Permission univ:reject requise.' })
  @ApiResponse({
    status: 409,
    description: 'Statut incompatible avec cette action.',
  })
  rejeter(
    @Param('id') id: string,
    @Body() dto: ApprouverUniversiteDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ): Promise<UniversiteResponseDto> {
    return this.service.rejeter(id, dto, userId, req.ip);
  }
}
