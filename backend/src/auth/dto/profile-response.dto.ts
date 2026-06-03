import { ApiProperty } from '@nestjs/swagger';

class RoleBriefDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'super_admin' })
  nom: string;
}

class UniversiteBriefDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'ISTAMA' })
  nom: string;
}

/** Profil complet de l'utilisateur connecte (`GET /auth/me`). */
export class ProfileResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Doe' })
  nom: string;

  @ApiProperty({ example: 'John' })
  prenom: string;

  @ApiProperty({ example: 'john.doe@inubil.com' })
  email: string;

  @ApiProperty({ description: "L'email a-t-il ete verifie ?" })
  email_verifie: boolean;

  @ApiProperty({ nullable: true, description: "URL de l'avatar." })
  avatar_url: string | null;

  @ApiProperty({ example: 'fr', description: "Langue d'interface." })
  langue: string;

  @ApiProperty({ type: RoleBriefDto, nullable: true })
  role: RoleBriefDto | null;

  @ApiProperty({ type: UniversiteBriefDto, nullable: true })
  universite: UniversiteBriefDto | null;

  @ApiProperty({ description: 'Date de creation du compte.' })
  created_at: Date;
}
