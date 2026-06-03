import { ApiPropertyOptional } from '@nestjs/swagger';
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

export class UpdateUniversiteDto {
  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  nom?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nom_court?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  pays?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  ville?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adresse?: string;

  @ApiPropertyOptional({ enum: type_universite })
  @IsOptional()
  @IsEnum(type_universite, { message: 'Type invalide' })
  type?: type_universite;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({}, { message: 'URL du logo invalide' })
  @MaxLength(500)
  logo_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({}, { message: 'URL du site invalide' })
  @MaxLength(255)
  site_web?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail({}, { message: 'Email de contact invalide' })
  @MaxLength(255)
  email_contact?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  telephone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
