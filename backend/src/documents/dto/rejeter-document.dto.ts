import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejeterDocumentDto {
  @ApiProperty({
    example: 'Le nom de l\'étudiant ne correspond pas au registre académique - vérifier et corriger',
    minLength: 10,
    description: 'Motif de rejet obligatoire (min 10 caractères) — visible par l\'agent de saisie',
  })
  @IsString()
  @MinLength(10)
  motif: string;
}
