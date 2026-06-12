import { IsOptional, IsUUID, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class EtudiantAdminQueryDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Filtrer par université (super-admin seulement)' })
  @IsOptional()
  @IsUUID()
  universite_id?: string;

  @ApiPropertyOptional({ example: 'Kamga', description: 'Recherche sur nom, prénom ou matricule' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
