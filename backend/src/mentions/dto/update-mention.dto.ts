import { PartialType, OmitType } from '@nestjs/swagger';
import { CreerMentionDto } from './creer-mention.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMentionDto extends PartialType(
  OmitType(CreerMentionDto, ['universite_id'] as const),
) {
  @ApiPropertyOptional({ example: false, description: 'Désactiver cette mention sans la supprimer' })
  @IsOptional()
  @IsBoolean()
  est_actif?: boolean;
}
