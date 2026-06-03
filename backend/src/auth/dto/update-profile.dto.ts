import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Champs modifiables du profil (`PATCH /auth/me`). Tous optionnels. */
export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  nom?: string;

  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  prenom?: string;

  @ApiPropertyOptional({
    example: 'john.doe@inubil.com',
    description: "Nouvel email — declenche une re-verification.",
  })
  @IsOptional()
  @IsEmail({}, { message: 'Email invalide' })
  email?: string;

  @ApiPropertyOptional({
    description:
      "Mot de passe actuel — OBLIGATOIRE pour changer l'email (re-authentification).",
  })
  @IsOptional()
  @IsString()
  mot_de_passe_actuel?: string;
}
