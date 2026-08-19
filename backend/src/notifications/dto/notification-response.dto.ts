import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  utilisateur_id: string;

  @ApiProperty({ example: 'diplome.valide' })
  type: string;

  @ApiProperty({ example: 'Diplôme validé' })
  titre: string;

  @ApiProperty({
    example: 'Le diplôme de KAMGA Bertrand a été ancré sur la blockchain.',
  })
  message: string;

  @ApiPropertyOptional({ example: '/universite/diplomes/abc-123' })
  lien: string | null;

  @ApiProperty({ enum: ['non_lue', 'lue', 'archivee'], example: 'non_lue' })
  statut: string;

  @ApiPropertyOptional()
  lue_le: Date | null;

  @ApiPropertyOptional()
  archivee_le: Date | null;

  @ApiProperty()
  created_at: Date;
}
