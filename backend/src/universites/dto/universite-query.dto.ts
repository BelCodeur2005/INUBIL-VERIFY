import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { statut_universite, type_universite } from '@prisma/client';

export class UniversiteQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: statut_universite })
  @IsOptional()
  @IsEnum(statut_universite)
  statut?: statut_universite;

  @ApiPropertyOptional({ enum: type_universite })
  @IsOptional()
  @IsEnum(type_universite)
  type?: type_universite;

  @ApiPropertyOptional({ example: 'Douala' })
  @IsOptional()
  @IsString()
  pays?: string;

  @ApiPropertyOptional({ example: 'IUT', description: 'Recherche dans nom et nom_court' })
  @IsOptional()
  @IsString()
  search?: string;
}
