import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MatierePartageDto {
  @ApiProperty({ example: 'Algorithmique et Structures de Données' })
  nom_matiere: string;

  @ApiPropertyOptional({ example: 14 })
  note: number | null;

  @ApiProperty({ example: 20 })
  note_max: number;

  @ApiProperty({ example: 'valide' })
  resultat: string;

  @ApiPropertyOptional({ example: 1 })
  semestre: number | null;
}

export class DocumentPartageDto {
  @ApiProperty({ example: 'INUB-2026-0001' })
  numero_unique: string;

  @ApiProperty({ example: 'Licence' })
  type_document: string;

  @ApiProperty({ example: 'diplome', enum: ['diplome', 'releve_notes', 'attestation'] })
  categorie: string;

  @ApiPropertyOptional({ example: 'Licence en Informatique option Génie Logiciel' })
  filiere: string | null;

  @ApiPropertyOptional({ example: '2025-2026' })
  annee_academique: string | null;

  @ApiProperty({ example: '2026-06-12T00:00:00.000Z' })
  date_emission: Date;

  @ApiProperty({ example: 'KAMGA Bertrand' })
  etudiant_nom: string;

  @ApiPropertyOptional({ example: 'Assez Bien' })
  mention: string | null;

  @ApiPropertyOptional({ example: 13.5 })
  moyenne_generale: number | null;

  @ApiProperty({ type: [MatierePartageDto] })
  matieres: MatierePartageDto[];

  @ApiProperty({ example: 'ISTAMA INUBIL' })
  universite: string;

  @ApiProperty({ example: 'actif', enum: ['actif', 'revoque', 'expire'] })
  statut: string;

  @ApiPropertyOptional({ example: 'https://verify.inubil.com/d/INUB-2026-0001' })
  url_verification: string | null;
}

class InfoPartageDto {
  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  date_expiration: Date | null;

  @ApiProperty({ example: 5 })
  nb_consultations: number;
}

export class PartagePublicResponseDto {
  @ApiProperty({ type: DocumentPartageDto })
  document: DocumentPartageDto;

  @ApiProperty({ type: InfoPartageDto })
  partage: InfoPartageDto;
}
