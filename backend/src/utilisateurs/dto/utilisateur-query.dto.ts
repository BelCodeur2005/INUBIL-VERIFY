import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { statut_utilisateur } from '@prisma/client';

export class UtilisateurQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: statut_utilisateur })
  @IsOptional()
  @IsEnum(statut_utilisateur)
  statut?: statut_utilisateur;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  role_id?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  universite_id?: string;

  @ApiPropertyOptional({
    description: 'Recherche partielle sur nom, prenom ou email.',
    example: 'dupont',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
