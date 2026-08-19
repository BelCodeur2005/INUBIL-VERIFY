import {
  IsString,
  IsOptional,
  IsIn,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePartenariatDto {
  @ApiPropertyOptional({ example: 'reconnaissance_mutuelle', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  type_partenariat?: string;

  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsOptional()
  @IsDateString()
  date_debut?: string;

  @ApiPropertyOptional({ example: '2029-12-31' })
  @IsOptional()
  @IsDateString()
  date_fin?: string;

  @ApiPropertyOptional({ example: 'Accord renouvelé pour 3 ans.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    example: 'https://r2.inubil.com/contrats/accord-v2.pdf',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  document_url?: string;

  @ApiPropertyOptional({ enum: ['actif', 'suspendu', 'expire'] })
  @IsOptional()
  @IsIn(['actif', 'suspendu', 'expire'])
  statut?: string;
}
