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

export class UtilisateurResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Doe' })
  nom: string;

  @ApiProperty({ example: 'John' })
  prenom: string;

  @ApiProperty({ example: 'john.doe@inubil.com' })
  email: string;

  @ApiProperty()
  email_verifie: boolean;

  @ApiProperty({ example: 'actif', enum: ['actif', 'inactif', 'suspendu', 'en_attente_email'] })
  statut: string;

  @ApiProperty({ nullable: true })
  avatar_url: string | null;

  @ApiProperty({ example: 'fr' })
  langue: string;

  @ApiProperty({ nullable: true })
  derniere_connexion: Date | null;

  @ApiProperty({ type: RoleBriefDto, nullable: true })
  role: RoleBriefDto | null;

  @ApiProperty({ type: UniversiteBriefDto, nullable: true })
  universite: UniversiteBriefDto | null;

  @ApiProperty()
  created_at: Date;
}

export class UtilisateurListResponseDto {
  @ApiProperty({ type: [UtilisateurResponseDto] })
  data: UtilisateurResponseDto[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}
