import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

/** Statuts applicables manuellement par un admin (en_attente_email est exclu). */
export enum StatutModifiable {
  ACTIF = 'actif',
  INACTIF = 'inactif',
  SUSPENDU = 'suspendu',
}

export class ChangerStatutUtilisateurDto {
  @ApiProperty({
    enum: StatutModifiable,
    description: 'Nouveau statut. Le statut "en_attente_email" ne peut pas etre defini manuellement.',
  })
  @IsEnum(StatutModifiable, {
    message: 'statut doit etre actif, inactif ou suspendu',
  })
  statut: StatutModifiable;

  @ApiPropertyOptional({
    description: 'Raison de la suspension ou desactivation (recommande).',
    example: 'Violation des conditions d\'utilisation.',
  })
  @IsOptional()
  @IsString()
  @MinLength(5)
  raison?: string;
}
