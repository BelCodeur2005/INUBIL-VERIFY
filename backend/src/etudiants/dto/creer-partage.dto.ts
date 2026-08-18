import {
  IsUUID,
  IsOptional,
  IsEmail,
  IsDateString,
  IsBoolean,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreerPartageDto {
  @ApiProperty({ format: 'uuid', example: 'doc-0000-0000-0000-000000000001', description: 'ID du document actif à partager' })
  @IsUUID()
  document_id: string;

  @ApiPropertyOptional({ example: 'recruteur@entreprise.cm', description: 'Si fourni, un email avec le lien est envoyé (fire & forget)' })
  @IsOptional()
  @IsEmail()
  email_destinataire?: string;

  @ApiPropertyOptional({ format: 'uuid', example: null, description: 'Université destinataire (optionnel)' })
  @IsOptional()
  @IsUUID()
  universite_destinataire_id?: string;

  @ApiPropertyOptional({
    example: '2026-12-31T23:59:59Z',
    description:
      'Date d\'expiration explicite du lien. Absent et permanent=false (defaut) : ' +
      'expiration calculee automatiquement a partir du parametre systeme partage_duree_jours ' +
      '(configurations, cle "partage_duree_jours", 30 jours par defaut si non configure).',
  })
  @IsOptional()
  @IsDateString()
  @ValidateIf((o) => o.date_expiration !== undefined)
  date_expiration?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'true = lien permanent, sans expiration. Ignore par date_expiration si les deux sont fournis.',
  })
  @IsOptional()
  @IsBoolean()
  permanent?: boolean;
}
