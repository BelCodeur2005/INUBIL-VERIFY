import { ApiProperty } from '@nestjs/swagger';

/** Une session active de l'utilisateur. */
export class SessionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ nullable: true, example: '192.168.1.10', description: 'Adresse IP de connexion.' })
  ip_address: string | null;

  @ApiProperty({ nullable: true, description: 'Navigateur / client (user-agent).' })
  user_agent: string | null;

  @ApiProperty({ description: 'Date de creation de la session.' })
  created_at: Date;

  @ApiProperty({ description: "Date d'expiration (fenetre d'inactivite glissante)." })
  expires_at: Date;
}
