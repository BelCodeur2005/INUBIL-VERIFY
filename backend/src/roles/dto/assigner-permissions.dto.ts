import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class AssignerPermissionsDto {
  @ApiProperty({
    description: 'Liste exhaustive des IDs de permissions à attribuer au rôle (remplace les précédentes).',
    type: [String],
    example: ['uuid-permission-1', 'uuid-permission-2'],
  })
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true, message: 'Chaque permission_id doit être un UUID valide' })
  permission_ids: string[];
}
