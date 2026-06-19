import { IsOptional, IsIn, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StatsGrapheQueryDto {
  @ApiPropertyOptional({ enum: ['jour', 'mois'], example: 'jour', default: 'jour', description: 'Granularité temporelle du graphe' })
  @IsOptional()
  @IsIn(['jour', 'mois'])
  granularite?: 'jour' | 'mois' = 'jour';

  @ApiPropertyOptional({ example: '2026-01-01', description: 'Date de début (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  debut?: string;

  @ApiPropertyOptional({ example: '2026-12-31', description: 'Date de fin (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  fin?: string;
}

export class StatsGraphePointDto {
  @ApiProperty({ example: '2026-06-12' })
  date: string;

  @ApiProperty({ example: 42 })
  verifications: number;

  @ApiProperty({ example: 7 })
  documents_emis: number;
}
