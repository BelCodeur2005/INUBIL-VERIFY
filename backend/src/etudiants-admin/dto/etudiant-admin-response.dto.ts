import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EtudiantAdminResponseDto {
  @ApiProperty({ example: 'etu-0000-0000-0000-000000000001' })
  id: string;

  @ApiProperty({ example: 'ISTAMA-2023-0042' })
  numero_etudiant: string;

  @ApiProperty({ example: 'KAMGA' })
  nom: string;

  @ApiProperty({ example: 'Bertrand' })
  prenom: string;

  @ApiPropertyOptional({ example: 'bertrand.kamga@istama.cm' })
  email: string | null;

  @ApiPropertyOptional({ example: '+237 6 70 00 00 00' })
  telephone: string | null;

  @ApiPropertyOptional({ example: '2001-03-15T00:00:00.000Z' })
  date_naissance: Date | null;

  @ApiPropertyOptional({ example: 'Douala' })
  lieu_naissance: string | null;

  @ApiPropertyOptional({ example: 'Camerounaise' })
  nationalite: string | null;

  @ApiPropertyOptional({ example: 'https://cdn.inubil.com/photos/etu-001.jpg' })
  photo_url: string | null;

  @ApiPropertyOptional({ example: 2023 })
  annee_entree: number | null;

  @ApiProperty({ format: 'uuid', example: 'univ-0000-0000-0000-000000000001' })
  universite_id: string;

  @ApiProperty({ example: 'ISTAMA INUBIL' })
  universite_nom: string;

  @ApiProperty({ example: 3, description: 'Nombre de documents émis pour cet étudiant' })
  nb_documents: number;

  @ApiProperty({ example: '2023-09-01T08:00:00.000Z' })
  created_at: Date;

  @ApiProperty({ example: '2026-06-12T10:00:00.000Z' })
  updated_at: Date;
}

export class EtudiantAdminListeDto {
  @ApiProperty({ type: [EtudiantAdminResponseDto] })
  data: EtudiantAdminResponseDto[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;
}
