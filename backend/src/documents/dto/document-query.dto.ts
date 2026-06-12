import { IsOptional, IsUUID, IsIn, IsISO8601 } from 'class-validator';
import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DocumentQueryDto {
  @ApiPropertyOptional({ enum: ['brouillon', 'en_validation', 'actif', 'revoque', 'expire'], example: 'actif' })
  @IsOptional()
  @IsIn(['brouillon', 'en_validation', 'actif', 'revoque', 'expire'])
  statut?: string;

  @ApiPropertyOptional({ format: 'uuid', example: 'b1e2d3f4-0000-0000-0000-000000000001' })
  @IsOptional()
  @IsUUID()
  universite_id?: string;

  @ApiPropertyOptional({ format: 'uuid', example: 'c1d2e3f4-0000-0000-0000-000000000002' })
  @IsOptional()
  @IsUUID()
  etudiant_id?: string;

  @ApiPropertyOptional({ format: 'uuid', example: 'd1e2f3a4-0000-0000-0000-000000000003' })
  @IsOptional()
  @IsUUID()
  type_document_id?: string;

  @ApiPropertyOptional({ example: '2026-01-01', description: 'Filtre date d\'émission ≥ (ISO 8601)' })
  @IsOptional()
  @IsISO8601()
  date_debut?: string;

  @ApiPropertyOptional({ example: '2026-12-31', description: 'Filtre date d\'émission ≤ (ISO 8601)' })
  @IsOptional()
  @IsISO8601()
  date_fin?: string;

  @ApiPropertyOptional({ example: 1, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}
