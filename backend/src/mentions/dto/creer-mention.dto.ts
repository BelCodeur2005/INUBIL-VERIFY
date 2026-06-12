import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  IsInt,
  IsBoolean,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreerMentionDto {
  @ApiProperty({ example: 'AB', description: 'Code unique par université', maxLength: 50 })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  code: string;

  @ApiProperty({ example: 'Assez Bien', maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nom: string;

  @ApiPropertyOptional({ example: 12, description: 'Note minimale (incluse)', minimum: 0, maximum: 20 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(20)
  note_min?: number;

  @ApiPropertyOptional({ example: 14, description: 'Note maximale (exclue)', minimum: 0, maximum: 20 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(20)
  note_max?: number;

  @ApiProperty({ format: 'uuid', example: 'univ-0000-0000-0000-000000000001', description: 'Université propriétaire' })
  @IsUUID()
  universite_id: string;

  @ApiPropertyOptional({ example: 3, default: 0, description: 'Ordre d\'affichage (1 = meilleur)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  ordre?: number;
}
