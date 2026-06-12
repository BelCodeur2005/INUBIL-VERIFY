import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PartageResponseDto {
  @ApiProperty({ example: 'par-0000-0000-0000-000000000001' })
  id: string;

  @ApiProperty({ format: 'uuid', example: 'doc-0000-0000-0000-000000000001' })
  document_id: string;

  @ApiProperty({ example: 'Licence en Informatique — INUB-2026-0001' })
  document_titre: string;

  @ApiProperty({ example: 'a3f9c2d1e8b74f560ab12c3d4e5f6789a3f9c2d1e8b74f560ab12c3d4e5f6789', description: 'Token hex 64 chars — à inclure dans l\'URL de partage' })
  token_acces: string;

  @ApiPropertyOptional({ example: 'recruteur@entreprise.cm' })
  email_destinataire: string | null;

  @ApiPropertyOptional({ example: null })
  universite_destinataire: string | null;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  date_expiration: Date | null;

  @ApiProperty({ example: 'actif', enum: ['actif', 'expire', 'revoque'] })
  statut: string;

  @ApiProperty({ example: 5 })
  nb_consultations: number;

  @ApiPropertyOptional({ example: '2026-06-12T10:00:00.000Z' })
  derniere_consultation: Date | null;

  @ApiProperty({ example: '2026-06-10T09:00:00.000Z' })
  created_at: Date;
}
