import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InvitationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'john.doe@istama.cm' })
  email: string;

  @ApiProperty({ example: 'collaborateur' })
  cible: string;

  @ApiProperty({ example: 'en_attente', enum: ['en_attente', 'acceptee', 'expiree'] })
  statut: string;

  @ApiProperty()
  expires_at: Date;

  @ApiPropertyOptional({ nullable: true })
  accepted_at: Date | null;

  @ApiProperty({ example: 0 })
  nb_relances: number;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  role_id: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  universite_id: string | null;

  @ApiProperty()
  created_at: Date;
}

export class InvitationListResponseDto {
  @ApiProperty({ type: [InvitationResponseDto] })
  data: InvitationResponseDto[];

  @ApiProperty({ example: 10 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}
