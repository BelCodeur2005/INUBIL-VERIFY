import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { statut_universite, type_universite } from '@prisma/client';

export class UniversiteResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() nom: string;
  @ApiPropertyOptional() nom_court?: string | null;
  @ApiProperty() pays: string;
  @ApiPropertyOptional() ville?: string | null;
  @ApiPropertyOptional() adresse?: string | null;
  @ApiProperty({ enum: type_universite }) type: type_universite;
  @ApiPropertyOptional() logo_url?: string | null;
  @ApiPropertyOptional() site_web?: string | null;
  @ApiPropertyOptional() email_contact?: string | null;
  @ApiPropertyOptional() telephone?: string | null;
  @ApiPropertyOptional() description?: string | null;
  @ApiProperty({ enum: statut_universite }) statut: statut_universite;
  @ApiPropertyOptional() approuvee_par?: string | null;
  @ApiPropertyOptional() approuvee_le?: Date | null;
  @ApiPropertyOptional() raison_rejet?: string | null;
  @ApiPropertyOptional() created_by?: string | null;
  @ApiProperty() created_at: Date;
  @ApiProperty() updated_at: Date;
}

export class UniversiteListResponseDto {
  @ApiProperty({ type: [UniversiteResponseDto] }) data: UniversiteResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}
