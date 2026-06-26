import {
  IsString,
  IsOptional,
  IsIn,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertConfigurationDto {
  @ApiProperty({
    example: '30',
    description: 'Valeur stockée toujours en string',
  })
  @IsString()
  @MinLength(1)
  valeur: string;

  @ApiPropertyOptional({
    enum: ['string', 'number', 'boolean', 'json'],
    default: 'string',
  })
  @IsOptional()
  @IsIn(['string', 'number', 'boolean', 'json'])
  type?: string;

  @ApiPropertyOptional({
    example: 'Durée de validité des liens de partage (jours)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
