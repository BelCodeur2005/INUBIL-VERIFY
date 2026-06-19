import { ApiProperty } from '@nestjs/swagger';

class StatsUniversitesDto {
  @ApiProperty({ example: 3 })
  actives: number;

  @ApiProperty({ example: 4 })
  total: number;
}

class StatsDocumentsDto {
  @ApiProperty({ example: 120 })
  total: number;

  @ApiProperty({ example: 95 })
  actifs: number;

  @ApiProperty({ example: 8 })
  en_validation: number;

  @ApiProperty({ example: 5 })
  revoques: number;
}

class StatsVerificationsDto {
  @ApiProperty({ example: 342 })
  total: number;

  @ApiProperty({ example: 27 })
  ce_mois: number;
}

class StatsPartagesDto {
  @ApiProperty({ example: 14 })
  actifs: number;
}

export class StatistiquesGlobalesDto {
  @ApiProperty({ type: StatsUniversitesDto })
  universites: StatsUniversitesDto;

  @ApiProperty({ type: StatsDocumentsDto })
  documents: StatsDocumentsDto;

  @ApiProperty({ type: StatsVerificationsDto })
  verifications: StatsVerificationsDto;

  @ApiProperty({ example: 87 })
  etudiants: number;

  @ApiProperty({ example: 12 })
  utilisateurs: number;

  @ApiProperty({ type: StatsPartagesDto })
  partages: StatsPartagesDto;
}
