import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'Responsable diplômes', maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nom: string;

  @ApiPropertyOptional({ example: 'Peut saisir et valider les diplômes de son université.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Université propriétaire du rôle. Null = rôle global (super_admin uniquement).',
    example: 'uuid-de-l-universite',
  })
  @IsOptional()
  @IsUUID('4', { message: 'universite_id doit être un UUID valide' })
  universite_id?: string;
}
