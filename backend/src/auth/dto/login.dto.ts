import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@inubil.com', description: "Email de l'utilisateur." })
  @IsEmail({}, { message: 'Email invalide' })
  email: string;

  @ApiProperty({ example: 'MotDePasse123!', description: 'Mot de passe en clair.' })
  @IsString()
  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  mot_de_passe: string;
}
