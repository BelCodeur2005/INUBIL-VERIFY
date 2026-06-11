import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class ActiverInvitationDto {
  @ApiProperty({ description: "Token reçu par email (64 caractères hex)" })
  @IsString()
  @Length(1, 128)
  token: string;

  @ApiPropertyOptional({ description: 'Requis uniquement si le compte n\'existe pas encore' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  nom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 100)
  prenom?: string;

  @ApiPropertyOptional({
    description:
      'Requis si nouveau compte. Min 8 car., 1 maj., 1 min., 1 chiffre, 1 spécial.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/, {
    message:
      'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial',
  })
  mot_de_passe?: string;
}
