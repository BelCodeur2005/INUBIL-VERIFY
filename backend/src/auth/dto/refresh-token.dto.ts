import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/** Corps des endpoints /auth/refresh et /auth/logout. */
export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token JWT obtenu a la connexion.' })
  @IsString()
  @IsNotEmpty({ message: 'Le refresh token est requis' })
  refresh_token: string;
}
