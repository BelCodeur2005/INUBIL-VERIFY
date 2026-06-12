import {
  IsString,
  IsOptional,
  IsUUID,
  IsEmail,
  IsDateString,
  IsInt,
  IsUrl,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreerEtudiantAdminDto {
  @ApiProperty({ example: 'ISTAMA-2023-0042', description: 'Matricule unique de l\'étudiant', maxLength: 50 })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  numero_etudiant: string;

  @ApiProperty({ example: 'KAMGA', maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nom: string;

  @ApiProperty({ example: 'Bertrand', maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  prenom: string;

  @ApiProperty({ format: 'uuid', example: 'univ-0000-0000-0000-000000000001', description: 'Université d\'appartenance' })
  @IsUUID()
  universite_id: string;

  @ApiPropertyOptional({ example: '2001-03-15', description: 'Date de naissance (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  date_naissance?: string;

  @ApiPropertyOptional({ example: 'Douala', maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  lieu_naissance?: string;

  @ApiPropertyOptional({ example: 'Camerounaise', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nationalite?: string;

  @ApiPropertyOptional({ example: 'bertrand.kamga@istama.cm' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+237 6 70 00 00 00', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  telephone?: string;

  @ApiPropertyOptional({ example: 'https://cdn.inubil.com/photos/etu-001.jpg' })
  @IsOptional()
  @IsUrl()
  photo_url?: string;

  @ApiPropertyOptional({ example: 2023, description: 'Année d\'entrée dans l\'établissement', minimum: 1990, maximum: 2100 })
  @IsOptional()
  @IsInt()
  @Min(1990)
  @Max(2100)
  annee_entree?: number;
}
