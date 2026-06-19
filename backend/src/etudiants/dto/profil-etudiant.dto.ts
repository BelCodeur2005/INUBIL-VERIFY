import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProfilEtudiantDto {
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

  @ApiPropertyOptional({ example: 'https://cdn.inubil.com/photos/etu-001.jpg' })
  photo_url: string | null;

  @ApiPropertyOptional({ example: '2001-03-15T00:00:00.000Z' })
  date_naissance: Date | null;

  @ApiPropertyOptional({ example: 'Douala' })
  lieu_naissance: string | null;

  @ApiPropertyOptional({ example: 'Camerounaise' })
  nationalite: string | null;

  @ApiPropertyOptional({ example: 2023 })
  annee_entree: number | null;

  @ApiProperty({ example: 'ISTAMA INUBIL' })
  universite: string;

  @ApiProperty({ format: 'uuid', example: 'univ-0000-0000-0000-000000000001' })
  universite_id: string;

  @ApiProperty({ example: '2023-09-01T08:00:00.000Z' })
  created_at: Date;
}
