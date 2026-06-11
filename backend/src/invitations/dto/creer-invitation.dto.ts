import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsUUID } from 'class-validator';

export class CreerInvitationDto {
  @ApiProperty({ example: 'john.doe@istama.cm' })
  @IsEmail()
  email: string;

  @ApiProperty({ format: 'uuid', description: 'Rôle qui sera attribué au collaborateur' })
  @IsUUID()
  role_id: string;

  @ApiProperty({ format: 'uuid', description: "Université d'appartenance" })
  @IsUUID()
  universite_id: string;
}
