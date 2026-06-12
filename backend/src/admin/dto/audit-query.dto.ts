import { IsOptional, IsUUID, IsString, IsDateString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AuditQueryDto {
  @ApiPropertyOptional({ format: 'uuid', example: 'usr-0000-0000-0000-000000000001', description: 'Filtrer par utilisateur' })
  @IsOptional()
  @IsUUID()
  utilisateur_id?: string;

  @ApiPropertyOptional({ example: 'CREATE_DOCUMENT', description: 'Nom de l\'action à filtrer' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ example: 'documents', description: 'Nom du module à filtrer' })
  @IsOptional()
  @IsString()
  module?: string;

  @ApiPropertyOptional({ example: '2026-01-01', description: 'Date de début (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  date_debut?: string;

  @ApiPropertyOptional({ example: '2026-12-31', description: 'Date de fin (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  date_fin?: string;

  @ApiPropertyOptional({ example: 1, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 50, default: 50, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 50;
}
