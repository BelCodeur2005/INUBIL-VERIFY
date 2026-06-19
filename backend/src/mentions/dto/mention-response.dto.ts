import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MentionResponseDto {
  @ApiProperty({ example: 'b1c2d3e4-0000-0000-0000-000000000001' })
  id: string;

  @ApiProperty({ example: 'AB' })
  code: string;

  @ApiProperty({ example: 'Assez Bien' })
  nom: string;

  @ApiPropertyOptional({ example: 12 })
  note_min: number | null;

  @ApiPropertyOptional({ example: 14 })
  note_max: number | null;

  @ApiPropertyOptional({ format: 'uuid', example: 'univ-0000-0000-0000-000000000001' })
  universite_id: string | null;

  @ApiProperty({ example: true })
  est_actif: boolean;

  @ApiProperty({ example: 3, description: 'Ordre d\'affichage (du plus élevé au plus bas)' })
  ordre: number;

  @ApiProperty({ example: '2026-06-12T00:00:00.000Z' })
  created_at: Date;
}
