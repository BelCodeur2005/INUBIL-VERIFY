import { IsOptional, IsUUID, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TypeDocumentQueryDto {
  @ApiPropertyOptional({ format: 'uuid', example: 'univ-0000-0000-0000-000000000001', description: 'Filtrer par université' })
  @IsOptional()
  @IsUUID()
  universite_id?: string;

  @ApiPropertyOptional({ enum: ['diplome', 'releve', 'attestation', 'certificat', 'autre'], example: 'diplome' })
  @IsOptional()
  @IsIn(['diplome', 'releve', 'attestation', 'certificat', 'autre'])
  categorie?: string;

  @ApiPropertyOptional({ example: true, description: 'true = actifs seulement, false = inactifs seulement, omis = tous' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  est_actif?: boolean;
}
