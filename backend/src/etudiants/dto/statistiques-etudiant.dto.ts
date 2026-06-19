import { ApiProperty } from '@nestjs/swagger';

class StatistiquesDocumentsDto {
  @ApiProperty({ example: 3 })
  total: number;

  @ApiProperty({ example: 2 })
  actifs: number;

  @ApiProperty({ example: 0 })
  en_validation: number;

  @ApiProperty({ example: 1 })
  revoques: number;
}

class StatistiquesVerificationsDto {
  @ApiProperty({ example: 47 })
  total: number;

  @ApiProperty({ example: 5 })
  ce_mois: number;
}

class StatistiquesPartagesDto {
  @ApiProperty({ example: 2 })
  actifs: number;

  @ApiProperty({ example: 12 })
  total_consultations: number;
}

export class StatistiquesEtudiantDto {
  @ApiProperty({ type: StatistiquesDocumentsDto })
  documents: StatistiquesDocumentsDto;

  @ApiProperty({ type: StatistiquesVerificationsDto })
  verifications: StatistiquesVerificationsDto;

  @ApiProperty({ type: StatistiquesPartagesDto })
  partages: StatistiquesPartagesDto;
}
