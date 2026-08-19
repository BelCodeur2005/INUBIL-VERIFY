import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WebhookResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  universite_id: string;

  @ApiProperty({ example: 'Webhook ERP diplômes' })
  nom: string;

  @ApiProperty({ example: 'https://erp.exemple.cm/webhooks/inubil' })
  url: string;

  @ApiProperty({ example: ['diplome.valide', 'diplome.revoque'] })
  evenements: string[];

  @ApiProperty({ enum: ['actif', 'inactif', 'en_erreur'], example: 'actif' })
  statut: string;

  @ApiProperty({ example: 142 })
  nb_succes: number;

  @ApiProperty({ example: 3 })
  nb_echecs: number;

  @ApiPropertyOptional()
  derniere_livraison: Date | null;

  @ApiProperty()
  created_at: Date;
}

export class WebhookLivraisonResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'diplome.valide' })
  evenement: string;

  @ApiPropertyOptional({ example: 200 })
  statut_http: number | null;

  @ApiProperty({ example: true })
  succes: boolean;

  @ApiProperty({ example: 1 })
  tentative: number;

  @ApiPropertyOptional({ example: 245 })
  duree_ms: number | null;

  @ApiProperty()
  created_at: Date;
}
