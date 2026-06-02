import { ApiProperty } from '@nestjs/swagger';

/** Informations publiques de l'utilisateur connecte. */
export class AuthUserDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'admin@inubil.com' })
  email: string;

  @ApiProperty({ example: 'Doe' })
  nom: string;

  @ApiProperty({ example: 'John' })
  prenom: string;

  @ApiProperty({ format: 'uuid', nullable: true, description: "Identifiant du role (RBAC)." })
  role_id: string | null;
}

/** Jetons renvoyes apres login / refresh. */
export class AuthTokensDto {
  @ApiProperty({ description: 'JWT a placer dans Authorization: Bearer <token>.' })
  access_token: string;

  @ApiProperty({ description: 'JWT permettant de renouveler l access_token.' })
  refresh_token: string;

  @ApiProperty({ example: 'Bearer' })
  token_type: string;

  @ApiProperty({ example: 86400, description: "Duree de validite de l'access_token, en secondes." })
  expires_in: number;

  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;
}
