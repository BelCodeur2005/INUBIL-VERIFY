import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignerRoleDto {
  @ApiProperty({
    format: 'uuid',
    description: 'ID du role a assigner a l\'utilisateur.',
  })
  @IsUUID('4', { message: 'role_id doit etre un UUID v4 valide' })
  role_id: string;
}
