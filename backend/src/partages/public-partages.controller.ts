import { Controller, Get, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PublicPartagesService } from './public-partages.service';
import { PartagePublicResponseDto } from './dto/partage-public-response.dto';

/**
 * Endpoint 100% public — aucun JWT requis.
 * Le token 64-chars hex (256 bits d'entropie) est la preuve d'accès.
 */
@Controller('partages')
export class PublicPartagesController {
  constructor(private readonly service: PublicPartagesService) {}

  /**
   * GET /partages/:token
   * Accède au document partagé via un lien token.
   * Vérifie expiration, incrémente nb_consultations, retourne le document.
   */
  @Get(':token')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  acceder(@Param('token') token: string): Promise<PartagePublicResponseDto> {
    return this.service.accederParToken(token);
  }
}
