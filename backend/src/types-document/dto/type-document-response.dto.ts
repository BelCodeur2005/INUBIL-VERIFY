import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TypeDocumentResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-0000-0000-0000-000000000001' })
  id: string;

  @ApiProperty({ example: 'LIC-INFO' })
  code: string;

  @ApiProperty({ example: 'Licence en Informatique' })
  nom: string;

  @ApiPropertyOptional({ example: 'Licence' })
  nom_court: string | null;

  @ApiProperty({ example: 'diplome', enum: ['diplome', 'releve', 'attestation', 'certificat', 'autre'] })
  categorie: string;

  @ApiPropertyOptional({ example: 3, description: 'Niveau Bac+' })
  niveau_bac_plus: number | null;

  @ApiPropertyOptional({ example: 'Cameroun' })
  pays: string | null;

  @ApiPropertyOptional({ format: 'uuid', example: 'univ-0000-0000-0000-000000000001' })
  universite_id: string | null;

  @ApiProperty({ example: true, description: 'Ce type inclut une liste de matières (relevé de notes)' })
  a_matieres: boolean;

  @ApiProperty({ example: false, description: 'Visible par les universités partenaires' })
  est_partage: boolean;

  @ApiProperty({ example: true })
  est_actif: boolean;

  @ApiProperty({ example: 0 })
  ordre: number;

  @ApiProperty({ example: '2026-06-12T00:00:00.000Z' })
  created_at: Date;

  @ApiProperty({ example: '2026-06-12T00:00:00.000Z' })
  updated_at: Date;
}
