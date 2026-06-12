import { Controller, Get, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PublicPartagesService } from './public-partages.service';
import { PartagePublicResponseDto } from './dto/partage-public-response.dto';

@ApiTags('Partage public')
@Controller('partages')
export class PublicPartagesController {
  constructor(private readonly service: PublicPartagesService) {}

  @Get(':token')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Accéder à un document partagé via son token (20 req/min par IP)',
    description:
      'Aucune authentification requise. Le token 64-chars hex (256 bits d\'entropie) est la preuve d\'accès. ' +
      'Incrémente nb_consultations. Auto-expire le lien si date_expiration est dépassée.',
  })
  @ApiParam({ name: 'token', description: 'Token hex 64 caractères', example: 'a3f9c2...' })
  @ApiOkResponse({ type: PartagePublicResponseDto, description: 'Document + métadonnées du partage.' })
  @ApiResponse({ status: 404, description: 'Token introuvable ou révoqué.' })
  @ApiResponse({ status: 410, description: 'Lien expiré.' })
  acceder(@Param('token') token: string): Promise<PartagePublicResponseDto> {
    return this.service.accederParToken(token);
  }
}
