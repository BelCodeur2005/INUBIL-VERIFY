import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import { type_universite } from '@prisma/client';

export class CreateUniversiteDto {
  @ApiProperty({ example: 'Institut Universitaire de Technologie de Douala', maxLength: 255 })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  nom: string;

  @ApiPropertyOptional({ example: 'IUT Douala', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nom_court?: string;

  @ApiPropertyOptional({ example: 'Cameroun', default: 'Cameroun' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  pays?: string;

  @ApiPropertyOptional({ example: 'Douala' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  ville?: string;

  @ApiPropertyOptional({ example: 'Boulevard de la République, Akwa' })
  @IsOptional()
  @IsString()
  adresse?: string;

  @ApiProperty({
    enum: type_universite,
    default: type_universite.privee,
    example: type_universite.privee,
  })
  @IsEnum(type_universite, { message: 'Type invalide' })
  type: type_universite;

  @ApiPropertyOptional({ example: 'https://cdn.inubil.com/logos/iut-dla.png' })
  @IsOptional()
  @IsUrl({}, { message: 'URL du logo invalide' })
  @MaxLength(500)
  logo_url?: string;

  @ApiPropertyOptional({ example: 'https://iut-douala.cm' })
  @IsOptional()
  @IsUrl({}, { message: 'URL du site invalide' })
  @MaxLength(255)
  site_web?: string;

  @ApiPropertyOptional({ example: 'contact@iut-douala.cm' })
  @IsOptional()
  @IsEmail({}, { message: 'Email de contact invalide' })
  @MaxLength(255)
  email_contact?: string;

  @ApiPropertyOptional({ example: '+237 6 00 00 00 00' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  telephone?: string;

  @ApiPropertyOptional({ example: "Institut d'excellence en technologie appliquée." })
  @IsOptional()
  @IsString()
  description?: string;
}
