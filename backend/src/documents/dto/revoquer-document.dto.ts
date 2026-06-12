import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RevoquerDocumentDto {
  @ApiProperty({
    example: 'Erreur sur le nom de l\'étudiant — document réémis sous le numéro INUB-2026-0042',
    minLength: 10,
    description: 'Motif de révocation obligatoire (min 10 caractères)',
  })
  @IsString()
  @MinLength(10)
  raison: string;
}
