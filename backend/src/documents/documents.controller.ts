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

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  /** POST /documents — créer un brouillon */
  @Post()
  @RequirePermissions(Permission.DOC_CREATE)
  creer(
    @Body() dto: CreerDocumentDto,
    @CurrentUser('id') acteurId: string,
    @Req() req: Request,
  ) {
    return this.service.creer(dto, acteurId, req.ip);
  }

  /** GET /documents — liste avec filtres */
  @Get()
  @RequirePermissions(Permission.DOC_READ)
  lister(
    @Query() query: DocumentQueryDto,
    @CurrentUser('id') acteurId: string,
  ) {
    return this.service.lister(query, acteurId);
  }

  /** GET /documents/:id — détail */
  @Get(':id')
  @RequirePermissions(Permission.DOC_READ)
  trouver(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') acteurId: string,
  ) {
    return this.service.trouver(id, acteurId);
  }

  /** PATCH /documents/:id — modifier un brouillon */
  @Patch(':id')
  @RequirePermissions(Permission.DOC_CREATE)
  modifier(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocumentDto,
    @CurrentUser('id') acteurId: string,
    @Req() req: Request,
  ) {
    return this.service.modifier(id, dto, acteurId, req.ip);
  }

  /**
   * POST /documents/:id/valider
   * Upload du PDF officiel (multipart/form-data, champ "fichier").
   * Déclenche : hash SHA-256 → QR → statut actif.
   * IPFS (#21) et Blockchain (#22) seront branchés dans les sprints suivants.
   */
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

  /** POST /documents/:id/revoquer — révocation avec motif obligatoire */
  @Post(':id/revoquer')
  @RequirePermissions(Permission.DOC_REVOKE)
  revoquer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RevoquerDocumentDto,
    @CurrentUser('id') acteurId: string,
    @Req() req: Request,
  ) {
    return this.service.revoquer(id, dto, acteurId, req.ip);
  }

  /** DELETE /documents/:id — supprime un brouillon uniquement */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.DOC_DELETE)
  supprimer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') acteurId: string,
    @Req() req: Request,
  ) {
    return this.service.supprimer(id, acteurId, req.ip);
  }
}
