import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BlockchainInfoDto {
  @ApiProperty({ example: true, description: 'Diplôme trouvé sur la blockchain' })
  enregistre: boolean;

  @ApiProperty({ example: false, description: 'Diplôme révoqué on-chain' })
  revoque: boolean;

  @ApiPropertyOptional({ example: '0xabc123...', description: 'Hash de la transaction d\'enregistrement' })
  transaction_hash: string | null;

  @ApiPropertyOptional({ example: '2026-06-14T10:00:00.000Z', description: 'Date d\'enregistrement sur la blockchain' })
  date_enregistrement: Date | null;

  @ApiProperty({ example: 'polygon_amoy', enum: ['polygon_amoy', 'polygon_mainnet'] })
  reseau: string;
}

export class MatierePublicDto {
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

export class DocumentPublicDto {
  @ApiProperty({ example: 'INUB-2026-0001' })
  numero_unique: string;

  @ApiPropertyOptional({ example: 'https://verify.inubil.com/d/INUB-2026-0001' })
  url_verification: string | null;

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

  @ApiProperty({ type: [MatierePublicDto] })
  matieres: MatierePublicDto[];

  @ApiProperty({ example: 'ISTAMA INUBIL' })
  universite: string;

  @ApiProperty({ example: 'actif', enum: ['actif', 'revoque', 'expire'] })
  statut: string;

  @ApiProperty({ example: true, description: 'Vérification cryptographique disponible via POST /verify/upload' })
  verifiable_par_upload: true;
}

export class VerifyResponseDto {
  @ApiProperty({ example: 'authentique', enum: ['authentique', 'revoque', 'non_trouve', 'falsifie'] })
  resultat: 'authentique' | 'revoque' | 'non_trouve' | 'falsifie';

  @ApiProperty({ example: 'Ce document est authentique et a été émis par ISTAMA INUBIL.' })
  message: string;

  @ApiProperty({ example: 'Comparez le hash affiché avec celui du fichier original pour une vérification complète.' })
  conseil_verification: string;

  @ApiPropertyOptional({ type: DocumentPublicDto })
  document: DocumentPublicDto | null;

  @ApiProperty({ example: 'ver-0000-0000-0000-000000000001' })
  verification_id: string;

  @ApiProperty({ example: '2026-06-12T10:30:00.000Z' })
  verifie_le: Date;

  @ApiPropertyOptional({ type: BlockchainInfoDto, description: 'Données on-chain Polygon. Null si blockchain non configurée.' })
  blockchain: BlockchainInfoDto | null;
}
