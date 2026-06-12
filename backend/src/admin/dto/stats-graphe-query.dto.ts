import { IsOptional, IsIn, IsDateString } from 'class-validator';

export class StatsGrapheQueryDto {
  @IsOptional()
  @IsIn(['jour', 'mois'])
  granularite?: 'jour' | 'mois' = 'jour';

  @IsOptional()
  @IsDateString()
  debut?: string;

  @IsOptional()
  @IsDateString()
  fin?: string;
}

export class StatsGraphePointDto {
  date: string;
  verifications: number;
  documents_emis: number;
}
