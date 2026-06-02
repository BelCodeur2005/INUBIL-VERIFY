import { ApiProperty } from '@nestjs/swagger';

/** Informations generales exposees a la racine de l'API (`GET /`). */
export class InfoResponseDto {
  @ApiProperty({ example: 'INUBIL Verify API', description: "Nom de l'API." })
  name: string;

  @ApiProperty({
    example: "Plateforme d'authentification de diplomes via blockchain",
    description: "Description courte de l'API.",
  })
  description: string;

  @ApiProperty({ example: '0.1.0', description: 'Version courante de l\'API.' })
  version: string;

  @ApiProperty({
    example: 'development',
    description: "Environnement d'execution (NODE_ENV).",
  })
  environment: string;
}
