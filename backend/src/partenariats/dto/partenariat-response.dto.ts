import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PartenariatResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  universite_id: string;

  @ApiProperty({ format: 'uuid' })
  universite_liee_id: string;

  @ApiPropertyOptional({ example: 'École Polytechnique de Yaoundé' })
  universite_liee_nom?: string;

  @ApiProperty({ example: 'echange_diplomes' })
  type_partenariat: string;

  @ApiPropertyOptional()
  date_debut: Date | null;

  @ApiPropertyOptional()
  date_fin: Date | null;

  @ApiPropertyOptional({
    example: 'Accord de reconnaissance mutuelle des diplômes de licence.',
  })
  description: string | null;

  @ApiPropertyOptional()
  document_url: string | null;

  @ApiProperty({ example: 'actif' })
  statut: string;

  @ApiProperty()
  created_at: Date;
}
