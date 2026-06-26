import {
  IsString,
  IsUUID,
  IsOptional,
  IsDateString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreerPartenariatDto {
  @ApiProperty({ format: 'uuid', description: 'Université partenaire' })
  @IsUUID()
  universite_liee_id: string;

  @ApiProperty({
    example: 'echange_diplomes',
    description:
      'Type : echange_diplomes | reconnaissance_mutuelle | passerelle | autre',
    maxLength: 50,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  type_partenariat: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  date_debut?: string;

  @ApiPropertyOptional({ example: '2028-12-31' })
  @IsOptional()
  @IsDateString()
  date_fin?: string;

  @ApiPropertyOptional({
    example: 'Accord de reconnaissance mutuelle des diplômes de licence.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    example: 'https://r2.inubil.com/contrats/accord-2026.pdf',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  document_url?: string;
}
