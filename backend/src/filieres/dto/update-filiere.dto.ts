import { PartialType, OmitType } from '@nestjs/swagger';
import { CreerFiliereDto } from './creer-filiere.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFiliereDto extends PartialType(
  OmitType(CreerFiliereDto, ['universite_id'] as const),
) {
  @ApiPropertyOptional({
    example: false,
    description: 'Désactiver cette filière sans la supprimer',
  })
  @IsOptional()
  @IsBoolean()
  est_actif?: boolean;
}
