import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConfigurationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'partage_duree_jours' })
  cle: string;

  @ApiProperty({ example: '30' })
  valeur: string;

  @ApiProperty({
    enum: ['string', 'number', 'boolean', 'json'],
    example: 'number',
  })
  type: string;

  @ApiPropertyOptional({
    example: 'Durée de validité des liens de partage (jours)',
  })
  description: string | null;

  @ApiProperty({ example: 'super_admin' })
  modifiable_par: string;

  @ApiProperty()
  updated_at: Date;
}
