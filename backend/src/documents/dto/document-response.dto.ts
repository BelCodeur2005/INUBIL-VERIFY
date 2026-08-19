import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MatiereResponseDto {
  @ApiProperty({ example: 'mat-0000-0000-0000-000000000001' })
  id: string;

  @ApiPropertyOptional({ example: 'INFO-301' })
  code_matiere: string | null;

  @ApiProperty({ example: 'Algorithmique et Structures de Données' })
  nom_matiere: string;

  @ApiProperty({ example: 3 })
  credits: number;

  @ApiProperty({ example: 2 })
  coefficient: number;

  @ApiPropertyOptional({ example: 14 })
  note: number | null;

  @ApiProperty({ example: 20 })
  note_max: number;

  @ApiProperty({ example: 'valide' })
  resultat: string;

  @ApiPropertyOptional({ example: 1 })
  semestre: number | null;

  @ApiPropertyOptional({ example: 'UE Fondamentale' })
  type_ue: string | null;

  @ApiProperty({ example: 1 })
  ordre: number;
}

export class DocumentResponseDto {
  @ApiProperty({ example: 'doc-0000-0000-0000-000000000001' })
  id: string;

  @ApiProperty({ example: 'INUB-2026-0001' })
  numero_unique: string;

  @ApiPropertyOptional({ example: 'https://verify.inubil.com/d/INUB-2026-0001' })
  url_verification: string | null;

  @ApiProperty({ format: 'uuid', example: 'b1e2d3f4-0000-0000-0000-000000000001' })
  etudiant_id: string;

  @ApiProperty({ format: 'uuid', example: 'c1d2e3f4-0000-0000-0000-000000000002' })
  universite_id: string;

  @ApiProperty({ format: 'uuid', example: 'd1e2f3a4-0000-0000-0000-000000000003' })
  type_document_id: string;

  @ApiPropertyOptional({ example: '2025-2026' })
  annee_academique: string | null;

  @ApiProperty({ example: '2026-06-12T00:00:00.000Z' })
  date_emission: Date;

  @ApiPropertyOptional({ example: 'Douala, Cameroun' })
  lieu_delivrance: string | null;

  @ApiPropertyOptional({ example: 'Licence en Informatique option Génie Logiciel' })
  filiere: string | null;

  @ApiPropertyOptional({ format: 'uuid', example: null })
  mention_id: string | null;

  @ApiPropertyOptional({ example: 13.5 })
  moyenne_generale: number | null;

  @ApiProperty({ example: 20 })
  note_sur: number;

  @ApiPropertyOptional({ example: 'a3f9c2d1e8b7...', description: 'Hash SHA-256 du PDF officiel (64 hex chars)' })
  hash_sha256: string | null;

  @ApiPropertyOptional({ example: null, description: 'Hash de transaction Polygon (#22)' })
  transaction_hash: string | null;

  @ApiPropertyOptional({ example: 'universites/.../qrcodes/2026/06/INUB-2026-0001-qr.png', description: 'Cle de stockage S3/R2 du QR code' })
  qr_code_url: string | null;

  @ApiPropertyOptional({ example: 'universites/.../documents/2026/06/INUB-2026-0001.pdf', description: 'Cle de stockage S3/R2 du PDF' })
  pdf_url: string | null;

  @ApiPropertyOptional({ example: 245 })
  pdf_taille_ko: number | null;

  @ApiProperty({ example: 'actif', enum: ['brouillon', 'en_validation', 'actif', 'revoque', 'expire'] })
  statut: string;

  @ApiPropertyOptional({ format: 'uuid' })
  saisi_par: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  valide_par: string | null;

  @ApiPropertyOptional({ example: '2026-06-12T14:30:00.000Z' })
  valide_le: Date | null;

  @ApiPropertyOptional({ example: '2026-06-12T14:30:00.000Z' })
  emis_le: Date | null;

  @ApiPropertyOptional({ example: { promotion: 'Major de promotion' } })
  donnees: any;

  @ApiProperty({ type: [MatiereResponseDto] })
  matieres: MatiereResponseDto[];

  @ApiProperty({ example: '2026-06-10T08:00:00.000Z' })
  created_at: Date;

  @ApiProperty({ example: '2026-06-12T14:30:00.000Z' })
  updated_at: Date;
}
