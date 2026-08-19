import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { PASSWORD_MIN_LENGTH_FLOOR } from '../../common/constants/password.constants';

/** Changement de mot de passe (`PATCH /auth/password`). */
export class ChangePasswordDto {
  @ApiProperty({ description: 'Mot de passe actuel.' })
  @IsString()
  @IsNotEmpty({ message: "L'ancien mot de passe est requis" })
  ancien_mot_de_passe: string;

  @ApiProperty({
    example: 'NouveauMotDePasse123!',
    description: `Nouveau mot de passe (${PASSWORD_MIN_LENGTH_FLOOR} caracteres min — le parametre systeme mot_de_passe_longueur_min peut exiger plus).`,
  })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH_FLOOR, { message: `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH_FLOOR} caracteres` })
  nouveau_mot_de_passe: string;

  @ApiProperty({ description: 'Confirmation du nouveau mot de passe.' })
  @IsString()
  @IsNotEmpty({ message: 'La confirmation est requise' })
  confirmation_mot_de_passe: string;
}
