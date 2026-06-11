import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VerificationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'qr_code', enum: ['lien_unique', 'qr_code', 'hash', 'upload_pdf'] })
  type_verification: string;

  @ApiProperty({ example: 'authentique', enum: ['authentique', 'revoque', 'non_trouve', 'falsifie'] })
  resultat: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  document_id: string | null;

  @ApiProperty()
  rapport_genere: boolean;

  @ApiPropertyOptional({ nullable: true })
  rapport_pdf_url: string | null;

  @ApiPropertyOptional({ nullable: true })
  pays: string | null;

  @ApiPropertyOptional({ nullable: true })
  ville: string | null;

  @ApiPropertyOptional({ nullable: true })
  organisation: string | null;

  @ApiProperty()
  created_at: Date;
}

export class VerificationAdminResponseDto extends VerificationResponseDto {
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  utilisateur_id: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  partage_id: string | null;

  @ApiPropertyOptional({ nullable: true })
  hash_soumis: string | null;

  @ApiPropertyOptional({ nullable: true })
  ip_address: string | null;
}

export class VerificationListResponseDto {
  @ApiProperty({ type: [VerificationResponseDto] })
  data: VerificationResponseDto[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}

export class VerificationAdminListResponseDto {
  @ApiProperty({ type: [VerificationAdminResponseDto] })
  data: VerificationAdminResponseDto[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}
