import {
  IsString,
  IsArray,
  IsUrl,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreerWebhookDto {
  @ApiProperty({ example: 'Webhook ERP diplômes', maxLength: 100 })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  nom: string;

  @ApiProperty({ example: 'https://erp.exemple.cm/webhooks/inubil' })
  @IsUrl({ require_tld: false })
  url: string;

  @ApiProperty({
    example: ['diplome.valide', 'diplome.revoque'],
    description:
      'Événements déclencheurs : diplome.valide | diplome.revoque | etudiant.cree',
  })
  @IsArray()
  @IsString({ each: true })
  evenements: string[];
}
