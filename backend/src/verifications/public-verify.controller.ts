import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { memoryStorage } from 'multer';
import { PublicVerifyService } from './public-verify.service';
import { VerifierHashDto } from './dto/verifier-hash.dto';
import { VerifyResponseDto } from './dto/verify-response.dto';

const PDF_MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 Mo

/**
 * Endpoints 100% publics — aucun JWT requis.
 * Chaque appel est loggué dans la table `verifications`.
 */
@Controller('verify')
export class PublicVerifyController {
  constructor(private readonly service: PublicVerifyService) {}

  /**
   * GET /verify/:identifiant
   * Vérifie un document par son numéro unique (ex: INUB-2026-0001).
   * C'est l'endpoint scanné par le QR code sur le diplôme physique.
   */
  @Get(':identifiant')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
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

  /**
   * POST /verify/hash
   * Vérifie en soumettant directement un hash SHA-256 (64 hex chars).
   */
  @Post('hash')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
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

  /**
   * POST /verify/upload
   * Vérifie en uploadant le fichier PDF (multipart/form-data, champ "fichier").
   * Le hash SHA-256 est calculé côté serveur et comparé à la base.
   */
  @Post('upload')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
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
