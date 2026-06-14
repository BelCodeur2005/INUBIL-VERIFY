import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  Res,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { memoryStorage } from 'multer';
import {
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PublicVerifyService } from './public-verify.service';
import { VerifierHashDto } from './dto/verifier-hash.dto';
import { VerifyResponseDto } from './dto/verify-response.dto';

const PDF_MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 Mo

@ApiTags('Vérification publique')
@Controller('verify')
export class PublicVerifyController {
  constructor(private readonly service: PublicVerifyService) {}

  @Get(':identifiant/rapport')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Télécharger un rapport PDF horodaté de vérification (10 req/min par IP)',
    description: 'Format identifiant attendu : INUB-YYYY-XXXX',
  })
  @ApiParam({ name: 'identifiant', example: 'INUB-2026-0001' })
  @ApiResponse({ status: 200, description: 'Rapport PDF généré (application/pdf).' })
  @ApiResponse({ status: 400, description: 'Format d\'identifiant invalide.' })
  @ApiResponse({ status: 404, description: 'Document introuvable.' })
  async telechargerRapport(
    @Param('identifiant') identifiant: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    // Validation stricte : seul le format INUB-YYYY-XXXX est accepté.
    // Protège contre l'injection de header via Content-Disposition.
    if (!/^INUB-\d{4}-\d{4,}$/.test(identifiant)) {
      throw new BadRequestException('Identifiant invalide - format attendu : INUB-YYYY-XXXX');
    }

    const { buffer, filename } = await this.service.genererRapport(
      identifiant,
      req.ip,
      req.headers['user-agent'],
    );

    // Sanitize the filename : ne conserver que les caractères alphanumériques, tirets et points.
    const safeFilename = filename.replace(/[^A-Za-z0-9._-]/g, '_');

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${safeFilename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get(':identifiant')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Vérifier un document par numéro unique - endpoint QR code (30 req/min par IP)',
    description: 'Scanné par le QR code imprimé sur le diplôme physique.',
  })
  @ApiParam({ name: 'identifiant', example: 'INUB-2026-0001' })
  @ApiOkResponse({ type: VerifyResponseDto })
  @ApiResponse({ status: 404, description: 'Document introuvable.' })
  verifierParIdentifiant(
    @Param('identifiant') identifiant: string,
    @Req() req: Request,
  ): Promise<VerifyResponseDto> {
    return this.service.verifierParIdentifiant(
      identifiant,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post('hash')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Vérifier par hash SHA-256 (64 hex chars) - 10 req/min par IP' })
  @ApiOkResponse({ type: VerifyResponseDto })
  @ApiResponse({ status: 400, description: 'Hash invalide (format attendu : 64 hex chars).' })
  @ApiResponse({ status: 404, description: 'Aucun document avec ce hash.' })
  verifierParHash(
    @Body() dto: VerifierHashDto,
    @Req() req: Request,
  ): Promise<VerifyResponseDto> {
    return this.service.verifierParHash(
      dto.hash,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post('upload')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Vérifier en uploadant le PDF - hash calculé côté serveur (5 req/min par IP)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['fichier'],
      properties: {
        fichier: { type: 'string', format: 'binary', description: 'PDF à vérifier (max 20 Mo)' },
      },
    },
  })
  @ApiOkResponse({ type: VerifyResponseDto })
  @ApiResponse({ status: 400, description: 'Fichier manquant ou format non-PDF.' })
  @ApiResponse({ status: 404, description: 'Aucun document avec ce hash.' })
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
  verifierParUpload(
    @UploadedFile() fichier: Express.Multer.File,
    @Req() req: Request,
  ): Promise<VerifyResponseDto> {
    if (!fichier) throw new BadRequestException('Le fichier PDF est obligatoire');
    return this.service.verifierParUpload(
      fichier.buffer,
      req.ip,
      req.headers['user-agent'],
    );
  }
}
