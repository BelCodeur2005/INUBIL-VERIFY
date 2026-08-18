import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CleApiResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  universite_id: string;

  @ApiProperty({ example: 'Integration ERP RH' })
  nom: string;

  @ApiProperty({
    example: 'inub_k8zx',
    description: 'Préfixe visible (les 8 premiers chars)',
  })
  prefix: string;

  @ApiProperty({ example: ['verify:read', 'doc:read'] })
  permissions: string[];

  @ApiPropertyOptional({ example: '2027-01-01T00:00:00.000Z' })
  expiration: Date | null;

  @ApiProperty({ example: true })
  est_active: boolean;

  @ApiProperty({ example: [] })
  ip_whitelist: string[];

  @ApiPropertyOptional({ example: '2026-06-20T10:00:00.000Z' })
  derniere_utilisation: Date | null;

  @ApiProperty({ example: 142 })
  nb_utilisations: number;

  @ApiProperty()
  created_at: Date;

  @ApiPropertyOptional({
    example: 'inub_k8zx_aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456',
    description:
      'Clé en clair — retournée UNIQUEMENT à la création, jamais après',
  })
  cle_en_clair?: string;
}
