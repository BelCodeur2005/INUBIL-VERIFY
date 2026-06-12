import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Req,
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permission } from '../auth/constants/permissions.constant';
import { DocumentsService } from './documents.service';
import { CreerDocumentDto } from './dto/creer-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { RevoquerDocumentDto } from './dto/revoquer-document.dto';
import { DocumentQueryDto } from './dto/document-query.dto';

const PDF_MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 Mo

@ApiTags('Documents')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Post()
  @RequirePermissions(Permission.DOC_CREATE)
  @ApiOperation({ summary: 'Créer un brouillon de document (permission doc:create)' })
  @ApiCreatedResponse({ description: 'Brouillon créé.' })
  @ApiResponse({ status: 403, description: 'Permission doc:create requise.' })
  creer(
    @Body() dto: CreerDocumentDto,
    @CurrentUser('id') acteurId: string,
    @Req() req: Request,
  ) {
    return this.service.creer(dto, acteurId, req.ip);
  }

  @Get()
  @RequirePermissions(Permission.DOC_READ)
  @ApiOperation({ summary: 'Lister les documents avec filtres (permission doc:read)' })
  @ApiOkResponse({ description: 'Liste paginée de documents.' })
  @ApiResponse({ status: 403, description: 'Permission doc:read requise.' })
  lister(
    @Query() query: DocumentQueryDto,
    @CurrentUser('id') acteurId: string,
  ) {
    return this.service.lister(query, acteurId);
  }

  @Get(':id')
  @RequirePermissions(Permission.DOC_READ)
  @ApiOperation({ summary: 'Détail d\'un document (permission doc:read)' })
  @ApiOkResponse({ description: 'Document trouvé.' })
  @ApiResponse({ status: 403, description: 'Permission doc:read requise.' })
  @ApiResponse({ status: 404, description: 'Document introuvable.' })
  trouver(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') acteurId: string,
  ) {
    return this.service.trouver(id, acteurId);
  }

  @Patch(':id')
  @RequirePermissions(Permission.DOC_CREATE)
  @ApiOperation({ summary: 'Modifier un brouillon (permission doc:create)' })
  @ApiOkResponse({ description: 'Document mis à jour.' })
  @ApiResponse({ status: 403, description: 'Permission doc:create requise.' })
  @ApiResponse({ status: 404, description: 'Document introuvable ou non en brouillon.' })
  modifier(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocumentDto,
    @CurrentUser('id') acteurId: string,
    @Req() req: Request,
  ) {
    return this.service.modifier(id, dto, acteurId, req.ip);
  }

  @Post(':id/valider')
  @RequirePermissions(Permission.DOC_VALIDATE)
  @UseInterceptors(
    FileInterceptor('fichier', {
      storage: memoryStorage(),
      limits: { fileSize: PDF_MAX_SIZE_BYTES },
      fileFilter: (_req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          return cb(new BadRequestException('Seuls les fichiers PDF sont acceptés'), false);
        }
        cb(null, true);
      },
    }),
  )
  @ApiOperation({
    summary: 'Valider un document — upload du PDF officiel (permission doc:validate)',
    description:
      'Calcule le hash SHA-256, génère le QR code, passe le statut à actif. ' +
      'IPFS (#21) et Blockchain (#22) seront branchés dans les sprints suivants.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['fichier'],
      properties: {
        fichier: { type: 'string', format: 'binary', description: 'PDF officiel (max 20 Mo)' },
      },
    },
  })
  @ApiOkResponse({ description: 'Document validé et activé.' })
  @ApiResponse({ status: 400, description: 'Fichier manquant ou format non-PDF.' })
  @ApiResponse({ status: 403, description: 'Permission doc:validate requise.' })
  @ApiResponse({ status: 404, description: 'Document introuvable ou non en brouillon.' })
  valider(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() fichier: Express.Multer.File,
    @CurrentUser('id') acteurId: string,
    @Req() req: Request,
  ) {
    if (!fichier) throw new BadRequestException('Le fichier PDF est obligatoire');
    return this.service.valider(
      id,
      fichier.buffer,
      fichier.size,
      acteurId,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post(':id/revoquer')
  @RequirePermissions(Permission.DOC_REVOKE)
  @ApiOperation({ summary: 'Révoquer un document avec motif obligatoire (permission doc:revoke)' })
  @ApiOkResponse({ description: 'Document révoqué.' })
  @ApiResponse({ status: 400, description: 'Motif de révocation manquant.' })
  @ApiResponse({ status: 403, description: 'Permission doc:revoke requise.' })
  @ApiResponse({ status: 404, description: 'Document introuvable.' })
  revoquer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RevoquerDocumentDto,
    @CurrentUser('id') acteurId: string,
    @Req() req: Request,
  ) {
    return this.service.revoquer(id, dto, acteurId, req.ip);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.DOC_DELETE)
  @ApiOperation({ summary: 'Supprimer un brouillon (permission doc:delete)' })
  @ApiNoContentResponse({ description: 'Brouillon supprimé.' })
  @ApiResponse({ status: 403, description: 'Permission doc:delete requise.' })
  @ApiResponse({ status: 404, description: 'Document introuvable ou non en brouillon.' })
  supprimer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') acteurId: string,
    @Req() req: Request,
  ) {
    return this.service.supprimer(id, acteurId, req.ip);
  }
}
