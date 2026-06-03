import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

/** Changement de mot de passe (`PATCH /auth/password`). */
export class ChangePasswordDto {
  @ApiProperty({ description: 'Mot de passe actuel.' })
  @IsString()
  @IsNotEmpty({ message: "L'ancien mot de passe est requis" })
  ancien_mot_de_passe: string;

  @ApiProperty({ example: 'NouveauMotDePasse123!', description: 'Nouveau mot de passe (8 caracteres min).' })
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caracteres' })
  nouveau_mot_de_passe: string;

  @ApiProperty({ description: 'Confirmation du nouveau mot de passe.' })
  @IsString()
  @IsNotEmpty({ message: 'La confirmation est requise' })
  confirmation_mot_de_passe: string;
}
