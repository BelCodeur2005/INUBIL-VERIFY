import {
  IsOptional,
  IsUUID,
  IsString,
  IsInt,
  IsBoolean,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

function versBooleen({ value }: { value: unknown }) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

export class EtudiantAdminQueryDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Filtrer par université (super-admin seulement)',
  })
  @IsOptional()
  @IsUUID()
  universite_id?: string;

  @ApiPropertyOptional({
    example: 'Kamga',
    description: 'Recherche sur nom, prénom ou matricule',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Filtrer par département',
  })
  @IsOptional()
  @IsUUID()
  departement_id?: string;

  @ApiPropertyOptional({
    example: 2023,
    description: "Filtrer par année d'entrée",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  annee_entree?: number;

  @ApiPropertyOptional({
    description:
      'true = a un compte de connexion actif, false = pas encore de compte, omis = tous',
  })
  @IsOptional()
  @Transform(versBooleen)
  @IsBoolean()
  a_compte?: boolean;

  @ApiPropertyOptional({
    description: 'true = au moins un document émis, false = aucun, omis = tous',
  })
  @IsOptional()
  @Transform(versBooleen)
  @IsBoolean()
  a_documents?: boolean;

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
