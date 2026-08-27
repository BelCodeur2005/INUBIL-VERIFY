import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DocumentsEtudiantQueryDto {
  @ApiPropertyOptional({ enum: ['brouillon', 'en_validation', 'actif', 'revoque', 'expire'], example: 'actif' })
  @IsOptional()
  @IsIn(['brouillon', 'en_validation', 'actif', 'revoque', 'expire'])
  statut?: string;

  @ApiPropertyOptional({ example: 1, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}

export class MatiereEtudiantDto {
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

export class DocumentEtudiantDto {
  @ApiProperty({ example: 'doc-0000-0000-0000-000000000001' })
  id: string;

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

  @ApiPropertyOptional({ example: '2026-06-12T00:00:00.000Z' })
  date_emission: Date | null;

  @ApiProperty({ example: 'actif', enum: ['brouillon', 'en_validation', 'actif', 'revoque', 'expire'] })
  statut: string;

  @ApiPropertyOptional({ example: 'Assez Bien' })
  mention: string | null;

  @ApiPropertyOptional({ example: 13.5 })
  moyenne_generale: number | null;

  @ApiPropertyOptional({ example: 'https://verify.inubil.com/d/INUB-2026-0001' })
  url_verification: string | null;

  @ApiProperty({ type: [MatiereEtudiantDto] })
  matieres: MatiereEtudiantDto[];

  @ApiProperty({ example: 'ISTAMA INUBIL' })
  universite: string;

  @ApiPropertyOptional({ example: 'a1b2c3...', description: 'Empreinte SHA-256 du PDF, presente une fois le document actif.' })
  hash_sha256: string | null;

  @ApiPropertyOptional({ example: '0xabc123...' })
  transaction_hash: string | null;

  @ApiPropertyOptional({ example: 'polygon_amoy' })
  reseau: string | null;

  @ApiPropertyOptional({ example: '1234567' })
  bloc_numero: string | null;

  @ApiPropertyOptional({ example: '2026-06-12T00:00:00.000Z' })
  date_enregistrement: Date | null;

  @ApiProperty({ example: true, description: 'True si un PDF est associe (GET .../documents/:id/pdf disponible).' })
  a_un_pdf: boolean;
}

export class DocumentsEtudiantListeDto {
  @ApiProperty({ type: [DocumentEtudiantDto] })
  data: DocumentEtudiantDto[];

  @ApiProperty({ example: 3 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;
}
