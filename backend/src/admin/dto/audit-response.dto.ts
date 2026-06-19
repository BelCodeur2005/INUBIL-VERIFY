import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuditEntryDto {
  @ApiProperty({ example: 'aud-0000-0000-0000-000000000001' })
  id: string;

  @ApiPropertyOptional({ format: 'uuid', example: 'usr-0000-0000-0000-000000000001' })
  utilisateur_id: string | null;

  @ApiPropertyOptional({ example: 'KAMGA Bertrand' })
  nom_utilisateur: string | null;

  @ApiProperty({ example: 'CREATE_DOCUMENT' })
  action: string;

  @ApiProperty({ example: 'documents' })
  module: string;

  @ApiPropertyOptional({ example: 'Document' })
  table_concernee: string | null;

  @ApiPropertyOptional({ example: 'doc-0000-0000-0000-000000000001' })
  enregistrement_id: string | null;

  @ApiPropertyOptional({ example: '192.168.1.42' })
  ip_address: string | null;

  @ApiPropertyOptional({ example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' })
  user_agent: string | null;

  @ApiProperty({ example: '2026-06-12T10:30:00.000Z' })
  created_at: Date;
}

export class AuditListDto {
  @ApiProperty({ type: [AuditEntryDto] })
  data: AuditEntryDto[];

  @ApiProperty({ example: 258 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 50 })
  limit: number;
}
