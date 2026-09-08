import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreerFiliereDto {
  @ApiProperty({
    example: 'GLSI',
    description: 'Code unique par université',
    maxLength: 50,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  code: string;

  @ApiProperty({ example: 'Génie Logiciel et Systèmes d\'Information', maxLength: 150 })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  nom: string;

  @ApiProperty({
    format: 'uuid',
    example: 'univ-0000-0000-0000-000000000001',
    description: 'Université propriétaire',
  })
  @IsUUID()
  universite_id: string;

  @ApiPropertyOptional({
    example: 0,
    default: 0,
    description: "Ordre d'affichage",
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  ordre?: number;
}
