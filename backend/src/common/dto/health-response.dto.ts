import { ApiProperty } from '@nestjs/swagger';

/** Resultat de la sonde de sante (`GET /health`). */
export class HealthResponseDto {
  @ApiProperty({ example: 'ok', description: "Etat global de l'API." })
  status: string;

  @ApiProperty({
    example: '2026-06-02T10:15:30.000Z',
    description: 'Horodatage ISO 8601 de la reponse.',
  })
  timestamp: string;

  @ApiProperty({
    example: 1234,
    description: "Duree de fonctionnement du processus, en secondes.",
  })
  uptime: number;
}
