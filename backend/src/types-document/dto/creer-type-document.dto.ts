import {
  IsString,
  IsOptional,
  IsUUID,
  IsIn,
  IsInt,
  IsBoolean,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreerTypeDocumentDto {
  @ApiProperty({ example: 'LIC-INFO', description: 'Code unique par université (sera mis en majuscules)', maxLength: 50 })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  code: string;

  @ApiProperty({ example: 'Licence en Informatique', maxLength: 200 })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  nom: string;

  @ApiPropertyOptional({ example: 'Licence', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nom_court?: string;

  @ApiProperty({ enum: ['diplome', 'releve', 'attestation', 'certificat', 'autre'], example: 'diplome' })
  @IsIn(['diplome', 'releve', 'attestation', 'certificat', 'autre'])
  categorie: string;

  @ApiPropertyOptional({ example: 3, description: 'Niveau Bac+ (1 à 8)', minimum: 1, maximum: 8 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  niveau_bac_plus?: number;

  @ApiPropertyOptional({ example: 'Cameroun', default: 'Cameroun' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  pays?: string;

  @ApiProperty({ format: 'uuid', example: 'univ-0000-0000-0000-000000000001', description: 'Université propriétaire' })
  @IsUUID()
  universite_id: string;

  @ApiPropertyOptional({ example: true, default: false, description: 'Ce type inclut une liste de matières' })
  @IsOptional()
  @IsBoolean()
  a_matieres?: boolean;

  @ApiPropertyOptional({ example: false, default: false, description: 'Visible par les universités partenaires' })
  @IsOptional()
  @IsBoolean()
  est_partage?: boolean;

  @ApiPropertyOptional({ example: 0, default: 0, description: 'Ordre d\'affichage' })
  @IsOptional()
  @IsInt()
  @Min(0)
  ordre?: number;
}
