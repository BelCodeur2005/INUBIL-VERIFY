import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PASSWORD_MIN_LENGTH_FLOOR } from '../../common/constants/password.constants';

export class RegisterDto {
  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  nom: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  prenom: string;

  @ApiProperty({ example: 'john.doe@inubil.com' })
  @IsEmail({}, { message: 'Email invalide' })
  email: string;

  @ApiProperty({
    example: 'MonMotDePasse1!',
    description:
      `Min ${PASSWORD_MIN_LENGTH_FLOOR} caracteres (le parametre systeme mot_de_passe_longueur_min peut exiger plus), ` +
      'au moins 1 majuscule, 1 minuscule, 1 chiffre, 1 caractere special.',
  })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH_FLOOR, { message: `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH_FLOOR} caracteres` })
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/, {
    message:
      'Le mot de passe doit contenir au moins 1 majuscule, 1 minuscule, 1 chiffre et 1 caractere special',
  })
  mot_de_passe: string;
}
