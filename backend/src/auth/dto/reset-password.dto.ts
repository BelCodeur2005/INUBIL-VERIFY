import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { PASSWORD_MIN_LENGTH_FLOOR } from '../../common/constants/password.constants';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token de reinitialisation recu par email (valide 1h).' })
  @IsString()
  @IsNotEmpty({ message: 'Le token est requis' })
  token: string;

  @ApiProperty({
    example: 'NouveauMotDePasse123!',
    description: `Nouveau mot de passe (${PASSWORD_MIN_LENGTH_FLOOR} caracteres min — le parametre systeme mot_de_passe_longueur_min peut exiger plus).`,
  })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH_FLOOR, { message: `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH_FLOOR} caracteres` })
  nouveau_mot_de_passe: string;
}
