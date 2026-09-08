import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DepartementResponseDto {
  @ApiProperty({ example: 'c1d2e3f4-0000-0000-0000-000000000001' })
  id: string;

  @ApiProperty({ example: 'GI' })
  code: string;

  @ApiProperty({ example: 'Génie Informatique' })
  nom: string;

  @ApiPropertyOptional({ format: 'uuid', example: 'univ-0000-0000-0000-000000000001' })
  universite_id: string;

  @ApiProperty({ example: true })
  est_actif: boolean;

  @ApiProperty({ example: 0 })
  ordre: number;

  @ApiProperty({ example: '2026-06-12T00:00:00.000Z' })
  created_at: Date;

  @ApiProperty({ example: '2026-06-12T00:00:00.000Z' })
  updated_at: Date;
}
