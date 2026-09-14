import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class PreferencesNotificationsDto {
  @ApiPropertyOptional({
    default: true,
    description: "Alerte email quand un document que j'ai saisi est validé.",
  })
  documents_valides?: boolean;

  @ApiPropertyOptional({
    default: true,
    description: "Alerte email quand un document que j'ai saisi est rejeté.",
  })
  documents_rejetes?: boolean;

  @ApiPropertyOptional({
    default: true,
    description:
      'Alerte email en cas de connexion inhabituelle (non appliqué — aucune détection en place).',
  })
  connexion_inhabituelle?: boolean;
}

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

  @ApiProperty({ example: 'ISTAMA', nullable: true })
  nom_court: string | null;

  @ApiProperty({ nullable: true, description: "URL du logo de l'etablissement." })
  logo_url: string | null;
}

class DepartementBriefDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Génie Informatique' })
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

  @ApiProperty({
    type: [DepartementBriefDto],
    description:
      "Departements d'affectation (chef de departement, scope). Liste vide = aucune restriction (scolarite / autre role).",
  })
  departements: DepartementBriefDto[];

  @ApiProperty({ description: 'Date de creation du compte.' })
  created_at: Date;

  @ApiProperty({
    type: PreferencesNotificationsDto,
    description:
      'Préférences de notification email — clés absentes = activé par défaut.',
  })
  preferences: PreferencesNotificationsDto;
}
