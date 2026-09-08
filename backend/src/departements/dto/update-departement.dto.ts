import { PartialType, OmitType } from '@nestjs/swagger';
import { CreerDepartementDto } from './creer-departement.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDepartementDto extends PartialType(
  OmitType(CreerDepartementDto, ['universite_id'] as const),
) {
  @ApiPropertyOptional({ example: false, description: 'Désactiver ce département sans le supprimer' })
  @IsOptional()
  @IsBoolean()
  est_actif?: boolean;
}
