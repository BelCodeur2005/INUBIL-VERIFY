import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class AssignerDepartementsDto {
  @ApiProperty({
    type: [String],
    description:
      'Liste des IDs de departements a associer a l\'utilisateur (remplace l\'affectation existante). ' +
      'Liste vide = aucune restriction (compte "scolarite").',
    example: [],
  })
  @IsArray()
  @IsUUID('4', { each: true, message: 'departement_ids doit contenir des UUID v4 valides' })
  departement_ids: string[];
}
