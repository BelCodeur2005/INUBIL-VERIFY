import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VerificationsEtudiantQueryDto {
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

export class VerificationEtudiantDto {
  @ApiProperty({ example: 'ver-0000-0000-0000-000000000001' })
  id: string;

  @ApiPropertyOptional({ example: 'doc-0000-0000-0000-000000000001' })
  document_id: string | null;

  @ApiPropertyOptional({ example: 'INUB-2026-0001' })
  numero_unique: string | null;

  @ApiPropertyOptional({ example: 'Licence' })
  type_document: string | null;

  @ApiProperty({ example: 'lien_unique', enum: ['lien_unique', 'qr_code', 'hash', 'upload_pdf'] })
  type_verification: string;

  @ApiProperty({ example: 'authentique', enum: ['authentique', 'revoque', 'non_trouve', 'falsifie'] })
  resultat: string;

  @ApiPropertyOptional({
    example: 'rh@orange.cm',
    description: 'Destinataire du lien de partage utilise, uniquement si la verification est passee par un partage cree par l\'etudiant.',
  })
  destinataire_partage: string | null;

  @ApiProperty({ example: '2026-08-20T10:00:00.000Z' })
  created_at: Date;
}

export class VerificationsEtudiantListeDto {
  @ApiProperty({ type: [VerificationEtudiantDto] })
  data: VerificationEtudiantDto[];

  @ApiProperty({ example: 12 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;
}
