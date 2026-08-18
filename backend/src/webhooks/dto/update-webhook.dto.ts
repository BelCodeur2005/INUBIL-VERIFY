import {
  IsString,
  IsArray,
  IsUrl,
  IsOptional,
  IsIn,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateWebhookDto {
  @ApiPropertyOptional({ example: 'Webhook ERP v2', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  nom?: string;

  @ApiPropertyOptional({ example: 'https://erp.exemple.cm/webhooks/v2' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  url?: string;

  @ApiPropertyOptional({ example: ['diplome.valide'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evenements?: string[];

  @ApiPropertyOptional({ enum: ['actif', 'inactif'] })
  @IsOptional()
  @IsIn(['actif', 'inactif'])
  statut?: 'actif' | 'inactif';
}
