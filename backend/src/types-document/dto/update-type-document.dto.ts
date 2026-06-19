import { PartialType, OmitType } from '@nestjs/swagger';
import { CreerTypeDocumentDto } from './creer-type-document.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTypeDocumentDto extends PartialType(
  OmitType(CreerTypeDocumentDto, ['universite_id'] as const),
) {
  @ApiPropertyOptional({ example: false, description: 'Désactiver ce type sans le supprimer' })
  @IsOptional()
  @IsBoolean()
  est_actif?: boolean;
}
