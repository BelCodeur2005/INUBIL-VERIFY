import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

/** Préférences de notification email modifiables (`PATCH /auth/me/preferences`). Fusionnées, jamais remplacées en bloc. */
export class UpdatePreferencesDto {
  @ApiPropertyOptional({
    description: "Alerte email quand un document que j'ai saisi est validé.",
  })
  @IsOptional()
  @IsBoolean()
  documents_valides?: boolean;

  @ApiPropertyOptional({
    description: "Alerte email quand un document que j'ai saisi est rejeté.",
  })
  @IsOptional()
  @IsBoolean()
  documents_rejetes?: boolean;

  @ApiPropertyOptional({
    description: 'Alerte email en cas de connexion inhabituelle.',
  })
  @IsOptional()
  @IsBoolean()
  connexion_inhabituelle?: boolean;
}
